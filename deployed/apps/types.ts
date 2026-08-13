export interface AppDefinition {
  name: string;
  slug: string;
  description: string;
  dockerImage: string;
  containerPort: number;
  logo: string | null;
  category: string;
  simulator: string;
  version?: string | null;
  repository?: string | null;
  website?: string | null;
  readme?: string | null;
  defaultEnv?: string | null;

  // Kubernetes manifest overrides (optional)
  resources?: {
    requests?: { cpu?: string; memory?: string };
    limits?: { cpu?: string; memory?: string };
  };
  storage?: Array<{
    name: string;
    mountPath: string;
    size: string;
  }>;
  health?: {
    http?: { path: string; port?: number };
    tcp?: { port: number };
  };
}
