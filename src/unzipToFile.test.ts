/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FileHandle, open } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { createHash } from "node:crypto";
import { Logger } from "./logger";
import { readZipDirectory } from "./readZipDirectory";

function computeMD5(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const input = createReadStream(filePath);
      const hash = createHash("md5");
      input
        .pipe(hash)
        .on("finish", () => resolve(hash.digest("hex")))
        .on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

jest.setTimeout(60_000);

describe("unzipToFile", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  if (process.version < "v16.0.0.0") {
    // eslint-disable-next-line jest/expect-expect, @typescript-eslint/no-empty-function
    it(`NOT SUPPORTED ON NODE VERSION ${process.version}`, () => {});
    return;
  }

  it("example.zip", async () => {
    const { unzipToFile } = await import("./unzipToFile");

    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/example.zip");
      srcHandle = await open(srcPath, "r");

      const directory = await readZipDirectory(srcHandle, logger);

      const temp1 = pathResolve(
        "./temp/example",
        directory.entries[0]!.fileName,
      );
      await unzipToFile(srcHandle, directory.entries[0]!, temp1, logger);
      await expect(computeMD5(temp1)).resolves.toBe(
        "fd807ebafc828916685b2e7a3aca7e4e",
      );

      const temp2 = pathResolve(
        "./temp/example",
        directory.entries[1]!.fileName,
      );
      await unzipToFile(srcHandle, directory.entries[1]!, temp2, logger);
      await expect(computeMD5(temp2)).resolves.toBe(
        "7962171bf365b485086c7e698c8694b1",
      );
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });

  it("compression-mode-zero.zip", async () => {
    const { unzipToFile } = await import("./unzipToFile");

    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/compression-mode-zero.zip");
      srcHandle = await open(srcPath, "r");

      const directory = await readZipDirectory(srcHandle, logger);

      const temp1 = pathResolve(
        "./temp/compression-mode-zero",
        directory.entries[0]!.fileName,
      );
      await unzipToFile(srcHandle, directory.entries[0]!, temp1, logger);
      await expect(computeMD5(temp1)).resolves.toBe(
        "7962171bf365b485086c7e698c8694b1",
      );

      const temp2 = pathResolve(
        "./temp/compression-mode-zero",
        directory.entries[1]!.fileName,
      );
      await unzipToFile(srcHandle, directory.entries[1]!, temp2, logger);
      await expect(computeMD5(temp2)).resolves.toBe(
        "fd807ebafc828916685b2e7a3aca7e4e",
      );
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });

  it("missing LH header", async () => {
    const { unzipToFile } = await import("./unzipToFile");

    let srcHandle: FileHandle | undefined;
    try {
      const srcPath = pathResolve("./data/example.zip");
      srcHandle = await open(srcPath, "r");

      const srcName = "test.txt";
      const dstPath = pathResolve("./temp", srcName);
      await expect(
        unzipToFile(srcHandle, { fileName: srcName }, dstPath, logger),
      ).rejects.toThrow("missing LH header for entry");
    } finally {
      if (srcHandle) {
        await srcHandle.close();
      }
    }
  });
});
