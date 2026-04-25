import { fetchArticle } from '@/lib/api/articles'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let article
  try {
    article = await fetchArticle(slug)
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex items-center gap-1 flex-wrap">
          {article!.breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-slate-700">{item.label}</Link>
              ) : (
                <span className="text-slate-800 font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{article!.title}</h1>
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-6">
          {article!.updated_at && <span>Updated {article!.updated_at}</span>}
          <span>{article!.read_time_min} min read</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{article!.category.name}</span>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none mb-8 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">
          {article!.content_markdown}
        </div>

        {/* Attachments */}
        {article!.attachments.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-slate-800 mb-3">Downloads</h2>
            <div className="space-y-2">
              {article!.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📎</span>
                    <span className="text-sm text-slate-700">{att.label}</span>
                  </div>
                  <span className="text-xs text-slate-400">Download</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(article!.contact?.phone || article!.contact?.postal_address) && (
          <div className="mb-8 bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
            <h2 className="font-semibold text-slate-800 mb-2">Contact</h2>
            {article!.contact.phone && <p>Phone: {article!.contact.phone}</p>}
            {article!.contact.postal_address && <p>{article!.contact.postal_address}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
