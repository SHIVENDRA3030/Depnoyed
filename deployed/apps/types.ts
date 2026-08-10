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
}
