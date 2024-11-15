import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { checkHeaderSignature } from './checkHeaderSignature';

export const SIGNATURE_LH = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export type ZipHeaderLH = {
  type: 'lh';
  headerStart: number;
  headerEnd: number;
  fileName: string;

  versionMin: number;
  flags: number;
  compressionMethod: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
};

/**
 * Read and parse the contents of a Local Header (LH).
 * @param fileHandle a handle for the open file
 * @param headerStart where the header starts in the file
 * @param buffer buffer to write data into
 * @param bufferStart where to start writing to the buffer
 */
export async function readHeaderLH(
  fileHandle: FileHandle,
  headerStart: number,
  buffer: Buffer,
  bufferStart: number,
  logger: Logger | undefined
): Promise<ZipHeaderLH> {
  const baseHeaderLength = 30;
  await readBlock(
    fileHandle,
    headerStart,
    headerStart + baseHeaderLength,
    buffer,
    bufferStart,
    logger
  );
  if (!checkHeaderSignature(SIGNATURE_LH, buffer, bufferStart, logger)) {
    throw new ReadZipError('LH signature does not match');
  }

  // read metadata
  const versionMin = buffer.readUInt16LE(bufferStart + 4);
  const flags = buffer.readUInt16LE(bufferStart + 6);
  const compressionMethod = buffer.readUInt16LE(bufferStart + 8);
  const crc32 = buffer.readUInt32LE(bufferStart + 14);
  const compressedSize = buffer.readUInt32LE(bufferStart + 18);
  const uncompressedSize = buffer.readUInt32LE(bufferStart + 22);

  // read field lengths and calculate full length of header
  const nameLength = buffer.readUInt16LE(bufferStart + 26);
  const extraLength = buffer.readUInt16LE(bufferStart + 28);
  const headerLength = baseHeaderLength + nameLength + extraLength;
  const headerEnd = headerStart + headerLength;

  // read the filename
  await readBlock(
    fileHandle,
    headerStart + baseHeaderLength,
    headerStart + baseHeaderLength + nameLength + extraLength,
    buffer,
    bufferStart + baseHeaderLength,
    logger
  );
  const fileName = buffer.toString(
    'utf8',
    bufferStart + baseHeaderLength,
    bufferStart + baseHeaderLength + nameLength
  );

  // return header info
  return {
    type: 'lh',
    headerStart,
    headerEnd,
    fileName,
    versionMin,
    flags,
    compressionMethod,
    crc32,
    compressedSize,
    uncompressedSize,
  };
}
