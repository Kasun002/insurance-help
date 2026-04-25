import { fetchCategories } from '@/lib/api/categories'
import type { Category } from '@/types/api'
import Link from 'next/link'

export default async function HomePage() {
  let categories: Category[] = []
  try {
    categories = await fetchCategories()
  } catch {
    // Show empty state if backend not available
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            How can we help you today?
          </h1>
          <p className="text-slate-500 mb-8">Browse guides or ask our AI assistant</p>
          <div className="max-w-xl mx-auto flex gap-2">
            <input
              type="search"
              placeholder="Search guides or ask a question..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
            <button className="bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
              Search
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Travel claim', 'Car accident', 'Lost luggage', 'Change payment', 'CareShield claim'].map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-lg font-semibold text-slate-700 mb-6">Browse by topic</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{cat.name}</h3>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{cat.description}</p>
              <span className="text-xs text-slate-400">{cat.article_count} articles</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
