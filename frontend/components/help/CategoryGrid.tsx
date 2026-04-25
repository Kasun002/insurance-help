import type { Category } from '@/types/api'
import CategoryTile from './CategoryTile'

interface CategoryGridProps {
  categories: Category[]
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">No categories available.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <CategoryTile key={cat.id} category={cat} />
      ))}
    </div>
  )
}
