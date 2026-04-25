const SESSION_KEY = 'insurehelp_session_id'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateUUID()
  const existing = localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const id = generateUUID()
  localStorage.setItem(SESSION_KEY, id)
  return id
}

export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
}
