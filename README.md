# @merlin4/zip

This package provides the necessary code to efficiently:

1. Read the directory of ZIP files.
2. Extract the contents from ZIP files.
3. Recover ZIP files that are partially damaged / missing a central directory.

## Usage: Read directory and unzip all files

```ts
import { readZipDirectory, unzipToFile } from "@merlin4/zip";
import { FileHandle, open } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";

async function main() {
  let fileHandle: FileHandle | undefined;
  try {
    const zipPath = pathResolve("./data/example.zip");
    const outDir = pathResolve("./temp/example");

    // open zip file
    fileHandle = await open(zipPath, "r");

    // read the zip's table of contents
    const directory = await readZipDirectory(fileHandle);

    // unzip all of the files
    for (const entry of directory.entries) {
      const outPath = pathResolve(outDir, entry.fileName);
      await unzipToFile(fileHandle, entry, outPath);
    }
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

main();
```

## ZIP64

This package doesn't currently support the ZIP64 file format for large files (over 4GB)

## Performance & Streaming

CPU & Memory performance are both very important to this package. As such, a significant effort has been made to stream the data and efficiently use buffers to reduce the memory needed to process ZIP files.

As such, the code leverages low-level c-style techniques of reducing memory usage and reusing buffers where possible.

## ZIP File Format

When reviewing/modifying the code in this package please consult the specification for the ZIP file format.

1. https://en.wikipedia.org/wiki/ZIP_(file_format)
2. https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html
3. https://www.loc.gov/preservation/digital/formats/fdd/fdd000354.shtml
4. https://pkware.cachefly.net/webdocs/APPNOTE/APPNOTE-6.3.9.TXT


