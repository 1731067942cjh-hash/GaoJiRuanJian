/** Port for reading and writing text files; keeps the CLI testable. */
export interface FileGateway {
  readText(path: string): Promise<string>;
  writeText(path: string, contents: string): Promise<void>;
}
