import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { Logger } from "./logger";
import { findEOCD } from "./findEOCD";

jest.setTimeout(60_000);

describe("findEOCD", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
  });

  it("example.zip", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/example.zip");
      fileHandle = await open(filePath, "r");
      const fileStats = await fileHandle.stat();
      const buffer = Buffer.alloc(1024);
      await expect(
        findEOCD(fileHandle, fileStats.size, buffer, logger),
      ).resolves.toEqual({
        startEOCD: 366,
        endEOCD: 388,
      });
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("central-directory-corrupted-1.zip", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/central-directory-corrupted-1.zip");
      fileHandle = await open(filePath, "r");
      const fileStats = await fileHandle.stat();
      const buffer = Buffer.alloc(1024);
      await expect(
        findEOCD(fileHandle, fileStats.size, buffer, logger),
      ).resolves.toBeNull();
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("central-directory-corrupted-2.zip", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/central-directory-corrupted-2.zip");
      fileHandle = await open(filePath, "r");
      const fileStats = await fileHandle.stat();
      const buffer = Buffer.alloc(1024);
      await expect(
        findEOCD(fileHandle, fileStats.size, buffer, logger),
      ).resolves.toBeNull();
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("zero-length.zip", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/zero-length.zip");
      fileHandle = await open(filePath, "r");
      const buffer = Buffer.alloc(1024);
      await expect(findEOCD(fileHandle, 0, buffer, logger)).rejects.toThrow(
        "file length unknown",
      );
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });
});
