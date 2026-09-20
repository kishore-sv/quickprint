import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { StorageError } from "../utils/errors";

export interface StorageService {
  upload(key: string, body: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getSignedPutUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string>;
  exists(key: string): Promise<boolean>;
}

class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;
  private defaultExpires: number;

  constructor() {
    this.bucket = env.S3_BUCKET_NAME;
    this.defaultExpires = env.PRESIGNED_URL_EXPIRES;
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    } catch (err) {
      if (env.NODE_ENV === "development" && err instanceof Error) {
        console.error("[storage] upload failed:", err.message);
      }
      throw new StorageError();
    }
  }

  async download(key: string): Promise<Buffer> {
    const resp = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    const bytes = await resp.Body?.transformToByteArray();
    if (!bytes) throw new StorageError("Empty object");
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresIn ?? this.defaultExpires,
    });
  }

  async getSignedPutUrl(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string> {
    const input: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    };
    const command = new PutObjectCommand(input);
    return getSignedUrl(this.client, command, {
      expiresIn: expiresIn ?? 300,
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!instance) instance = new S3StorageService();
  return instance;
}
