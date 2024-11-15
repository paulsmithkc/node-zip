import { FileHandle } from 'node:fs/promises';
import { ReadZipError } from './error';
import { Logger } from './logger';
import { readBlock } from './readBlock';
import { findEOCD } from './findEOCD';
import { ZipHeaderEOCD, readHeaderEOCD } from './readHeaderEOCD';
import { SIGNATURE_CD, ZipHeaderCD, readHeaderCD } from './readHeaderCD';
import { SIGNATURE_LH, ZipHeaderLH, readHeaderLH } from './readHeaderLH';
import { performance } from 'node:perf_hooks';

export type ZipDirectory = {
  type: 'central' | 'local';
  fileLength: number;
  eocd?: ZipHeaderEOCD;
  cd: Partial<ZipHeaderCD>[];
  lh: ZipHeaderLH[];
  entries: ZipEntry[];
};

export type ZipEntry = {
  fileName: string;
  cd?: ZipHeaderCD;
  lh?: ZipHeaderLH;
};

/**
 * Read a zip file and return the contents of the central directory.
 *
 * @param fileHandle a handle for the open file
 */
export async function readZipDirectory(
  fileHandle: FileHandle,
  logger?: Logger
): Promise<ZipDirectory> {
  performance?.mark('zip:readZipDirectory:start');

  // get the length of the file
  const fileStats = await fileHandle.stat();
  const fileLength = fileStats.size;
  if (fileLength === 0) {
    throw new ReadZipError('file length zero');
  }
  // istanbul ignore if
  if (!fileLength) {
    throw new ReadZipError('file length unknown');
  }

  // allocate a buffer
  const bufferLength = Math.min(1024, fileLength); // don't allocate a buffer bigger than the file
  const buffer = Buffer.alloc(bufferLength);

  // find the "End Of Central Directory (EOCD)" header
  const rangeEOCD = await findEOCD(fileHandle, fileLength, buffer, logger);

  let res: ZipDirectory;
  if (rangeEOCD) {
    const { startEOCD, endEOCD } = rangeEOCD;
    logger?.info(
      'zip:readZipDirectory:info',
      `Found EOCD at ${startEOCD}:${endEOCD}`
    );
    res = await readZipCentralDirectory(
      fileHandle,
      fileLength,
      startEOCD,
      endEOCD,
      buffer,
      logger
    );
  } else {
    logger?.info(
      'zip:readZipDirectory:warn',
      `Central Directory is missing or corrupted.`
    );
    res = await readZipLocalDirectory(fileHandle, fileLength, buffer, logger);
  }

  performance?.mark('zip:readZipDirectory:end');
  return res;
}

/**
 * Read a zip file and return the contents of the central directory.
 */
async function readZipCentralDirectory(
  fileHandle: FileHandle,
  fileLength: number,
  startEOCD: number,
  endEOCD: number,
  buffer: Buffer,
  logger: Logger | undefined
): Promise<ZipDirectory> {
  // read the EOCD header
  const eocd = await readHeaderEOCD(
    fileHandle,
    startEOCD,
    endEOCD,
    buffer,
    0,
    logger
  );
  const { startCD, endCD } = eocd;

  // read the central directory
  const cd: ZipHeaderCD[] = [];
  let position = startCD;
  while (position < endCD) {
    const headerCD = await readHeaderCD(
      fileHandle,
      position,
      buffer,
      0,
      logger
    );
    cd.push(headerCD);
    position = headerCD.headerEnd;
  }

  // read the local directory
  const lh: ZipHeaderLH[] = [];
  const entries: ZipEntry[] = [];
  for (const headerCD of cd) {
    const headerLH = await readHeaderLH(
      fileHandle,
      headerCD.startLH,
      buffer,
      0,
      logger
    );
    lh.push(headerLH);
    position = headerLH.headerEnd;

    const fileName = headerCD.fileName;
    if (fileName) {
      entries.push({ fileName, cd: headerCD, lh: headerLH });
    }
  }

  // fix compressed size values
  fixCompressedSizes(startCD, cd, lh);

  return { type: 'central', fileLength, eocd, cd, lh, entries };
}

/**
 * Read a zip file and return the contents of the local headers.
 * (For use when central directory is missing or corrupted.)
 */
async function readZipLocalDirectory(
  fileHandle: FileHandle,
  fileLength: number,
  buffer: Buffer,
  logger: Logger | undefined
): Promise<ZipDirectory> {
  const bufferLength = buffer.length;

  // read the local directory
  const lh: ZipHeaderLH[] = [];
  const entries: ZipEntry[] = [];
  let position = 0;
  while (position < fileLength) {
    // read a partial block, at the end of the file
    let blockLength = bufferLength;
    let blockEnd = position + blockLength;
    if (blockEnd > fileLength) {
      blockEnd = fileLength;
      blockLength = fileLength - position;
    }

    // search for signature
    await readBlock(fileHandle, position, blockEnd, buffer, 0, logger);
    const foundIndex = buffer.indexOf(SIGNATURE_LH, 0);
    if (foundIndex >= 0 && foundIndex < blockLength) {
      position += foundIndex;
      logger?.info(
        'zip:readZipLocalDirectory:info',
        `Found LH signature at position ${position}`
      );
      const header = await readHeaderLH(
        fileHandle,
        position,
        buffer,
        0,
        logger
      );
      lh.push(header);
      position = header.headerEnd;

      const fileName = header.fileName;
      if (fileName) {
        entries.push({ fileName, lh: header });
      }
    } else {
      // the signature might be on the edge, so some bytes should be read again
      position += bufferLength - SIGNATURE_LH.length + 1;
    }
  }

  // read the central directory
  const cd: Partial<ZipHeaderCD>[] = [];
  position = lh[lh.length - 1]?.headerEnd ?? 0;
  while (position < fileLength) {
    // read a partial block, at the end of the file
    let blockLength = bufferLength;
    let blockEnd = position + blockLength;
    if (blockEnd > fileLength) {
      blockEnd = fileLength;
      blockLength = fileLength - position;
    }

    // search for signature
    await readBlock(fileHandle, position, blockEnd, buffer, 0, logger);
    const foundIndex = buffer.indexOf(SIGNATURE_CD, 0);
    if (foundIndex >= 0 && foundIndex < blockLength) {
      position += foundIndex;
      logger?.info(
        'zip:readZipLocalDirectory:info',
        `Found CD signature at position ${position}`
      );
      try {
        const header = await readHeaderCD(
          fileHandle,
          position,
          buffer,
          0,
          logger
        );
        cd.push(header);
        position = header.headerEnd;
      } catch (err) {
        logger?.error('zip:readZipLocalDirectory:error', err);
        cd.push({ headerStart: position });
        break;
      }
    } else {
      // the signature might be on the edge, so some bytes should be read again
      position += bufferLength - SIGNATURE_CD.length + 1;
    }
  }

  if (!lh.length && !cd.length) {
    throw new ReadZipError('no directory headers found');
  }

  // fix compressed size values
  const startCD = cd[0]?.headerStart ?? fileLength;
  fixCompressedSizes(startCD, cd, lh);

  return { type: 'local', fileLength, lh, cd, entries };
}

/**
 * Fixes compressedSize values in the local directory.
 */
function fixCompressedSizes(
  startCD: number,
  cd: Partial<ZipHeaderCD>[],
  lh: ZipHeaderLH[]
): void {
  for (let i = 0, n = lh.length; i < n; ++i) {
    const headerLH = lh[i];
    if (headerLH) {
      let compressedSize = 0;

      const compressedSizeCD = cd.find(
        (x) => x.startLH === headerLH.headerStart
      )?.compressedSize;
      if (compressedSizeCD && compressedSizeCD > 0) {
        compressedSize = compressedSizeCD;
      }

      const nextHeaderLH = lh[i + 1];
      const compressedSizeLH = nextHeaderLH
        ? nextHeaderLH.headerStart - headerLH.headerEnd
        : startCD - headerLH.headerEnd;

      if (
        compressedSizeLH > 0 &&
        (compressedSize == 0 || compressedSizeLH < compressedSize)
      ) {
        compressedSize = compressedSizeLH;
      }

      headerLH.compressedSize = compressedSize;
    }
  }
}
