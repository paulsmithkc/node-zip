import { Logger } from './logger';

/**
 * Checks the buffer, to see if it contains the correct signature.
 * @param signature expected signature to start the header
 * @param buffer block of data that was read
 * @param bufferStart where to header starts in the buffer
 * @returns true indicates that the signatures match
 */
export function checkHeaderSignature(
  signature: Buffer,
  buffer: Buffer,
  bufferStart: number,
  logger: Logger | undefined
): boolean {
  const n = signature.length;
  const matches =
    buffer.compare(signature, 0, n, bufferStart, bufferStart + n) === 0;
  if (!matches && logger) {
    const foundSignature = buffer
      .subarray(bufferStart, bufferStart + signature.length)
      .toString('hex');
    const expectedSignature = signature.toString('hex');
    logger.info(
      'zip:checkHeaderSignature:warn',
      `WARNING: block signature does not match, signature was ${foundSignature}, but expected ${expectedSignature}`
    );
  }
  return matches;
}
