import { fetchCategories } from '@/lib/api/categories'
import type { Category } from '@/types/api'
import SearchBar from '@/components/help/SearchBar'
import PopularQuestions from '@/components/help/PopularQuestions'
import CategoryGrid from '@/components/help/CategoryGrid'

export default async function HomePage() {
  let categories: Category[] = []
  try {
    categories = await fetchCategories()
  } catch {
    // Gracefully degrade if backend unavailable
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-14 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            How can we help you today?
          </h1>
          <p className="text-slate-500 mb-8 text-sm sm:text-base">
            Browse insurance guides or chat with our AI assistant for instant answers.
          </p>
          <div className="max-w-xl mx-auto mb-5">
            <SearchBar autoFocus />
          </div>
          <PopularQuestions />
        </div>
      </section>

      {/* Category browse */}
      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <h2 className="text-base font-semibold text-slate-500 uppercase tracking-wide mb-5">
          Browse by topic
        </h2>
        <CategoryGrid categories={categories} />
      </section>
    </>
  )
}
