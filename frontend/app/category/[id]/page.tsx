import { fetchCategory } from '@/lib/api/categories'
import { fetchArticles } from '@/lib/api/articles'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ArticleList from '@/components/help/ArticleList'

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{category!.name}</span>
      </nav>

      {/* Category header */}
      <div className="mb-8">
        <div className="text-4xl mb-2" aria-hidden="true">{category!.icon}</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{category!.name}</h1>
        <p className="text-slate-500 text-sm">{category!.description}</p>
      </div>

      {/* Article list with filter */}
      <ArticleList
        articles={articles!}
        subcategories={category!.subcategories ?? []}
        categoryIcon={category!.icon}
      />
    </div>
  )
}
