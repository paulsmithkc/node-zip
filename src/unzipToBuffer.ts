import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { ZipEntry } from './readZipDirectory';
import { ZipHeaderCD } from './readHeaderCD';
import { ZipHeaderLH } from './readHeaderLH';
import { createInflateRaw } from 'node:zlib';
import { performance } from 'node:perf_hooks';

export async function unzipToBuffer(
  srcHandle: FileHandle,
  srcEntry: ZipEntry,
  logger?: Logger
): Promise<Buffer> {
  performance?.mark('zip:unzipToBuffer:start');

  if (!srcEntry.lh) {
    throw new ReadZipError(`missing LH header for entry`);
  }

  const { cd, lh } = srcEntry;
  const { compressionMethod, compressedSize } = lh;
  const fileStart = lh.headerEnd;
  const fileEnd = fileStart + compressedSize;

  // istanbul ignore next
  if (cd && logger) {
    // check that the CD and LH headers match
    const props: (keyof ZipHeaderCD & keyof ZipHeaderLH)[] = [
      'fileName',
      'versionMin',
      'flags',
      'compressionMethod',
      'crc32',
      'compressedSize',
      'uncompressedSize',
    ];
    for (const prop of props) {
      if (cd[prop] !== lh[prop]) {
        logger.info(
          'zip:unzipToBuffer:warn',
          `WARNING: cd.${prop} = ${cd[prop]}, but lh.${prop} = ${lh[prop]}`
        );
      }
    }
  }

  // read file into buffer
  /* istanbul ignore else */
  if (compressionMethod == 0) {
    // uncompressed file
    const inputBuffer = Buffer.alloc(compressedSize);
    await readBlock(srcHandle, fileStart, fileEnd, inputBuffer, 0, logger);
    performance?.mark('zip:unzipToBuffer:end');
    return inputBuffer;
  } else if (compressionMethod == 8) {
    // inflate file
    const transform = createInflateRaw();

    // read file into the transformer
    const inputBuffer = Buffer.alloc(compressedSize);
    await readBlock(srcHandle, fileStart, fileEnd, inputBuffer, 0, logger);
    transform.write(inputBuffer);
    transform.end();

    // read data out of the transformer
    const chunks: Buffer[] = [];
    for await (const chunk of transform) {
      chunks.push(Buffer.from(chunk));
    }
    const outputBuffer = Buffer.concat(chunks);
    performance?.mark('zip:unzipToBuffer:end');
    return outputBuffer;
  } else {
    throw new ReadZipError(
      `Unsupported compressed method ${compressionMethod}`
    );
  }
}
