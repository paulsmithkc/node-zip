import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';

/**
 * Read a block of bytes from a file into the buffer
 * @param fileHandle a handle for the open file
 * @param fileStart where to start reading the file
 * @param fileEnd where to stop reading the file (exclusive)
 * @param buffer buffer to write data into
 * @param bufferStart where to start writing to the buffer
 */
export async function readBlock(
  fileHandle: FileHandle,
  fileStart: number,
  fileEnd: number,
  buffer: Buffer,
  bufferStart: number,
  _logger: Logger | undefined // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  {
    const need = fileEnd - fileStart;
    const available = buffer.length - bufferStart;
    if (need > available) {
      throw new ReadZipError(
        `buffer is too small, need ${need}, available ${available}`
      );
    }
  }

  let bufferPosition: number = bufferStart;
  let filePosition: number = fileStart;
  while (filePosition < fileEnd) {
    const { bytesRead } = await fileHandle.read(
      buffer,
      bufferPosition,
      Math.min(buffer.length, fileEnd - filePosition),
      filePosition
    );
    if (bytesRead == 0) {
      throw new ReadZipError(
        `EOF reached while reading block ${fileStart} to ${fileEnd}`
      );
    }

    filePosition += bytesRead;
    bufferPosition += bytesRead;
  }
}
