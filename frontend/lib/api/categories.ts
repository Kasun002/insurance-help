import { apiFetch } from './client'
import type { Category, CategoryDetail, CategoriesResponse } from '@/types/api'

export async function fetchCategories(): Promise<Category[]> {
  const data = await apiFetch<CategoriesResponse>('/categories')
  return data.categories
}

export async function fetchCategory(id: string): Promise<CategoryDetail> {
  return apiFetch<CategoryDetail>(`/categories/${id}`)
}
