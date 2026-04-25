import { fetchArticle } from '@/lib/api/articles'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import Breadcrumb from '@/components/help/Breadcrumb'
import ArticleContent from '@/components/help/ArticleContent'
import ArticleAttachments from '@/components/help/ArticleAttachments'
import RelatedArticles from '@/components/help/RelatedArticles'
import AskAiCta from '@/components/help/AskAiCta'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone, MapPin } from 'lucide-react'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let article
  try {
    article = await fetchArticle(slug)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumb items={article!.breadcrumb} />

      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900 mb-3 leading-snug">{article!.title}</h1>
      <div className="flex items-center gap-3 flex-wrap mb-8">
        {article!.updated_at && (
          <span className="text-xs text-slate-400">Updated {article!.updated_at}</span>
        )}
        <span className="text-xs text-slate-400">{article!.read_time_min} min read</span>
        <Badge variant="secondary">{article!.category.name}</Badge>
        <Badge variant="outline">{article!.subcategory.name}</Badge>
      </div>

      {/* Main content */}
      <ArticleContent content_markdown={article!.content_markdown} />

      {/* Attachments */}
      <ArticleAttachments attachments={article!.attachments} />

      {/* Contact */}
      {(article!.contact?.phone || article!.contact?.postal_address) && (
        <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Contact</h2>
          {article!.contact.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <a href={`tel:${article!.contact.phone}`} className="hover:text-slate-900">
                {article!.contact.phone}
              </a>
            </div>
          )}
          {article!.contact.postal_address && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{article!.contact.postal_address}</span>
            </div>
          )}
        </div>
      )}

      {/* Related articles */}
      <Suspense fallback={<div className="mt-10 pt-6 border-t border-slate-200 space-y-3"><Skeleton className="h-4 w-32 mb-4" />{[1,2].map(i=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>}>
        <RelatedArticles ids={article!.related_article_ids} />
      </Suspense>

      {/* Ask AI CTA */}
      <AskAiCta articleId={article!.id} />
    </div>
  )
}
