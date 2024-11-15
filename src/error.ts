/* istanbul ignore file */

export class ErrorWithCause extends Error {
  cause: unknown;

  constructor(message: string, cause?: unknown) {
    if (cause && cause instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      super(message, { cause });
    } else if (cause) {
      super(message);
    } else {
      super(message);
    }
    this.cause = cause;
  }
}

export class ReadZipError extends ErrorWithCause {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ReadZipError';
  }
}
