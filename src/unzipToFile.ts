import { FileHandle, mkdir, open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { ZipEntry } from './readZipDirectory';
import { ZipHeaderCD } from './readHeaderCD';
import { ZipHeaderLH } from './readHeaderLH';
import { createInflateRaw } from 'node:zlib';
import { performance } from 'node:perf_hooks';

export async function unzipToFile(
  srcHandle: FileHandle,
  srcEntry: ZipEntry,
  dstPath: string,
  logger?: Logger
): Promise<void> {
  // istanbul ignore if
  if (process.version < 'v16.0.0.0') {
    // stream pipeline is not stable in Node 14
    throw new ReadZipError(`NOT SUPPORTED ON NODE VERSION ${process.env}`);
  }

  performance?.mark('zip:unzipToFile:start');

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
          'zip:unzipToFile:warn',
          `WARNING: cd.${prop} = ${cd[prop]}, but lh.${prop} = ${lh[prop]}`
        );
      }
    }
  }

  let dstHandle: FileHandle | undefined;
  try {
    await mkdir(dirname(dstPath), { recursive: true });
    dstHandle = await open(dstPath, 'w');

    const srcStream = createReadStream('', {
      fd: srcHandle,
      start: fileStart,
      end: fileEnd - 1, // WARNING: end is inclusive
      autoClose: false,
    });
    const dstStream = createWriteStream('', {
      fd: dstHandle,
      start: 0,
      autoClose: true,
    });

    /* istanbul ignore else */
    if (compressionMethod == 0) {
      // uncompressed file
      await pipeline(srcStream, dstStream, { end: false });
    } else if (compressionMethod == 8) {
      // deflated file
      const transform = createInflateRaw();
      await pipeline(srcStream, transform, dstStream, { end: false });
    } else {
      throw new ReadZipError(
        `Unsupported compressed method ${compressionMethod}`
      );
    }
  } finally {
    if (dstHandle) {
      await dstHandle.close();
    }
  }

  performance?.mark('zip:unzipToFile:end');
}
