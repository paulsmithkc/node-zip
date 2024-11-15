/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { Logger } from "./logger";
import { readHeaderEOCD } from "./readHeaderEOCD";
import { readHeaderCD } from "./readHeaderCD";
import { readHeaderLH } from "./readHeaderLH";

jest.setTimeout(60_000);

describe("readHeader", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("Invalid signature", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");

      const bufferLength = 1024;
      const buffer = Buffer.alloc(bufferLength);

      const fileStats = await fileHandle.stat();
      const fileLength = fileStats.size;

      await expect(
        readHeaderEOCD(
          fileHandle,
          0,
          Math.min(bufferLength, fileLength),
          buffer,
          0,
          logger,
        ),
      ).rejects.toThrow("EOCD signature does not match");
      await expect(
        readHeaderCD(fileHandle, 8, buffer, 0, logger),
      ).rejects.toThrow("CD signature does not match");
      await expect(
        readHeaderLH(fileHandle, 8, buffer, 0, logger),
      ).rejects.toThrow("LH signature does not match");
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });
});
