# Storage

Files are stored in **Supabase Storage** using the **S3-compatible API**. Application code uses [`StorageService`](../backend/src/storage/storage.service.ts) so storage can move to Cloudflare R2 or AWS S3 later.

## Methods

- `upload(key, body, contentType)`
- `download(key)`
- `delete(key)`
- `getSignedUrl(key, expiresIn?)`
- `exists(key)`

## Object key layout

```
uploads/{user_id}/{file_uuid}/{sanitized_filename}.pdf
```

Bucket is private. Presigned URLs for authorized reads only.

## Environment

```
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

Aliases: `SUPABASE_S3_*` (see `backend/.env.example`).

## Access pattern

1. `POST /files` — validate PDF (or DOCX stub), upload, insert `saved_files`.
2. `GET /files/:id` — metadata + presigned URL for owner only.
