'use client'

import Link from 'next/link'

export default function ArticleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-slate-700 font-medium mb-2">Failed to load article</p>
      <p className="text-sm text-slate-500 mb-5">Check your connection and try again.</p>
      <div className="flex justify-center gap-3">
        <button
          onClick={reset}
          className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
        <Link href="/" className="text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  )
}
