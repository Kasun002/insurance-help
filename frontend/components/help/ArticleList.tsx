'use client'

import { useState } from 'react'
import type { ArticleSummary, Subcategory } from '@/types/api'
import ArticleCard from './ArticleCard'

interface ArticleListProps {
  articles: ArticleSummary[]
  subcategories: Subcategory[]
  categoryIcon?: string
}

export default function ArticleList({ articles, subcategories, categoryIcon }: ArticleListProps) {
  const [active, setActive] = useState<string>('all')

  const filtered =
    active === 'all' ? articles : articles.filter((a) => a.subcategory.id === active)

  return (
    <div>
      {/* Subcategory filter bar */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by subcategory">
          <button
            onClick={() => setActive('all')}
            className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
              active === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActive(sub.id)}
              className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                active === sub.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-slate-500 mb-4">
        {filtered.length} article{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Article list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No articles in this subcategory.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} categoryIcon={categoryIcon} />
          ))}
        </div>
      )}
    </div>
  )
}
