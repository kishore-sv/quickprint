import { authClient } from "@/lib/auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

async function getSessionToken(): Promise<string | null> {
  const { data } = await authClient.getSession();
  return data?.session?.token ?? null;
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

async function buildAuthHeaders(extra?: HeadersInit): Promise<Headers> {
  const headers = new Headers(extra);
  const token = await getSessionToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { data: sessionData } = await authClient.getSession();
  if (!sessionData?.session) {
    throw new ApiError("Not authenticated", 401, "UNAUTHORIZED");
  }

  const headers = await buildAuthHeaders(options.headers);

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

export async function uploadFile(
  file: File,
  saveForLater: boolean,
  onProgress?: (percent: number) => void
): Promise<import("@/lib/types").SavedFile> {
  const { data: sessionData } = await authClient.getSession();
  if (!sessionData?.session) throw new ApiError("Not authenticated", 401);

  const token = sessionData.session.token;
  const form = new FormData();
  form.append("file", file);
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
