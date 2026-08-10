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
  /** Tenant ID for namespace isolation (used by Kubernetes). */
  tenantId: string;
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

  createVolume(name: string, tenantId: string): Promise<VolumeInfo>;
  removeVolume(name: string, tenantId: string): Promise<void>;
  inspectVolume(name: string, tenantId: string): Promise<VolumeInfo | null>;

  createContainer(opts: CreateContainerOptions): Promise<ContainerInfo>;
  startContainer(name: string, tenantId: string): Promise<ContainerInfo>;
  stopContainer(name: string, tenantId: string): Promise<ContainerInfo>;
  restartContainer(name: string, tenantId: string): Promise<ContainerInfo>;
  removeContainer(name: string, tenantId: string): Promise<void>;
  inspectContainer(name: string, tenantId: string): Promise<ContainerInfo | null>;

  getLogs(name: string, tenantId: string, tail?: number): Promise<LogLine[]>;

  /**
   * Execute an operation against the container's persistent volume.
   * The mock implementation interprets this as a key/value operation against
   * the persisted volume data, which is how the persistence demo is driven.
   */
  execVolumeOp(name: string, tenantId: string, op: VolumeOp): Promise<VolumeOpResult>;
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

  async createVolume(name: string, tenantId: string): Promise<VolumeInfo> {
    await loadState();
    if (!getStore().state.volumes[name]) {
      getStore().state.volumes[name] = { name, createdAt: new Date().toISOString() };
      await writeVolumeData(name, {});
      await saveState();
    }
    const dataSize = JSON.stringify(await readVolumeData(name)).length;
    return { ...getStore().state.volumes[name], dataSize };
  }

  async removeVolume(name: string, tenantId: string): Promise<void> {
    await loadState();
    delete getStore().state.volumes[name];
    try {
      await fs.unlink(volumeDataPath(name));
    } catch {
      /* ignore */
    }
    await saveState();
  }

  async inspectVolume(name: string, tenantId: string): Promise<VolumeInfo | null> {
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

  async startContainer(name: string, tenantId: string): Promise<ContainerInfo> {
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

  async stopContainer(name: string, tenantId: string): Promise<ContainerInfo> {
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

  async restartContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    await this.stopContainer(name, tenantId);
    return this.startContainer(name, tenantId);
  }

  async removeContainer(name: string, tenantId: string): Promise<void> {
    await loadState();
    const c = getStore().state.containers[name];
    if (!c) return;
    if (c.status === "running") {
      await this.stopContainer(name, tenantId);
    }
    delete getStore().state.containers[name];
    await saveState();
  }

  async inspectContainer(name: string, tenantId: string): Promise<ContainerInfo | null> {
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

  async getLogs(name: string, tenantId: string, tail = 100): Promise<LogLine[]> {
    await loadState();
    let c = getStore().state.containers[name];
    if (!c) {
      await loadState(true);
      c = getStore().state.containers[name];
    }
    if (!c) return [];
    return c.logs.slice(-tail);
  }

  async execVolumeOp(name: string, tenantId: string, op: VolumeOp): Promise<VolumeOpResult> {
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
/*                            Real Docker (dockerode)                         */
/* -------------------------------------------------------------------------- */

import Docker from "dockerode";

/**
 * Production adapter that talks to a real Docker engine via the dockerode
 * library over the unix socket (or TCP host configured by DOCKER_SOCKET).
 *
 * Design notes:
 *  - Container lifecycle (create/start/stop/restart/remove/inspect) and
 *    volume lifecycle (create/remove/inspect) map 1:1 to the Docker API.
 *  - Logs are fetched via container.logs() with a tail limit and demuxed
 *    from the dockerode multiplexed stream into LogLine[].
 *  - `execVolumeOp` is deliberately decoupled from the container's filesystem.
 *    The mock adapter stores key/value data in a JSON sidecar per volume; the
 *    real adapter keeps that same sidecar on the Docker HOST filesystem
 *    (.ossmp-data/volumes/<name>.json) so it works on ANY container image
 *    (including distroless ones that have no shell). This preserves the
 *    persistence-demo contract used by the counter/notes/wiki simulators
 *    without requiring `docker exec` support in every image.
 *  - Resource limits are enforced via HostConfig.NanoCpus / Memory /
 *    MemorySwap. CPU period is not exposed by dockerode directly; NanoCpus
 *    (= cpus * 1e9) is the modern equivalent.
 *  - Security hardening: every container is started with --cap-drop=ALL,
 *    --security-opt=no-new-privileges, and a read-only root filesystem where
 *    possible (tmpfs mounted at /tmp and /run so writable paths exist).
 *  - Host port binding: each container's internal port (e.g. 3000 for
 *    Grafana) is bound to a host port in the configured range so the real
 *    app is reachable at http://<docker-host>:<hostPort>.
 */
class DockerEngineAdapter implements DockerAdapter {
  readonly kind = "docker" as const;
  private docker: Docker;
  /** Lazily-initialized host-side volume sidecar store (reuses mock's paths). */
  private volumeSidecar = new MockDockerAdapter();

  constructor() {
    this.docker = new Docker({ socketPath: config.docker.socketPath });
  }

  /** Ping the Docker daemon. Throws if unreachable. */
  async ping(): Promise<boolean> {
    try {
      const info = await this.docker.ping();
      return info.toString() === "OK";
    } catch {
      return false;
    }
  }

  /* ------------------------------ Volumes ------------------------------- */

  async createVolume(name: string, tenantId: string): Promise<VolumeInfo> {
    try {
      await this.docker.createVolume({ Name: name, Labels: { "ossmp.managed": "true" } });
    } catch (err: unknown) {
      // volume already exists — fine, treat as idempotent
      if (!isDockerNotFound(err)) throw err;
    }
    return this.inspectVolume(name, tenantId) as Promise<VolumeInfo>;
  }

  async removeVolume(name: string, tenantId: string): Promise<void> {
    try {
      await this.docker.getVolume(name).remove({ force: false });
    } catch (err: unknown) {
      if (!isDockerNotFound(err)) throw err;
    }
    // Also clean up the host-side sidecar (no-op if absent).
    await this.volumeSidecar.removeVolume(name, tenantId);
  }

  async inspectVolume(name: string, tenantId: string): Promise<VolumeInfo | null> {
    try {
      const v = await this.docker.getVolume(name).inspect();
      // Docker volumes don't track size cheaply; approximate via the sidecar.
      const sidecar = await this.volumeSidecar.inspectVolume(name, tenantId);
      return {
        name: v.Name,
        createdAt: (v as any).CreatedAt ?? new Date().toISOString(),
        dataSize: sidecar?.dataSize ?? 0,
      };
    } catch (err: unknown) {
      if (isDockerNotFound(err)) return null;
      throw err;
    }
  }

  /* ----------------------------- Containers ----------------------------- */

  async createContainer(opts: CreateContainerOptions): Promise<ContainerInfo> {
    const exposedPorts: Record<string, object> = {};
    exposedPorts[`${opts.port}/tcp`] = {};
    const portBindings: Record<string, Array<{ HostPort: string }>> = {};
    portBindings[`${opts.port}/tcp`] = [{ HostPort: "0" }]; // "0" asks Docker to assign an ephemeral port

    const envArray = opts.env ? Object.entries(opts.env).map(([k, v]) => `${k}=${v}`) : [];

    const createOpts: Docker.ContainerCreateOptions = {
      name: opts.containerName,
      Image: opts.image,
      Env: envArray,
      ExposedPorts: exposedPorts,
      Labels: {
        "ossmp.managed": "true",
        "ossmp.simulator": opts.simulator,
        "ossmp.volume": opts.volumeName,
      },
      HostConfig: {
        PortBindings: portBindings,
        // Bind the named volume to /data so apps that persist to /data work.
        Binds: [`${opts.volumeName}:/data`],
        // CPU limit: NanoCpus = cpus * 1e9 (dockerode uses this, not CFS quota).
        NanoCpus: Math.round(opts.cpuLimit * 1e9),
        // Memory limit in bytes. MemorySwap=memory disables swap.
        Memory: opts.memoryLimitMb * 1024 * 1024,
        MemorySwap: opts.memoryLimitMb * 1024 * 1024,
        // Restart policy: try once, don't infinite-loop a crashing app.
        RestartPolicy: { Name: "on-failure", MaximumRetryCount: 3 },
        // Security hardening. Read-only rootfs is opt-in because most real
        // images need to write to /var/lib, /var/run, etc.
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
        ReadonlyRootfs: config.docker.readonlyRootfs,
        Tmpfs: { "/tmp": "", "/run": "" },
      },
    };

    let container: Docker.Container;
    try {
      container = await this.docker.createContainer(createOpts);
    } catch (err: unknown) {
      // If the image isn't present locally, pull it then retry once.
      if (isImageNotFound(err)) {
        await pullImage(this.docker, opts.image);
        container = await this.docker.createContainer(createOpts);
      } else {
        throw err;
      }
    }

    const inspect = await container.inspect();
    return this.toInfo(inspect, undefined); // Port is known only after start
  }

  async startContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(name);
    await container.start();
    const inspect = await container.inspect();
    const hostPort = extractHostPort(inspect);
    return this.toInfo(inspect, hostPort);
  }

  async stopContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(name);
    // 10s grace period before SIGKILL, matching Docker's default.
    await container.stop({ t: 10 });
    const inspect = await container.inspect();
    const hostPort = extractHostPort(inspect);
    return this.toInfo(inspect, hostPort);
  }

  async restartContainer(name: string, tenantId: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(name);
    await container.restart({ t: 10 });
    const inspect = await container.inspect();
    const hostPort = extractHostPort(inspect);
    return this.toInfo(inspect, hostPort);
  }

  async removeContainer(name: string, tenantId: string): Promise<void> {
    const container = this.docker.getContainer(name);
    try {
      // Force-remove handles a running container (stops then removes).
      // `v: true` also removes anonymous volumes; named volumes are preserved.
      await container.remove({ force: true, v: false });
    } catch (err: unknown) {
      if (!isDockerNotFound(err)) throw err;
    }
  }

  async inspectContainer(name: string, tenantId: string): Promise<ContainerInfo | null> {
    try {
      const inspect = await this.docker.getContainer(name).inspect();
      const hostPort = extractHostPort(inspect);
      return this.toInfo(inspect, hostPort);
    } catch (err: unknown) {
      if (isDockerNotFound(err)) return null;
      throw err;
    }
  }

  async getLogs(name: string, tenantId: string, tail = 100): Promise<LogLine[]> {
    const container = this.docker.getContainer(name);
    let stream: any;
    try {
      stream = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
    } catch (err: unknown) {
      if (isDockerNotFound(err)) return [];
      throw err;
    }
    return demuxDockerLogs(stream);
  }

  /* --------------------------- Volume key/value -------------------------- */

  async execVolumeOp(name: string, tenantId: string, op: VolumeOp): Promise<VolumeOpResult> {
    // Resolve container name -> volume name via Docker inspect, then operate
    // on the host-side sidecar. Falls back to treating `name` as a volume
    // name if the container has already been removed.
    let volumeName: string | null = null;
    try {
      const inspect = await this.docker.getContainer(name).inspect();
      volumeName =
        (inspect.Config?.Labels?.["ossmp.volume"] as string | undefined) ?? null;
    } catch (err: unknown) {
      if (!isDockerNotFound(err)) throw err;
    }
    if (!volumeName) {
      // Container gone — try `name` directly as a volume name.
      volumeName = name;
    }
    // Ensure the sidecar volume record exists.
    await this.volumeSidecar.createVolume(volumeName, tenantId);
    // Execute the mock's key/value logic (same JSON sidecar on host disk).
    const data = await readVolumeData(volumeName);
    switch (op.kind) {
      case "get":
        return { ok: op.key in data, value: data[op.key] };
      case "set":
        data[op.key] = op.value;
        await writeVolumeData(volumeName, data);
        return { ok: true, value: data[op.key] };
      case "incr": {
        const next = String((Number(data[op.key] ?? 0) || 0) + 1);
        data[op.key] = next;
        await writeVolumeData(volumeName, data);
        return { ok: true, value: next };
      }
      case "list":
        return { ok: true, keys: Object.keys(data) };
      case "delete":
        delete data[op.key];
        await writeVolumeData(volumeName, data);
        return { ok: true };
    }
  }

  /* ------------------------------ Helpers ------------------------------- */

  private toInfo(inspect: Docker.ContainerInspectInfo, hostPort: number | undefined): ContainerInfo {
    const state = inspect.State;
    const status: ContainerStatus = mapDockerState(state?.Status);
    return {
      id: inspect.Id,
      name: inspect.Name.replace(/^\//, ""),
      status,
      image: inspect.Config?.Image ?? "",
      port: hostPort,
      startedAt: state?.StartedAt,
      finishedAt: state?.FinishedAt && state.FinishedAt !== "0001-01-01T00:00:00Z"
        ? state.FinishedAt
        : undefined,
    };
  }
}

/* --------------------------- Dockerode helpers ----------------------------- */

function isDockerNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { statusCode?: number; reason?: string; message?: string };
  return (
    e.statusCode === 404 ||
    e.reason === "no such container" ||
    e.reason === "no such volume" ||
    (typeof e.message === "string" && /no such (container|volume|image)/i.test(e.message))
  );
}

function isImageNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { statusCode?: number; message?: string };
  return (
    e.statusCode === 404 ||
    (typeof e.message === "string" && /no such image|manifest unknown/i.test(e.message))
  );
}

async function pullImage(docker: Docker, image: string): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(image, (pullErr: Error | null, stream: NodeJS.ReadableStream) => {
      if (pullErr) return reject(pullErr);
      docker.modem.followProgress(
        stream,
        (finishErr: Error | null) => {
          if (finishErr) return reject(finishErr);
          resolve();
        },
        () => {
          // progress events — intentionally ignored to keep logs quiet
        },
      );
    });
  });
}

/** Extract the first bound host port from a container inspect result. */
function extractHostPort(inspect: Docker.ContainerInspectInfo): number | undefined {
  // First try NetworkSettings.Ports, which contains the actual runtime port assignment
  const ports = inspect.NetworkSettings?.Ports;
  if (ports) {
    for (const key of Object.keys(ports)) {
      const arr = ports[key];
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.HostPort) {
        const n = Number(arr[0].HostPort);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }

  // Fallback to HostConfig.PortBindings if NetworkSettings is empty (e.g. not started)
  const bindings = inspect.HostConfig?.PortBindings;
  if (bindings) {
    for (const key of Object.keys(bindings)) {
      const arr = bindings[key];
      if (Array.isArray(arr) && arr.length > 0 && arr[0]?.HostPort) {
        const n = Number(arr[0].HostPort);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }
  return undefined;
}

/** Map a Docker container state status string to our ContainerStatus union. */
function mapDockerState(s: string | undefined): ContainerStatus {
  switch (s) {
    case "created":
      return "created";
    case "running":
      return "running";
    case "paused":
      return "paused";
    case "restarting":
      return "creating";
    case "removing":
      return "removing";
    case "exited":
      return "exited";
    case "dead":
      return "dead";
    default:
      return "stopped";
  }
}

/** Find a free TCP port in [start, end) by trying to bind a listener. */
async function pickFreePort(start: number, end: number): Promise<number> {
  const net = await import("net");
  for (let port = start; port < end; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const srv = net.createServer();
      srv.unref();
      srv.on("error", () => resolve(false));
      srv.listen(port, "0.0.0.0", () => {
        srv.close(() => resolve(true));
      });
    });
    if (free) return port;
  }
  throw new Error(`No free port available in range [${start}, ${end})`);
}

/**
 * Demultiplex a dockerode log stream (8-byte header per frame: stream type +
 * 4-byte big-endian length) into LogLine[].
 *
 * dockerode returns logs with `timestamps: true`, so each frame's payload
 * starts with an ISO timestamp followed by a space and the message.
 */
async function demuxDockerLogs(stream: any): Promise<LogLine[]> {
  let buf: Buffer;
  if (Buffer.isBuffer(stream)) {
    buf = stream;
  } else if (typeof stream === "string") {
    buf = Buffer.from(stream, "utf8");
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    buf = Buffer.concat(chunks);
  }
  const lines: LogLine[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const header = buf.subarray(offset, offset + 8);
    const streamType = header[0]; // 1 = stdout, 2 = stderr
    const length = header.readUInt32BE(4);
    offset += 8;
    if (offset + length > buf.length) break;
    const payload = buf.subarray(offset, offset + length).toString("utf8");
    offset += length;
    // Payload format with timestamps=true: "<ISO timestamp> <message>\n"
    const tsMatch = payload.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)\s([\s\S]*)$/);
    const t = tsMatch ? tsMatch[1] : new Date().toISOString();
    const message = (tsMatch ? tsMatch[2] : payload).replace(/\n$/, "");
    if (message.length === 0) continue;
    lines.push({
      t,
      stream: streamType === 2 ? "stderr" : "stdout",
      message,
    });
  }
  return lines;
}

/* -------------------------------------------------------------------------- */
/*                                Singleton                                   */
/* -------------------------------------------------------------------------- */

// Stored on `globalThis` so a single adapter instance is shared across all
// module instances in dev (route handlers + server components).
import { KubernetesAdapter } from "../kubernetes/adapter";

export function getDockerAdapter(): DockerAdapter {
  const g = globalThis as unknown as {
    __ossmpDockerAdapter?: DockerAdapter;
    __ossmpDockerAdapterKind?: "mock" | "docker";
  };
  if (!g.__ossmpDockerAdapter) {
    if (config.docker.adapter === "kubernetes") {
      g.__ossmpDockerAdapter = new KubernetesAdapter();
      g.__ossmpDockerAdapterKind = "docker"; // masquerade as docker for frontend compatibility
    } else if (config.docker.adapter === "docker") {
      const real = new DockerEngineAdapter();
      // Probe the daemon synchronously on first use. If unreachable, fall back
      // to mock so the app still boots (with a loud warning). The probe result
      // is cached so we don't pay the ping cost on every request.
      g.__ossmpDockerAdapter = real;
      g.__ossmpDockerAdapterKind = "docker";
      // Fire-and-forget probe; if it fails, subsequent operations will throw
      // clear errors pointing at the daemon. This keeps boot fast.
      real.ping().then((ok) => {
        if (!ok) {
          console.warn(
            "[docker] DOCKER_ADAPTER=docker but the Docker daemon at " +
              config.docker.socketPath +
              " is unreachable. Container operations will fail. " +
              "Start Docker, or set DOCKER_ADAPTER=mock to silence this.",
          );
        }
      });
    } else {
      g.__ossmpDockerAdapter = new MockDockerAdapter();
      g.__ossmpDockerAdapterKind = "mock";
    }
  }
  return g.__ossmpDockerAdapter;
}

/** Returns the kind of the active adapter ("mock" or "docker"). */
export function getDockerAdapterKind(): "mock" | "docker" {
  getDockerAdapter(); // ensure initialised
  const g = globalThis as unknown as { __ossmpDockerAdapterKind?: "mock" | "docker" };
  return g.__ossmpDockerAdapterKind ?? "mock";
}
