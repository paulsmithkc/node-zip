/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { createHash } from "node:crypto";
import { Logger } from "./logger";
import { readBlock } from "./readBlock";

function computeMD5(buffer: Buffer) {
  return createHash("md5").update(buffer).digest("hex");
}

jest.setTimeout(60_000);

describe("readBlock", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("Read two blocks", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const bufferLength = 100;
      const buffer = Buffer.alloc(bufferLength);
      await readBlock(fileHandle, 0, bufferLength, buffer, 0, logger);
      expect(computeMD5(buffer)).toBe("f224102a7b4db229f0443486968a735c");
      await readBlock(
        fileHandle,
        bufferLength,
        bufferLength * 2,
        buffer,
        0,
        logger,
      );
      expect(computeMD5(buffer)).toBe("fc623a75364cc4462eb9f5d339c2506a");
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("Read EOF", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const fileStats = await fileHandle.stat();
      const fileStart = fileStats.size - 512;
      const fileEnd = fileStats.size + 512;
      const buffer = Buffer.alloc(1024);
      await expect(
        readBlock(fileHandle, fileStart, fileEnd, buffer, 0, logger),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(
            RegExp(
              `(EOF reached while reading block ${fileStart} to ${fileEnd})|(EINVAL: invalid argument, read)`,
            ),
          ),
        }),
      );
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("Buffer too small", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const buffer = Buffer.alloc(512);
      await expect(
        readBlock(fileHandle, 0, 1024, buffer, 0, logger),
      ).rejects.toThrow("buffer is too small, need 1024, available 512");
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });
});
