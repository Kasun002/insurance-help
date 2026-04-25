import { Skeleton } from '@/components/ui/skeleton'

export default function ArticleLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-56 mb-6" />
      {/* Title */}
      <Skeleton className="h-8 w-4/5 mb-2" />
      <Skeleton className="h-8 w-2/3 mb-3" />
      {/* Meta */}
      <div className="flex gap-3 mb-8">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Content paragraphs */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      {/* Attachment card skeleton */}
      <div className="mt-8">
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  )
}
