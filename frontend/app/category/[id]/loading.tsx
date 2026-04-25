import { Skeleton } from '@/components/ui/skeleton'

export default function CategoryLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-32 mb-6" />
      {/* Header */}
      <Skeleton className="h-10 w-10 mb-2 rounded" />
      <Skeleton className="h-7 w-48 mb-1" />
      <Skeleton className="h-4 w-72 mb-8" />
      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-4 w-24 mb-4" />
      {/* Article rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
            <Skeleton className="h-7 w-7 rounded shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
