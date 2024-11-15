import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { checkHeaderSignature } from './checkHeaderSignature';

export const SIGNATURE_EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

export type ZipHeaderEOCD = {
  type: 'eocd';
  headerStart: number;
  headerEnd: number;

  countCD: number;
  lengthCD: number;
  startCD: number;
  endCD: number;
};

/**
 * Read and parse the contents of a End Of Central Directory (EOCD) header.
 *
 * @param fileHandle a handle for the open file
 * @param headerStart where the header starts in the file
 * @param headerEnd where the header ends in the file (exclusive)
 * @param buffer buffer to write data into
 * @param bufferStart where to start writing to the buffer
 */
export async function readHeaderEOCD(
  fileHandle: FileHandle,
  headerStart: number,
  headerEnd: number,
  buffer: Buffer,
  bufferStart: number,
  logger: Logger | undefined
): Promise<ZipHeaderEOCD> {
  await readBlock(
    fileHandle,
    headerStart,
    headerEnd,
    buffer,
    bufferStart,
    logger
  );
  if (!checkHeaderSignature(SIGNATURE_EOCD, buffer, bufferStart, logger)) {
    throw new ReadZipError('EOCD signature does not match');
  }

  // read info about the active "Central Directory (CD)"
  const countCD = buffer.readUInt16LE(bufferStart + 8);
  const lengthCD = buffer.readUInt32LE(bufferStart + 12);
  const startCD = buffer.readUInt32LE(bufferStart + 16);
  const endCD = startCD + lengthCD;

  // return header info
  return {
    type: 'eocd',
    headerStart,
    headerEnd,
    countCD,
    lengthCD,
    startCD,
    endCD,
  };
}
