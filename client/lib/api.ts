import { API_BASE_URL, AUTH_BASE_URL, authClient } from "@/lib/auth-client";
import type { PrintJobListResponse } from "@/lib/types";

const API_URL = API_BASE_URL;

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function assertAuthCanReachApi(hasBearerToken: boolean): void {
  if (hasBearerToken) return;
  const authOrigin =
    typeof window !== "undefined" ? window.location.origin : normalizeOrigin(AUTH_BASE_URL);
  if (authOrigin !== normalizeOrigin(API_URL)) {
    throw new ApiError(
      "Auth and API URLs must match. Set NEXT_PUBLIC_BETTER_AUTH_URL to the same host as NEXT_PUBLIC_API_URL.",
      0,
      "AUTH_API_MISMATCH"
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

function unwrapSuccess<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success: boolean }).success === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }
  const json = (await res.json()) as unknown;
  return unwrapSuccess<T>(json);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { data: sessionData } = await authClient.getSession();
  if (!sessionData?.session) {
    throw new ApiError("Not authenticated", 401, "UNAUTHORIZED");
  }

  const headers = new Headers(options.headers);
  const token = sessionData.session.token;
  assertAuthCanReachApi(Boolean(token));
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = (await res.json()) as {
        detail?: string;
        code?: string;
        error?: { code?: string; message?: string };
      };
      detail = err.detail ?? err.error?.message ?? detail;
      throw new ApiError(detail, res.status, err.code ?? err.error?.code);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(detail, res.status);
    }
  }

  return parseJsonResponse<T>(res);
}

export async function apiFetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    throw new ApiError("Request failed", res.status);
  }
  return parseJsonResponse<T>(res);
}

export async function fetchPrintJobs(query: string): Promise<PrintJobListResponse> {
  return apiFetch<PrintJobListResponse>(`/print-jobs${query}`);
}

export async function uploadFile(
  file: File,
  saveForLater: boolean,
  onProgress?: (percent: number) => void,
  originalFilename?: string
): Promise<import("@/lib/types").SavedFile> {
  const { data: sessionData } = await authClient.getSession();
  if (!sessionData?.session) throw new ApiError("Not authenticated", 401);

  const token = sessionData.session.token;
  const form = new FormData();
  form.append("file", file);
  if (originalFilename) {
    form.append("original_filename", originalFilename);
  }
  const url = new URL(`${API_URL}/files`);
  if (saveForLater) url.searchParams.set("save_for_later", "true");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url.toString());
    xhr.withCredentials = true;
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as unknown;
          resolve(unwrapSuccess<import("@/lib/types").SavedFile>(parsed));
        } catch {
          reject(new ApiError("Invalid upload response", xhr.status));
        }
        return;
      }
      if (xhr.status === 413) {
        reject(
          new ApiError(
            "File is too large. Maximum upload size is 50 MB.",
            xhr.status
          )
        );
        return;
      }
      try {
        const err = JSON.parse(xhr.responseText) as { detail?: string };
        reject(new ApiError(err.detail ?? "Upload failed", xhr.status));
      } catch {
        reject(new ApiError("Upload failed", xhr.status));
      }
    });

    xhr.addEventListener("error", () => reject(new ApiError("Upload failed", 0)));
    xhr.addEventListener("abort", () => reject(new ApiError("Upload cancelled", 0)));

    xhr.send(form);
  });
}

export async function ensureGuestSession() {
  const { data } = await authClient.getSession();
  if (data?.session) return;
  await authClient.signIn.anonymous();
}
