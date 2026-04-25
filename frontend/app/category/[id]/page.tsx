import { fetchCategory } from '@/lib/api/categories'
import { fetchArticles } from '@/lib/api/articles'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let category
  let articles
  try {
    ;[category, articles] = await Promise.all([
      fetchCategory(id),
      fetchArticles(id),
    ])
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{category!.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="text-4xl mb-2">{category!.icon}</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{category!.name}</h1>
          <p className="text-slate-500">{category!.description}</p>
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {articles!.map((article) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 mb-1 line-clamp-1">{article.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{article.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-slate-400">{article.read_time_min} min</span>
                  {article.has_attachments && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">PDF</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
