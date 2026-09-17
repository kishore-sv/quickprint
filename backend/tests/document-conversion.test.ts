import { afterEach, describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "events";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { DocumentConversionService } from "../src/files/document-conversion.service";
import { ValidationError } from "../src/utils/errors";
import { minimalPdfBuffer } from "./helpers/minimal-pdf";

type SpawnHandler = (
  command: string,
  args: string[],
  options: { stdio: string[] }
) => EventEmitter & { stderr?: EventEmitter; kill: (signal: string) => void };

let spawnHandler: SpawnHandler | null = null;

mock.module("child_process", () => ({
  spawn: (command: string, args: string[], options: { stdio: string[] }) => {
    if (!spawnHandler) {
      throw new Error("spawn handler not configured");
    }
    return spawnHandler(command, args, options);
  },
}));

function makeSuccessfulSpawn(pdf: Buffer): SpawnHandler {
  return (_command, args) => {
    const child = new EventEmitter() as EventEmitter & {
      stderr?: EventEmitter;
      kill: (signal: string) => void;
    };
    child.stderr = new EventEmitter();
    child.kill = () => undefined;

    queueMicrotask(async () => {
      const outDir = args[4];
      const inputPath = args[5];
      const base = inputPath.split("/").pop()!.replace(/\.(doc|docx)$/i, "");
      await writeFile(join(outDir, `${base}.pdf`), pdf);
      child.emit("close", 0);
    });

    return child;
  };
}

describe("DocumentConversionService", () => {
  const service = new DocumentConversionService();

  afterEach(() => {
    spawnHandler = null;
  });

  test("converts DOCX buffer to PDF using LibreOffice args", async () => {
    const pdf = minimalPdfBuffer();
    spawnHandler = makeSuccessfulSpawn(pdf);

    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    const result = await service.convertWordToPdf(docx, "docx");
    expect(result.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("converts DOC buffer to PDF", async () => {
    const pdf = minimalPdfBuffer();
    spawnHandler = makeSuccessfulSpawn(pdf);

    const doc = Buffer.alloc(8);
    doc.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const result = await service.convertWordToPdf(doc, "doc");
    expect(result.length).toBeGreaterThan(0);
  });

  test("throws when LibreOffice binary is unavailable", async () => {
    spawnHandler = () => {
      const child = new EventEmitter() as EventEmitter & {
        stderr?: EventEmitter;
        kill: (signal: string) => void;
      };
      child.stderr = new EventEmitter();
      child.kill = () => undefined;
      queueMicrotask(() => {
        child.emit("error", Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }));
      });
      return child;
    };

    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    await expect(service.convertWordToPdf(docx, "docx")).rejects.toThrow(
      "Document conversion is unavailable"
    );
  });

  test("throws on non-zero exit code", async () => {
    spawnHandler = () => {
      const child = new EventEmitter() as EventEmitter & {
        stderr?: EventEmitter;
        kill: (signal: string) => void;
      };
      child.stderr = new EventEmitter();
      child.kill = () => undefined;
      queueMicrotask(() => child.emit("close", 1));
      return child;
    };

    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    await expect(service.convertWordToPdf(docx, "docx")).rejects.toThrow(ValidationError);
  });

  test("cleans up temporary directory after conversion", async () => {
    const pdf = minimalPdfBuffer();
    const workDir = await mkdtemp(join(tmpdir(), "quickprint-doc-test-"));
    let capturedOutDir: string | null = null;

    spawnHandler = (_command, args) => {
      capturedOutDir = args[4];
      const child = new EventEmitter() as EventEmitter & {
        stderr?: EventEmitter;
        kill: (signal: string) => void;
      };
      child.stderr = new EventEmitter();
      child.kill = () => undefined;
      queueMicrotask(async () => {
        const inputPath = args[5];
        const base = inputPath.split("/").pop()!.replace(/\.docx$/i, "");
        await writeFile(join(capturedOutDir!, `${base}.pdf`), pdf);
        child.emit("close", 0);
      });
      return child;
    };

    const docx = Buffer.from("PK\x03\x04word/document.xml[Content_Types].xml");
    await service.convertWordToPdf(docx, "docx");

    if (capturedOutDir) {
      await expect(readFile(capturedOutDir)).rejects.toThrow();
    }

    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  });
});
