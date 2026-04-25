import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      {/* Hero skeleton */}
      <div className="text-center mb-12">
        <Skeleton className="h-9 w-80 mx-auto mb-3" />
        <Skeleton className="h-4 w-56 mx-auto mb-8" />
        <Skeleton className="h-12 max-w-xl mx-auto rounded-lg" />
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
      {/* Category grid skeleton */}
      <Skeleton className="h-4 w-32 mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
            <Skeleton className="h-8 w-8 mb-3 rounded" />
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-2/3 mb-3" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
