import Link from 'next/link'
import type { BreadcrumbItem } from '@/types/api'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-500 flex items-center gap-1.5 flex-wrap mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-700 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium line-clamp-1">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
