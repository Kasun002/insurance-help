import { useQuery } from '@tanstack/react-query'
import { searchArticles } from '@/lib/api/search'

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchArticles(query),
    enabled: query.length > 1,
    staleTime: 60_000,
  })
}
