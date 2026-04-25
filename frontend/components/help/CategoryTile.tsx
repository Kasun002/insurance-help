import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { Category } from '@/types/api'

interface CategoryTileProps {
  category: Category
}

export default function CategoryTile({ category }: CategoryTileProps) {
  return (
    <Link href={`/category/${category.id}`}>
      <Card className="h-full hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
        <CardContent className="p-5">
          <div className="text-3xl mb-3" aria-hidden="true">
            {category.icon}
          </div>
          <h3 className="font-semibold text-slate-900 mb-1 leading-snug">{category.name}</h3>
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{category.description}</p>
          <span className="text-xs text-slate-400">
            {category.article_count} article{category.article_count !== 1 ? 's' : ''}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
