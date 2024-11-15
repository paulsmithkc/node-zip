/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { Logger } from "./logger";
import { readZipDirectory } from "./readZipDirectory";
import { readBlock } from "./readBlock";
import { checkHeaderSignature } from "./checkHeaderSignature";
import { SIGNATURE_EOCD } from "./readHeaderEOCD";
import { SIGNATURE_CD } from "./readHeaderCD";
import { SIGNATURE_LH } from "./readHeaderLH";

jest.setTimeout(60_000);

describe("checkHeaderSignature", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("Valid EOCD/CD/LH signatures", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const directory = await readZipDirectory(fileHandle, logger);
      const buffer = Buffer.alloc(1024);

      {
        const eocd = directory.eocd!;
        await readBlock(
          fileHandle,
          eocd.headerStart!,
          eocd.headerEnd!,
          buffer,
          0,
          logger,
        );
        expect(checkHeaderSignature(SIGNATURE_EOCD, buffer, 0, logger)).toBe(
          true,
        );
      }
      {
        const cd = directory.cd[0]!;
        await readBlock(
          fileHandle,
          cd.headerStart!,
          cd.headerEnd!,
          buffer,
          0,
          logger,
        );
        expect(checkHeaderSignature(SIGNATURE_CD, buffer, 0, logger)).toBe(
          true,
        );
      }
      {
        const lh = directory.lh[0]!;
        await readBlock(
          fileHandle,
          lh.headerStart!,
          lh.headerEnd!,
          buffer,
          0,
          logger,
        );
        expect(checkHeaderSignature(SIGNATURE_LH, buffer, 0, logger)).toBe(
          true,
        );
      }
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("Invalid signature", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const directory = await readZipDirectory(fileHandle, logger);
      const buffer = Buffer.alloc(1024);

      {
        const eocd = directory.eocd!;
        await readBlock(
          fileHandle,
          eocd.headerStart!,
          eocd.headerEnd!,
          buffer,
          0,
          logger,
        );
        expect(checkHeaderSignature(SIGNATURE_LH, buffer, 0, logger)).toBe(
          false,
        );
        expect(logger.info).toHaveBeenCalledWith(
          "zip:checkHeaderSignature:warn",
          "WARNING: block signature does not match, signature was 504b0506, but expected 504b0304",
        );
      }
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });
});
