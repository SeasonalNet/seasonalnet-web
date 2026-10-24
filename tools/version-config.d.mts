interface VersionConfig {
  env: Record<string, string>;
  generateBuildId(): Promise<string>;
  headers(): Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
}
export function versionConfig(environment?: Record<string, string | undefined>): VersionConfig;
