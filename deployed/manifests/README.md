# deployed/manifests

Reserved for **deployment manifests** for the real Docker runtime — for
example:

- Container compose definitions
- Resource-limit manifests (CPU / memory overrides beyond the server defaults)
- Network policies for per-tenant isolation

Currently empty. The mock runtime (the current sandbox runtime) does not
require manifests; resource limits are read directly from server
configuration (`DEPLOY_CPU_LIMIT`, `DEPLOY_MEMORY_LIMIT_MB`, etc.) and
applied via the `DockerAdapter` interface.

See [docs/deployment.md](../../docs/deployment.md) for the migration plan.
