export interface Category {
  id: string
  name: string
  icon: string
  description: string
  article_count: number
  subcategory_count: number
}

export interface Subcategory {
  id: string
  name: string
  article_count: number
}

export interface CategoryDetail extends Category {
  subcategories: Subcategory[]
}

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  summary: string
  subcategory: Subcategory
  read_time_min: number
  has_attachments: boolean
  updated_at: string
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface Step {
  order: number
  title: string
  body: string
}

export interface Checklist {
  scenario: string
  documents: string[]
}

export interface Attachment {
  type: string
  label: string
  url: string
  size_kb?: number
}

export interface Contact {
  phone?: string
  postal_address?: string
  email?: string
}

export interface ArticleDetail extends ArticleSummary {
  content_markdown: string
  category: Category
  breadcrumb: BreadcrumbItem[]
  steps: Step[]
  document_checklists: Checklist[]
  attachments: Attachment[]
  contact: Contact
  related_article_ids: string[]
  source_url: string
  tags: string[]
}

export interface SearchResult {
  article_id: string
  slug: string
  title: string
  snippet: string
  matched_section: string
  category: Pick<Category, 'id' | 'name'>
  subcategory: Pick<Subcategory, 'id' | 'name'>
  score: number
  read_time_min: number
}

export interface ChatSession {
  session_id: string
  created_at: string
  seed_article?: Pick<ArticleSummary, 'id' | 'title'>
}

export interface SourceCitation {
  article_id: string
  slug: string
  title: string
  section: string
  relevance: number
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[]
  created_at: string
  error?: boolean
}

export interface CategoriesResponse {
  categories: Category[]
}

export interface ArticlesResponse {
  articles: ArticleSummary[]
  total: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}
