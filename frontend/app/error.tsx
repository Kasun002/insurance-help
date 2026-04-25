'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
