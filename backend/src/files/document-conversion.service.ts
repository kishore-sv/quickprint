import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { env } from "../config/env";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

export type WordDocumentFormat = "doc" | "docx";

/**
 * DOC/DOCX → PDF conversion via LibreOffice headless.
 */
export class DocumentConversionService {
  async convertWordToPdf(content: Buffer, format: WordDocumentFormat): Promise<Buffer> {
    const workDir = await mkdtemp(join(tmpdir(), "quickprint-doc-"));
    const id = randomUUID();
    const inputName = `${id}.${format}`;
    const inputPath = join(workDir, inputName);
    const outputPath = join(workDir, `${id}.pdf`);

    try {
      await writeFile(inputPath, content);

      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          env.LIBREOFFICE_BIN,
          ["--headless", "--convert-to", "pdf", "--outdir", workDir, inputPath],
          { stdio: ["ignore", "pipe", "pipe"] }
        );

        let stderr = "";
        child.stderr?.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new ValidationError("Document conversion timed out"));
        }, env.DOCUMENT_CONVERSION_TIMEOUT_MS);

        child.on("error", (error: NodeJS.ErrnoException) => {
          clearTimeout(timeout);
          if (error.code === "ENOENT") {
            reject(new ValidationError("Document conversion is unavailable"));
            return;
          }
          logger.warn({ err: error.message }, "LibreOffice spawn failed");
          reject(new ValidationError("Could not convert document to PDF"));
        });

        child.on("close", (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            if (stderr) {
              logger.warn({ code, stderr: stderr.slice(0, 500) }, "LibreOffice conversion failed");
            }
            reject(new ValidationError("Could not convert document to PDF"));
            return;
          }
          resolve();
        });
      });

      const pdf = await readFile(outputPath);
      if (pdf.length === 0) {
        throw new ValidationError("Converted PDF is empty");
      }
      return pdf;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** @deprecated Use convertWordToPdf */
  async convertDocxToPdf(content: Buffer): Promise<Buffer> {
    return this.convertWordToPdf(content, "docx");
  }
}

export const documentConversionService = new DocumentConversionService();
