function getBase() {
  // In server components we need an absolute URL; in the browser the rewrite handles it
  if (typeof window === 'undefined') {
    return process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/api/v1`
      : 'http://localhost:8000/api/v1'
  }
  return '/api/v1'
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? body?.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}
