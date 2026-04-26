function getBase() {
  // In server components we need an absolute URL; in the browser the rewrite handles it
  if (typeof window === 'undefined') {
    return process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/v1`
      : 'http://localhost:8000/api/v1'
  }
  return '/api/v1'
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: initHeaders, ...restInit } = init ?? {}
  const res = await fetch(`${getBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...initHeaders },
    ...restInit,
  })
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? ''
    let message = `HTTP ${res.status}`
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}))
      // FastAPI 422 validation errors: { detail: [{ msg, loc, type, ... }] }
      if (Array.isArray(body?.detail)) {
        message = body.detail
          .map((e: { msg?: string }) => e.msg ?? JSON.stringify(e))
          .join(', ')
      } else {
        const raw = body?.error?.message ?? body?.error?.detail ?? body?.detail ?? body?.message
        if (raw != null) {
          message = typeof raw === 'string' ? raw : JSON.stringify(raw)
        }
      }
    }
    throw new ApiError(message, res.status)
  }
  return res.json()
}
