import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SearchResult } from '@/types/api'

interface SearchResultCardProps {
  result: SearchResult
  query: string
}

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  const pattern = new RegExp(`(${terms.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-100 text-yellow-900 font-medium rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function SearchResultCard({ result, query }: SearchResultCardProps) {
  return (
    <Link
      href={`/article/${result.slug}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all group"
    >
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
        <span>{result.category.name}</span>
        <ChevronRight className="h-3 w-3" />
        <span>{result.subcategory.name}</span>
      </div>

      {/* Title */}
      <h3 className="font-medium text-slate-900 mb-1.5 group-hover:text-slate-700 leading-snug">
        <HighlightedSnippet text={result.title} query={query} />
      </h3>

      {/* Snippet */}
      {result.snippet && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-2.5">
          <HighlightedSnippet text={result.snippet} query={query} />
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs font-normal">
          {result.category.name}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          {result.read_time_min} min read
        </span>
      </div>
    </Link>
  )
}
