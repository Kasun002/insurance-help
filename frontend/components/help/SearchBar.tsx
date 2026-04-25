'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchBarProps {
  initialQuery?: string
  placeholder?: string
  autoFocus?: boolean
}

export default function SearchBar({
  initialQuery = '',
  placeholder = 'Search guides or ask a question...',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
          className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        className="bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shrink-0"
      >
        Search
      </button>
    </form>
  )
}
