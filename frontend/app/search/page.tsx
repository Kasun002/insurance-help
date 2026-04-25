'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearch } from '@/hooks/useSearch'
import { useDebounce } from '@/hooks/useDebounce'
import { useChatStore } from '@/store/chatStore'
import SearchBar from '@/components/help/SearchBar'
import SearchResultCard from '@/components/help/SearchResultCard'
import EmptyState from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

function ResultSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

function AiSuggestionCard({ snippet, query }: { snippet: string; query: string }) {
  const openChat = useChatStore((s) => s.openChat)
  const teaser = snippet.length > 150 ? snippet.slice(0, 150) + '…' : snippet

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-yellow-300" />
        <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wide">
          AI-suggested answer
        </span>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed mb-4">{teaser}</p>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
        onClick={() => openChat()}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Ask AI for full details
      </Button>
    </div>
  )
}

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(initialQ)
  const debouncedInput = useDebounce(inputValue, 400)

  // Sync URL → input when navigating back/forward
  useEffect(() => {
    setInputValue(searchParams.get('q') ?? '')
  }, [searchParams])

  // Push URL when debounced input changes (and differs from current URL param)
  useEffect(() => {
    const trimmed = debouncedInput.trim()
    if (trimmed && trimmed !== initialQ) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }, [debouncedInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = initialQ // use committed URL param as query key
  const { data: results = [], isLoading, isFetching } = useSearch(q)

  const loading = isLoading || (isFetching && results.length === 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="shrink-0 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex-1">
          <SearchBar
            initialQuery={inputValue}
            autoFocus={false}
            placeholder="Search guides or ask a question..."
            onQueryChange={setInputValue}
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && <ResultSkeletons />}

      {/* Results */}
      {!loading && q.length > 1 && results.length > 0 && (
        <>
          {/* AI suggestion card */}
          <AiSuggestionCard snippet={results[0].snippet} query={q} />

          {/* Count */}
          <p className="text-sm text-slate-500 mb-4">
            {results.length} article{results.length !== 1 ? 's' : ''} found
          </p>

          {/* Result cards */}
          <div className="space-y-3">
            {results.map((result) => (
              <SearchResultCard key={result.article_id} result={result} query={q} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && q.length > 1 && results.length === 0 && (
        <EmptyState
          title={`No articles found for "${q}"`}
          description="Try different keywords, or ask our AI assistant directly."
          action={
            <AskAiButton query={q} />
          }
        />
      )}

      {/* No query yet */}
      {!loading && q.length <= 1 && (
        <p className="text-sm text-slate-400 text-center py-12">
          Type at least 2 characters to search.
        </p>
      )}
    </div>
  )
}

function AskAiButton({ query }: { query: string }) {
  const openChat = useChatStore((s) => s.openChat)
  return (
    <Button onClick={() => openChat()} className="gap-2">
      <MessageCircle className="h-4 w-4" />
      Ask AI about &ldquo;{query}&rdquo;
    </Button>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
