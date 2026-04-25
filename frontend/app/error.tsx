'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
      <p className="text-slate-500 text-sm">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
