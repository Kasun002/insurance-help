import React from 'react'
import { render, screen } from '@testing-library/react'
import MessageBubble from '@/components/chat/MessageBubble'
import type { ChatMessage } from '@/types/api'

// Mock ReactMarkdown so tests don't need ESM transform infrastructure.
// The mock renders a wrapper <div data-testid="markdown"> containing the raw text,
// letting us assert that content IS passed and IS rendered.
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }))
jest.mock('@/components/chat/SourceCitation', () => ({
  __esModule: true,
  default: ({ sources }: { sources: unknown[] }) => (
    <div data-testid="source-citation">{sources.length} sources</div>
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const userMsg: ChatMessage = {
  id: 'u1',
  session_id: 's1',
  role: 'user',
  content: 'Hello there',
  created_at: '',
}

const assistantMsg: ChatMessage = {
  id: 'a1',
  session_id: 's1',
  role: 'assistant',
  content: 'Here is my **answer**.',
  created_at: '',
}

const assistantMsgWithSources: ChatMessage = {
  ...assistantMsg,
  sources: [
    {
      article_id: 'art-1',
      slug: 'slug',
      title: 'Title',
      section: 'intro',
      relevance: 0.9,
    },
  ],
}

const errorMsg: ChatMessage = {
  id: 'e1',
  session_id: 's1',
  role: 'assistant',
  content: 'Sorry, something went wrong. Please try again.',
  created_at: '',
  error: true,
}

// ─── User bubbles ─────────────────────────────────────────────────────────────

describe('user message', () => {
  it('renders plain text content (not via markdown)', () => {
    render(<MessageBubble message={userMsg} isLastMessage={false} isGenerating={false} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
  })

  it('applies user bubble styling (dark background)', () => {
    const { container } = render(
      <MessageBubble message={userMsg} isLastMessage={false} isGenerating={false} />
    )
    expect(container.querySelector('.bg-slate-900')).toBeInTheDocument()
  })

  it('aligns user message to the right', () => {
    const { container } = render(
      <MessageBubble message={userMsg} isLastMessage={false} isGenerating={false} />
    )
    expect(container.querySelector('.justify-end')).toBeInTheDocument()
  })

  it('does not render source citations for user messages', () => {
    render(<MessageBubble message={userMsg} isLastMessage={false} isGenerating={false} />)
    expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument()
  })
})

// ─── Assistant bubbles ───────────────────────────────────────────────────────

describe('assistant message', () => {
  it('renders content via ReactMarkdown', () => {
    render(<MessageBubble message={assistantMsg} isLastMessage={false} isGenerating={false} />)
    expect(screen.getByTestId('markdown')).toHaveTextContent("Here is my **answer**.")
  })

  it('applies assistant bubble styling (white border)', () => {
    const { container } = render(
      <MessageBubble message={assistantMsg} isLastMessage={false} isGenerating={false} />
    )
    expect(container.querySelector('.bg-white')).toBeInTheDocument()
  })

  it('aligns assistant message to the left', () => {
    const { container } = render(
      <MessageBubble message={assistantMsg} isLastMessage={false} isGenerating={false} />
    )
    expect(container.querySelector('.justify-start')).toBeInTheDocument()
  })

  it('renders source citations when sources are present', () => {
    render(
      <MessageBubble message={assistantMsgWithSources} isLastMessage={false} isGenerating={false} />
    )
    expect(screen.getByTestId('source-citation')).toBeInTheDocument()
    expect(screen.getByTestId('source-citation')).toHaveTextContent('1 sources')
  })

  it('does not render source citations when sources array is empty', () => {
    const msg = { ...assistantMsg, sources: [] }
    render(<MessageBubble message={msg} isLastMessage={false} isGenerating={false} />)
    expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument()
  })

  it('does not render source citations when sources is undefined', () => {
    render(<MessageBubble message={assistantMsg} isLastMessage={false} isGenerating={false} />)
    expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument()
  })
})

// ─── Error bubbles ────────────────────────────────────────────────────────────

describe('error message', () => {
  it('renders the error message content', () => {
    render(<MessageBubble message={errorMsg} isLastMessage={false} isGenerating={false} />)
    expect(
      screen.getByText('Sorry, something went wrong. Please try again.')
    ).toBeInTheDocument()
  })

  it('applies error styling (red background)', () => {
    const { container } = render(
      <MessageBubble message={errorMsg} isLastMessage={false} isGenerating={false} />
    )
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
  })

  it('does not render source citations on error messages', () => {
    const msgWithSources = { ...errorMsg, sources: assistantMsgWithSources.sources }
    render(
      <MessageBubble message={msgWithSources} isLastMessage={false} isGenerating={false} />
    )
    expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument()
  })
})

// ─── Thinking indicator ───────────────────────────────────────────────────────

describe('thinking indicator', () => {
  it('shows "Thinking" dots when last user message and isGenerating=true', () => {
    render(<MessageBubble message={userMsg} isLastMessage={true} isGenerating={true} />)
    expect(screen.getByText('Thinking')).toBeInTheDocument()
  })

  it('does NOT show thinking dots when not the last message', () => {
    render(<MessageBubble message={userMsg} isLastMessage={false} isGenerating={true} />)
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument()
  })

  it('does NOT show thinking dots when isGenerating=false', () => {
    render(<MessageBubble message={userMsg} isLastMessage={true} isGenerating={false} />)
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument()
  })

  it('does NOT show thinking dots for assistant messages (even if last + generating)', () => {
    render(<MessageBubble message={assistantMsg} isLastMessage={true} isGenerating={true} />)
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument()
  })

  it('does NOT show thinking dots for error messages', () => {
    const errAsLast = { ...errorMsg }
    render(<MessageBubble message={errAsLast} isLastMessage={true} isGenerating={true} />)
    expect(screen.queryByText('Thinking')).not.toBeInTheDocument()
  })
})
