# deployed/docker

Reserved for **per-app Dockerfiles** and Docker-related build assets used
when migrating to the real Docker runtime.

Currently empty. The mock runtime (the current sandbox runtime) does not
require Dockerfiles — it simulates container lifecycle in-process via the
`MockDockerAdapter`.

The production hook point is the `DockerEngineAdapter` in
[`backend/docker/adapter.ts`](../../backend/docker/adapter.ts). When that
adapter is implemented against a real Docker daemon, per-app Dockerfiles
(or pre-built image references) will live here.

See [docs/deployment.md](../../docs/deployment.md) for the migration plan.
