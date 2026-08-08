import { getSessionUser } from "@/lib/auth";
import { json, errorResponse, withErrors } from "@/lib/api";
import { execVolumeOp } from "@/lib/deployments";
import type { VolumeOp } from "@/lib/docker/adapter";

/**
 * Persistent-volume operations for a deployment.
 *
 * This is the "data plane" used by the simulated deployed application. In a
 * real deployment the running container would write to its mounted volume
 * directly; here the control plane mediates so the same volume survives
 * container stop/start/restart and is fully isolated per tenant.
 *
 * Supported operations:
 *   GET    ?op=list                  -> list keys
 *   GET    ?op=get&key=NAME          -> read a key
 *   POST   { op: "set", key, value } -> write a key
 *   POST   { op: "incr", key }       -> atomic increment (counter demo)
 *   POST   { op: "delete", key }     -> remove a key
 */
export const GET = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const url = new URL(req.url);
  const op = url.searchParams.get("op") ?? "list";
  const key = url.searchParams.get("key") ?? "";

  let volumeOp: VolumeOp;
  if (op === "get") {
    if (!key) return errorResponse("key is required for op=get", 422, "MISSING_KEY");
    volumeOp = { kind: "get", key };
  } else {
    volumeOp = { kind: "list" };
  }

  const result = await execVolumeOp(id, user.id, volumeOp);
  return json({ result });
});

export const POST = withErrors(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const op = String(body?.op ?? "");
  const key = String(body?.key ?? "");
  const value = body?.value !== undefined ? String(body.value) : "";

  let volumeOp: VolumeOp;
  if (op === "set") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "set", key, value };
  } else if (op === "incr") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "incr", key };
  } else if (op === "delete") {
    if (!key) return errorResponse("key is required", 422, "MISSING_KEY");
    volumeOp = { kind: "delete", key };
  } else {
    return errorResponse("Unsupported op. Use set | incr | delete", 422, "BAD_OP");
  }

  const result = await execVolumeOp(id, user.id, volumeOp);
  return json({ result });
});
