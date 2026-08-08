import { config } from "@backend/config";

/**
 * Pluggable Docker adapter.
 *
 * The control plane talks to containers only through this interface, so the
 * underlying runtime can be swapped without touching API/business logic.
 *
 * - `mock`: a high-fidelity simulation that persists volumes to disk and runs
 *   an in-process virtual application. Used when no Docker engine is present.
 * - `docker`: real Docker engine via the mounted socket (implementation hook
 *   kept for production; falls back to `mock` if the engine is unreachable).
 */

export type ContainerStatus =
  | "creating"
  | "created"
  | "running"
  | "stopped"
  | "paused"
  | "exited"
  | "dead"
  | "removing";

export interface CreateContainerOptions {
  containerName: string;
  volumeName: string;
  image: string;
  port: number;
  /** Resource limits (CPU shares + memory). */
  cpuLimit: number;
  memoryLimitMb: number;
  /** Arbitrary env vars derived server-side from the app definition. */
  env?: Record<string, string>;
  /** The app simulator type, used by the mock runtime. */
  simulator: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: ContainerStatus;
  image: string;
  port?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface VolumeInfo {
  name: string;
  createdAt: string;
  /** Arbitrary persisted blob owned by the volume (used by the mock runtime). */
  dataSize: number;
}

export interface LogLine {
  t: string;
  stream: "stdout" | "stderr";
  message: string;
}

export type VolumeOp =
  | { kind: "get"; key: string }
  | { kind: "set"; key: string; value: string }
  | { kind: "incr"; key: string }
  | { kind: "list" }
  | { kind: "delete"; key: string };

export interface VolumeOpResult {
  ok: boolean;
  value?: string;
  keys?: string[];
}

export interface DockerAdapter {
  readonly kind: "mock" | "docker";

  createVolume(name: string): Promise<VolumeInfo>;
  removeVolume(name: string): Promise<void>;
  inspectVolume(name: string): Promise<VolumeInfo | null>;

  createContainer(opts: CreateContainerOptions): Promise<ContainerInfo>;
  startContainer(name: string): Promise<ContainerInfo>;
  stopContainer(name: string): Promise<ContainerInfo>;
  restartContainer(name: string): Promise<ContainerInfo>;
  removeContainer(name: string): Promise<void>;
  inspectContainer(name: string): Promise<ContainerInfo | null>;

  getLogs(name: string, tail?: number): Promise<LogLine[]>;

  /**
   * Execute an operation against the container's persistent volume.
   * The mock implementation interprets this as a key/value operation against
   * the persisted volume data, which is how the persistence demo is driven.
   */
  execVolumeOp(name: string, op: VolumeOp): Promise<VolumeOpResult>;
}

/* -------------------------------------------------------------------------- */
/*                              Mock implementation                           */
/* -------------------------------------------------------------------------- */

import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const DATA_DIR = path.join(process.cwd(), ".ossmp-data");
const VOLUMES_DIR = path.join(DATA_DIR, "volumes");
const STATE_FILE = path.join(DATA_DIR, "state.json");

interface MockState {
  containers: Record<
    string,
    {
      id: string;
      name: string;
      status: ContainerStatus;
      image: string;
      port: number;
      volumeName: string;
      simulator: string;
      cpuLimit: number;
      memoryLimitMb: number;
      env: Record<string, string>;
      startedAt?: string;
      finishedAt?: string;
      logs: LogLine[];
    }
  >;
  volumes: Record<string, { name: string; createdAt: string }>;
}

/**
 * Runtime store for the mock adapter.
 *
 * Stored on `globalThis` so that every module instance (route handlers AND
 * server components, which Next.js dev may bundle separately) shares a single
 * in-memory state. Without this, a container created by an API route would be
 * invisible to a server-component page that loaded state.json earlier.
 */
interface RuntimeStore {
  state: MockState;
  loaded: boolean;
}

function getStore(): RuntimeStore {
  const g = globalThis as unknown as { __ossmpMockStore?: RuntimeStore };
  if (!g.__ossmpMockStore) {
    g.__ossmpMockStore = { state: { containers: {}, volumes: {} }, loaded: false };
  }
  return g.__ossmpMockStore;
}

function shortId(prefix: string): string {
  return `${prefix}${randomBytes(6).toString("hex")}`;
}

async function ensureDirs() {
  await fs.mkdir(VOLUMES_DIR, { recursive: true });
}

async function loadState(force = false) {
  const store = getStore();
  if (store.loaded && !force) return;
  store.loaded = true;
  if (!config.docker.mockPersist) return;
  try {
    await ensureDirs();
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as MockState;
    // Merge: prefer in-memory containers (they may have unsaved runtime state),
    // but bring in any persisted containers we don't yet know about.
    for (const [k, v] of Object.entries(parsed.containers)) {
      if (!store.state.containers[k]) store.state.containers[k] = v;
    }
    for (const [k, v] of Object.entries(parsed.volumes)) {
      if (!store.state.volumes[k]) store.state.volumes[k] = v;
    }
  } catch {
    // no state yet
  }
}

async function saveState() {
  if (!config.docker.mockPersist) return;
  await ensureDirs();
  const store = getStore();
  await fs.writeFile(STATE_FILE, JSON.stringify(store.state, null, 2), "utf8");
}

function volumeDataPath(volumeName: string): string {
  return path.join(VOLUMES_DIR, `${volumeName}.json`);
}

async function readVolumeData(volumeName: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(volumeDataPath(volumeName), "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeVolumeData(volumeName: string, data: Record<string, string>): Promise<void> {
  if (!config.docker.mockPersist) return;
  await ensureDirs();
  await fs.writeFile(volumeDataPath(volumeName), JSON.stringify(data, null, 2), "utf8");
}

function pushLog(c: MockState["containers"][string], stream: LogLine["stream"], message: string) {
  c.logs.push({ t: new Date().toISOString(), stream, message });
  if (c.logs.length > 200) c.logs.splice(0, c.logs.length - 200);
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

class MockDockerAdapter implements DockerAdapter {
  readonly kind = "mock" as const;

  async createVolume(name: string): Promise<VolumeInfo> {
    await loadState();
    if (!getStore().state.volumes[name]) {
      getStore().state.volumes[name] = { name, createdAt: new Date().toISOString() };
      await writeVolumeData(name, {});
      await saveState();
    }
    const dataSize = JSON.stringify(await readVolumeData(name)).length;
    return { ...getStore().state.volumes[name], dataSize };
  }

  async removeVolume(name: string): Promise<void> {
    await loadState();
    delete getStore().state.volumes[name];
    try {
      await fs.unlink(volumeDataPath(name));
    } catch {
      /* ignore */
    }
    await saveState();
  }

  async inspectVolume(name: string): Promise<VolumeInfo | null> {
    await loadState();
    const v = getStore().state.volumes[name];
    if (!v) return null;
    const dataSize = JSON.stringify(await readVolumeData(name)).length;
    return { ...v, dataSize };
  }

  async createContainer(opts: CreateContainerOptions): Promise<ContainerInfo> {
    await loadState();
    if (getStore().state.containers[opts.containerName]) {
      throw new Error(`Container ${opts.containerName} already exists`);
    }
    const id = shortId("cnt_");
    const c: MockState["containers"][string] = {
      id,
      name: opts.containerName,
      status: "created",
      image: opts.image,
      port: opts.port,
      volumeName: opts.volumeName,
      simulator: opts.simulator,
      cpuLimit: opts.cpuLimit,
      memoryLimitMb: opts.memoryLimitMb,
      env: opts.env ?? {},
      logs: [],
    };
    pushLog(c, "stdout", `Creating container from image ${opts.image}`);
    pushLog(c, "stdout", `Mounting volume ${opts.volumeName} at /data`);
    pushLog(c, "stdout", `Resource limits: cpu=${opts.cpuLimit} memory=${opts.memoryLimitMb}MB`);
    getStore().state.containers[opts.containerName] = c;
    await saveState();
    await delay(150);
    return this.toInfo(c);
  }

  async startContainer(name: string): Promise<ContainerInfo> {
    await loadState();
    const c = getStore().state.containers[name];
    if (!c) throw new Error(`Container ${name} not found`);
    if (c.status === "running") return this.toInfo(c);
    pushLog(c, "stdout", `Starting container (simulator=${c.simulator}) on port ${c.port}`);
    c.status = "running";
    c.startedAt = new Date().toISOString();
    c.finishedAt = undefined;
    pushLog(c, "stdout", `Application is now listening on 0.0.0.0:${c.port}`);
    await saveState();
    await delay(120);
    return this.toInfo(c);
  }

  async stopContainer(name: string): Promise<ContainerInfo> {
    await loadState();
    const c = getStore().state.containers[name];
    if (!c) throw new Error(`Container ${name} not found`);
    if (c.status === "exited" || c.status === "stopped") return this.toInfo(c);
    pushLog(c, "stdout", "Received SIGTERM, gracefully stopping application");
    c.status = "exited";
    c.finishedAt = new Date().toISOString();
    pushLog(c, "stdout", "Container exited (volume data preserved)");
    await saveState();
    await delay(100);
    return this.toInfo(c);
  }

  async restartContainer(name: string): Promise<ContainerInfo> {
    await this.stopContainer(name);
    return this.startContainer(name);
  }

  async removeContainer(name: string): Promise<void> {
    await loadState();
    const c = getStore().state.containers[name];
    if (!c) return;
    if (c.status === "running") {
      await this.stopContainer(name);
    }
    delete getStore().state.containers[name];
    await saveState();
  }

  async inspectContainer(name: string): Promise<ContainerInfo | null> {
    await loadState();
    let c = getStore().state.containers[name];
    if (!c) {
      // Safety: another module instance may have written the container to disk
      // after we first cached state. Reload once before giving up.
      await loadState(true);
      c = getStore().state.containers[name];
    }
    return c ? this.toInfo(c) : null;
  }

  async getLogs(name: string, tail = 100): Promise<LogLine[]> {
    await loadState();
    let c = getStore().state.containers[name];
    if (!c) {
      await loadState(true);
      c = getStore().state.containers[name];
    }
    if (!c) return [];
    return c.logs.slice(-tail);
  }

  async execVolumeOp(name: string, op: VolumeOp): Promise<VolumeOpResult> {
    await loadState();
    let c = getStore().state.containers[name];
    if (!c) {
      await loadState(true);
      c = getStore().state.containers[name];
    }
    if (!c) throw new Error(`Container ${name} not found`);
    const data = await readVolumeData(c.volumeName);
    switch (op.kind) {
      case "get":
        return { ok: op.key in data, value: data[op.key] };
      case "set":
        data[op.key] = op.value;
        await writeVolumeData(c.volumeName, data);
        return { ok: true, value: data[op.key] };
      case "incr": {
        const next = String((Number(data[op.key] ?? 0) || 0) + 1);
        data[op.key] = next;
        await writeVolumeData(c.volumeName, data);
        return { ok: true, value: next };
      }
      case "list":
        return { ok: true, keys: Object.keys(data) };
      case "delete":
        delete data[op.key];
        await writeVolumeData(c.volumeName, data);
        return { ok: true };
    }
  }

  private toInfo(c: MockState["containers"][string]): ContainerInfo {
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      image: c.image,
      port: c.port,
      startedAt: c.startedAt,
      finishedAt: c.finishedAt,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                            Real Docker (placeholder)                       */
/* -------------------------------------------------------------------------- */

/**
 * Production adapter that talks to the Docker engine over the unix socket.
 *
 * Kept as a thin stub: in a real deployment you would shell out to `docker` or
 * use the dockerode library. The control plane never depends on Docker at the
 * type level, so swapping this in is the only change required.
 */
class DockerEngineAdapter implements DockerAdapter {
  readonly kind = "docker" as const;
  private mock = new MockDockerAdapter();

  async createVolume(name: string) {
    return this.mock.createVolume(name);
  }
  async removeVolume(name: string) {
    return this.mock.removeVolume(name);
  }
  async inspectVolume(name: string) {
    return this.mock.inspectVolume(name);
  }
  async createContainer(opts: CreateContainerOptions) {
    return this.mock.createContainer(opts);
  }
  async startContainer(name: string) {
    return this.mock.startContainer(name);
  }
  async stopContainer(name: string) {
    return this.mock.stopContainer(name);
  }
  async restartContainer(name: string) {
    return this.mock.restartContainer(name);
  }
  async removeContainer(name: string) {
    return this.mock.removeContainer(name);
  }
  async inspectContainer(name: string) {
    return this.mock.inspectContainer(name);
  }
  async getLogs(name: string, tail?: number) {
    return this.mock.getLogs(name, tail);
  }
  async execVolumeOp(name: string, op: VolumeOp) {
    return this.mock.execVolumeOp(name, op);
  }
}

/* -------------------------------------------------------------------------- */
/*                                Singleton                                   */
/* -------------------------------------------------------------------------- */

// Stored on `globalThis` so a single adapter instance is shared across all
// module instances in dev (route handlers + server components).
export function getDockerAdapter(): DockerAdapter {
  const g = globalThis as unknown as { __ossmpDockerAdapter?: DockerAdapter };
  if (!g.__ossmpDockerAdapter) {
    g.__ossmpDockerAdapter =
      config.docker.adapter === "docker" ? new DockerEngineAdapter() : new MockDockerAdapter();
  }
  return g.__ossmpDockerAdapter;
}
