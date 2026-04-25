import Link from 'next/link'
import { Paperclip, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ArticleSummary } from '@/types/api'

interface ArticleCardProps {
  article: ArticleSummary
  categoryIcon?: string
}

export default function ArticleCard({ article, categoryIcon }: ArticleCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all"
    >
      <div className="flex items-start gap-3">
        {categoryIcon && (
          <span className="text-xl mt-0.5 shrink-0" aria-hidden="true">
            {categoryIcon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 mb-1 leading-snug line-clamp-2">
            {article.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-2">{article.summary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs font-normal">
              {article.subcategory.name}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {article.read_time_min} min read
            </span>
            {article.has_attachments && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Paperclip className="h-3 w-3" />
                PDF
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
