const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body?.detail ?? `Error ${res.status}` };
    }

    const data: T = await res.json();
    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de red";
    return { data: null, error: message };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
