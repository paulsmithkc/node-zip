import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { SIGNATURE_EOCD } from './readHeaderEOCD';

/**
 * Find the EOCD block by searching from the end of the file.
 * @param fileHandle a handle for the open file
 * @param fileLength the length of the file
 * @param buffer a buffer to write data into
 * @returns start and end positions of the EOCD record
 */
export async function findEOCD(
  fileHandle: FileHandle,
  fileLength: number,
  buffer: Buffer,
  logger: Logger | undefined
): Promise<null | { startEOCD: number; endEOCD: number }> {
  if (!fileLength) {
    throw new ReadZipError('file length unknown');
  }

  const bufferLength: number = Math.min(buffer.length, fileLength);
  let position: number = fileLength - bufferLength;

  while (position >= 0) {
    await readBlock(
      fileHandle,
      position,
      position + bufferLength,
      buffer,
      0,
      logger
    );
    const foundIndex = buffer.lastIndexOf(SIGNATURE_EOCD, bufferLength - 1);
    if (foundIndex >= 0) {
      logger?.info(
        'zip:findEOCD:info',
        `Found EOCD signature at position ${position + foundIndex}`
      );
      // EOCD signature found
      const commentLength: number = buffer.readUint16LE(foundIndex + 20);
      const startEOCD: number = position + foundIndex;
      const endEOCD: number = startEOCD + 22 + commentLength;
      return { startEOCD, endEOCD };
    } else {
      // the signature might be on the edge, so some bytes should be read again
      position -= bufferLength - SIGNATURE_EOCD.length + 1;
    }
  }

  return null;
}
