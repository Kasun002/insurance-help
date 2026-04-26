import type {
  Category,
  CategoryDetail,
  ArticleSummary,
  ArticleDetail,
  SearchResult,
  ChatSession,
  ChatMessage,
} from '@/types/api'
import type { ChatMessageResponse } from '@/lib/api/chat'

// ─── Categories ──────────────────────────────────────────────────────────────

export const categoryFixture: Category = {
  id: 'cat-1',
  name: 'Claims',
  icon: '📋',
  description: 'Everything about filing insurance claims',
  article_count: 10,
  subcategory_count: 3,
}

export const subcategoryFixture = {
  id: 'sub-1',
  name: 'Life Insurance Claims',
  article_count: 5,
}

export const categoryDetailFixture: CategoryDetail = {
  ...categoryFixture,
  subcategories: [subcategoryFixture],
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export const articleSummaryFixture: ArticleSummary = {
  id: 'art-1',
  slug: 'how-to-file-a-claim',
  title: 'How to File a Life Insurance Claim',
  summary: 'Step-by-step guide for filing life insurance claims in Singapore',
  subcategory: subcategoryFixture,
  read_time_min: 3,
  has_attachments: false,
  updated_at: '2024-01-15',
}

export const articleDetailFixture: ArticleDetail = {
  ...articleSummaryFixture,
  content_markdown: '## Overview\n\nThis is the article content.\n\n- Step 1\n- Step 2',
  category: categoryFixture,
  breadcrumb: [
    { label: 'Home', href: '/' },
    { label: 'Claims', href: '/category/cat-1' },
    { label: 'How to File a Life Insurance Claim' },
  ],
  steps: [{ order: 1, title: 'Notify insurer', body: 'Call your insurer within 30 days.' }],
  document_checklists: [],
  attachments: [],
  contact: { phone: '+65 6225 0608' },
  related_article_ids: ['art-2'],
  source_url: 'https://lia.org.sg',
  tags: ['claims', 'life-insurance'],
}

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchResultFixture: SearchResult = {
  article_id: 'art-1',
  slug: 'how-to-file-a-claim',
  title: 'How to File a Life Insurance Claim',
  snippet: 'Step-by-step guide for filing life insurance claims in Singapore',
  matched_section: 'overview',
  category: { id: 'cat-1', name: 'Claims' },
  subcategory: { id: 'sub-1', name: 'Life Insurance Claims' },
  score: 0.95,
  read_time_min: 3,
}

export const searchResultFixture2: SearchResult = {
  article_id: 'art-2',
  slug: 'claim-rejection-reasons',
  title: 'Why Claims Get Rejected',
  snippet: 'Common reasons insurers reject claims and how to avoid them',
  matched_section: 'reasons',
  category: { id: 'cat-1', name: 'Claims' },
  subcategory: { id: 'sub-2', name: 'Claim Disputes' },
  score: 0.78,
  read_time_min: 5,
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatSessionFixture: ChatSession = {
  session_id: 'sess-abc123',
  created_at: '2024-01-15T10:00:00Z',
}

export const chatMessageResponseFixture: ChatMessageResponse = {
  message_id: 'msg-001',
  session_id: 'sess-abc123',
  role: 'assistant',
  content: '**Here is what I found** about your claim.',
  sources: [
    {
      article_id: 'art-1',
      slug: 'how-to-file-a-claim',
      title: 'How to File a Life Insurance Claim',
      section: 'overview',
      relevance: 0.9,
    },
  ],
  created_at: '2024-01-15T10:01:00Z',
}

export const userChatMessageFixture: ChatMessage = {
  id: 'local_1',
  session_id: 'sess-abc123',
  role: 'user',
  content: 'How do I file a claim?',
  created_at: '2024-01-15T10:00:30Z',
}

export const assistantChatMessageFixture: ChatMessage = {
  id: 'msg-001',
  session_id: 'sess-abc123',
  role: 'assistant',
  content: '**Here is what I found** about your claim.',
  sources: chatMessageResponseFixture.sources,
  created_at: chatMessageResponseFixture.created_at,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a mock Response object for use with `jest.spyOn(global, 'fetch')` */
export function mockResponse(
  status: number,
  body: unknown,
  contentType = 'application/json'
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}
