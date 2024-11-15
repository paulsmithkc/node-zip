import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";
import { Logger } from "./logger";
import { readZipDirectory } from "./readZipDirectory";

jest.setTimeout(60_000);

describe("readZipDirectory", () => {
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
      const directory = await readZipDirectory(fileHandle, logger);
      const expectedDirectory: any = {
        type: "central",
        fileLength: 388,
        eocd: {
          type: "eocd",
          countCD: 2,
          lengthCD: 174,
          startCD: 192,
          endCD: 366,
          headerStart: 366,
          headerEnd: 388,
        },
        cd: [
          {
            type: "cd",
            fileName: "file2.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 2529239633,
            flags: 8,
            headerStart: 192,
            headerEnd: 279,
            startLH: 0,
            uncompressedSize: 7,
            versionMadeBy: 788,
            versionMin: 20,
          },
          {
            type: "cd",
            fileName: "file1.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 3186389394,
            flags: 8,
            headerStart: 279,
            headerEnd: 366,
            startLH: 96,
            uncompressedSize: 7,
            versionMadeBy: 788,
            versionMin: 20,
          },
        ],
        lh: [
          {
            type: "lh",
            fileName: "file2.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 0,
            headerEnd: 71,
            uncompressedSize: 7,
            versionMin: 20,
          },
          {
            type: "lh",
            fileName: "file1.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 96,
            headerEnd: 167,
            uncompressedSize: 7,
            versionMin: 20,
          },
        ],
      };
      expectedDirectory.entries = [
        {
          fileName: expectedDirectory.cd[0].fileName,
          cd: expectedDirectory.cd[0],
          lh: expectedDirectory.lh[0],
        },
        {
          fileName: expectedDirectory.cd[1].fileName,
          cd: expectedDirectory.cd[1],
          lh: expectedDirectory.lh[1],
        },
      ];
      expect(directory).toEqual(expectedDirectory);
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("compression-mode-zero.zip", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/compression-mode-zero.zip");
      fileHandle = await open(filePath, "r");
      const directory = await readZipDirectory(fileHandle, logger);
      const expectedDirectory: any = {
        type: "central",
        fileLength: 296,
        eocd: {
          type: "eocd",
          countCD: 2,
          lengthCD: 182,
          startCD: 92,
          endCD: 274,
          headerStart: 274,
          headerEnd: 296,
        },
        cd: [
          {
            type: "cd",
            fileName: "file1.txt",
            compressedSize: 7,
            compressionMethod: 0,
            crc32: 3186389394,
            flags: 0,
            headerStart: 92,
            headerEnd: 183,
            startLH: 0,
            uncompressedSize: 7,
            versionMadeBy: 63,
            versionMin: 10,
          },
          {
            type: "cd",
            fileName: "file2.txt",
            compressedSize: 7,
            compressionMethod: 0,
            crc32: 2529239633,
            flags: 0,
            headerStart: 183,
            headerEnd: 274,
            startLH: 46,
            uncompressedSize: 7,
            versionMadeBy: 63,
            versionMin: 10,
          },
        ],
        lh: [
          {
            type: "lh",
            fileName: "file1.txt",
            compressedSize: 7,
            compressionMethod: 0,
            crc32: 3186389394,
            flags: 0,
            headerStart: 0,
            headerEnd: 39,
            uncompressedSize: 7,
            versionMin: 10,
          },
          {
            type: "lh",
            fileName: "file2.txt",
            compressedSize: 7,
            compressionMethod: 0,
            crc32: 2529239633,
            flags: 0,
            headerStart: 46,
            headerEnd: 85,
            uncompressedSize: 7,
            versionMin: 10,
          },
        ],
      };
      expectedDirectory.entries = [
        {
          fileName: expectedDirectory.cd[0].fileName,
          cd: expectedDirectory.cd[0],
          lh: expectedDirectory.lh[0],
        },
        {
          fileName: expectedDirectory.cd[1].fileName,
          cd: expectedDirectory.cd[1],
          lh: expectedDirectory.lh[1],
        },
      ];
      expect(directory).toEqual(expectedDirectory);
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
      const directory = await readZipDirectory(fileHandle, logger);
      const expectedDirectory: any = {
        type: "local",
        fileLength: 368,
        cd: [
          {
            type: "cd",
            fileName: "file2.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 2529239633,
            flags: 8,
            headerStart: 192,
            headerEnd: 279,
            startLH: 0,
            uncompressedSize: 7,
            versionMadeBy: 788,
            versionMin: 20,
          },
          {
            type: "cd",
            fileName: "file1.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 3186389394,
            flags: 8,
            headerStart: 279,
            headerEnd: 366,
            startLH: 96,
            uncompressedSize: 7,
            versionMadeBy: 788,
            versionMin: 20,
          },
          {
            headerStart: 366,
          },
        ],
        lh: [
          {
            type: "lh",
            fileName: "file2.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 0,
            headerEnd: 71,
            uncompressedSize: 7,
            versionMin: 20,
          },
          {
            type: "lh",
            fileName: "file1.txt",
            compressedSize: 9,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 96,
            headerEnd: 167,
            uncompressedSize: 7,
            versionMin: 20,
          },
        ],
      };
      expectedDirectory.entries = [
        {
          fileName: expectedDirectory.lh[0].fileName,
          lh: expectedDirectory.lh[0],
        },
        {
          fileName: expectedDirectory.lh[1].fileName,
          lh: expectedDirectory.lh[1],
        },
      ];
      expect(directory).toEqual(expectedDirectory);
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
      const directory = await readZipDirectory(fileHandle, logger);
      const expectedDirectory: any = {
        type: "local",
        fileLength: 188,
        cd: [],
        lh: [
          {
            type: "lh",
            fileName: "file2.txt",
            compressedSize: 25,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 0,
            headerEnd: 71,
            uncompressedSize: 7,
            versionMin: 20,
          },
          {
            type: "lh",
            fileName: "file1.txt",
            compressedSize: 21,
            compressionMethod: 8,
            crc32: 0,
            flags: 8,
            headerStart: 96,
            headerEnd: 167,
            uncompressedSize: 7,
            versionMin: 20,
          },
        ],
      };
      expectedDirectory.entries = [
        {
          fileName: expectedDirectory.lh[0].fileName,
          lh: expectedDirectory.lh[0],
        },
        {
          fileName: expectedDirectory.lh[1].fileName,
          lh: expectedDirectory.lh[1],
        },
      ];
      expect(directory).toEqual(expectedDirectory);
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
      await expect(readZipDirectory(fileHandle, logger)).rejects.toThrow(
        "file length zero",
      );
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });

  it("image.png", async () => {
    let fileHandle: FileHandle | undefined;
    try {
      const filePath = pathResolve("./data/image.png");
      fileHandle = await open(filePath, "r");
      await expect(readZipDirectory(fileHandle, logger)).rejects.toThrow(
        "no directory headers found",
      );
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  });
});
