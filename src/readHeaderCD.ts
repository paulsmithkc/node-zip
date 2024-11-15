import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { checkHeaderSignature } from './checkHeaderSignature';

export const SIGNATURE_CD = Buffer.from([0x50, 0x4b, 0x01, 0x02]);

export type ZipHeaderCD = {
  type: 'cd';
  headerStart: number;
  headerEnd: number;
  fileName: string;
  startLH: number;

  versionMadeBy: number;
  versionMin: number;
  flags: number;
  compressionMethod: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
};

/**
 * Read and parse the contents of a Central Directory (CD) header.
 * @param fileHandle a handle for the open file
 * @param headerStart where the header starts in the file
 * @param buffer buffer to write data into
 * @param bufferStart where to start writing to the buffer
 */
export async function readHeaderCD(
  fileHandle: FileHandle,
  headerStart: number,
  buffer: Buffer,
  bufferStart: number,
  logger: Logger | undefined
): Promise<ZipHeaderCD> {
  const baseHeaderLength = 46;
  await readBlock(
    fileHandle,
    headerStart,
    headerStart + baseHeaderLength,
    buffer,
    bufferStart,
    logger
  );
  if (!checkHeaderSignature(SIGNATURE_CD, buffer, bufferStart, logger)) {
    throw new ReadZipError('CD signature does not match');
  }

  // read metadata
  const versionMadeBy = buffer.readUInt16LE(bufferStart + 4);
  const versionMin = buffer.readUInt16LE(bufferStart + 6);
  const flags = buffer.readUInt16LE(bufferStart + 8);
  const compressionMethod = buffer.readUInt16LE(bufferStart + 10);
  const crc32 = buffer.readUInt32LE(bufferStart + 16);
  const compressedSize = buffer.readUInt32LE(bufferStart + 20);
  const uncompressedSize = buffer.readUInt32LE(bufferStart + 24);
  const startLH = buffer.readUInt32LE(bufferStart + 42);

  // read field lengths and calculate full length of header
  const nameLength = buffer.readUInt16LE(bufferStart + 28);
  const extraLength = buffer.readUInt16LE(bufferStart + 30);
  const commentLength = buffer.readUInt16LE(bufferStart + 32);
  const headerLength =
    baseHeaderLength + nameLength + extraLength + commentLength;
  const headerEnd = headerStart + headerLength;

  // read the filename
  await readBlock(
    fileHandle,
    headerStart + baseHeaderLength,
    headerStart + baseHeaderLength + nameLength + extraLength + commentLength,
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
    type: 'cd',
    headerStart,
    headerEnd,
    fileName,
    startLH,
    versionMadeBy,
    versionMin,
    flags,
    compressionMethod,
    crc32,
    compressedSize,
    uncompressedSize,
  };
}
