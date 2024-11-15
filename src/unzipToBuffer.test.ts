/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { createHash } from "node:crypto";
import { Logger } from "./logger";
import { readZipDirectory } from "./readZipDirectory";
import { unzipToBuffer } from "./unzipToBuffer";

function computeMD5(buffer: Buffer) {
  return createHash("md5").update(buffer).digest("hex");
}

jest.setTimeout(60_000);

describe("unzipToBuffer", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("example.zip", async () => {
    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/example.zip");
      srcHandle = await open(srcPath, "r");

      const directory = await readZipDirectory(srcHandle, logger);

      const buffer1 = await unzipToBuffer(
        srcHandle,
        directory.entries[0]!,
        logger,
      );
      expect(computeMD5(buffer1)).toBe("fd807ebafc828916685b2e7a3aca7e4e");

      const buffer2 = await unzipToBuffer(
        srcHandle,
        directory.entries[1]!,
        logger,
      );
      expect(computeMD5(buffer2)).toBe("7962171bf365b485086c7e698c8694b1");
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });

  it("compression-mode-zero.zip", async () => {
    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/compression-mode-zero.zip");
      srcHandle = await open(srcPath, "r");

      const directory = await readZipDirectory(srcHandle, logger);

      const buffer1 = await unzipToBuffer(
        srcHandle,
        directory.entries[0]!,
        logger,
      );
      expect(computeMD5(buffer1)).toBe("7962171bf365b485086c7e698c8694b1");

      const buffer2 = await unzipToBuffer(
        srcHandle,
        directory.entries[1]!,
        logger,
      );
      expect(computeMD5(buffer2)).toBe("fd807ebafc828916685b2e7a3aca7e4e");
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });

  it("missing LH header", async () => {
    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/example.zip");
      srcHandle = await open(srcPath, "r");
      await expect(
        unzipToBuffer(srcHandle, { fileName: "test.txt" }, logger),
      ).rejects.toThrow("missing LH header for entry");
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });
});
