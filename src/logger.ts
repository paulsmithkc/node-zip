export interface Logger {
  info(method: string, message: string): void;
  error(method: string, err: Error | string): void;
}
