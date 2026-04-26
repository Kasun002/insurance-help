import React from 'react'
import { render, screen } from '@testing-library/react'
import SearchResultCard from '@/components/help/SearchResultCard'
import { searchResultFixture } from '../../fixtures'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('SearchResultCard', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────

  it('renders the article title', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getByText(searchResultFixture.title)).toBeInTheDocument()
  })

  it('renders the category name', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getAllByText('Claims').length).toBeGreaterThan(0)
  })

  it('renders the subcategory name in the breadcrumb', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getByText('Life Insurance Claims')).toBeInTheDocument()
  })

  it('renders the snippet text when provided', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getByText(searchResultFixture.snippet)).toBeInTheDocument()
  })

  it('does not render a snippet element when snippet is absent', () => {
    const result = { ...searchResultFixture, snippet: '' }
    const { container } = render(<SearchResultCard result={result} query="" />)
    const snippetEl = container.querySelector('p')
    expect(snippetEl).not.toBeInTheDocument()
  })

  it('links to /article/:slug', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/article/${searchResultFixture.slug}`
    )
  })

  it('shows read time', () => {
    render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(screen.getByText(`${searchResultFixture.read_time_min} min read`)).toBeInTheDocument()
  })

  // ─── HighlightedSnippet — basic highlighting ──────────────────────────────────

  it('wraps matching terms in <mark> elements', () => {
    const { container } = render(
      <SearchResultCard result={searchResultFixture} query="Life Insurance" />
    )
    const marks = container.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
    const highlighted = Array.from(marks).map((m) => m.textContent).join(' ')
    expect(highlighted.toLowerCase()).toMatch(/life|insurance/)
  })

  it('produces no <mark> elements when query is empty', () => {
    const { container } = render(<SearchResultCard result={searchResultFixture} query="" />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })

  it('produces no <mark> elements when query is whitespace only', () => {
    const { container } = render(<SearchResultCard result={searchResultFixture} query="   " />)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })

  it('highlighting is case-insensitive', () => {
    const { container } = render(<SearchResultCard result={searchResultFixture} query="CLAIM" />)
    const marks = container.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
  })

  it('highlights multi-word queries independently', () => {
    const result = { ...searchResultFixture, title: 'Life and Health Insurance Guide' }
    const { container } = render(<SearchResultCard result={result} query="life health" />)
    const marks = container.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(1) // at least "Life" and "Health"
  })

  // ─── HighlightedSnippet — edge cases ─────────────────────────────────────────

  it('does not throw when query contains regex special characters', () => {
    const result = { ...searchResultFixture, title: 'Cost (in SGD) for claims' }
    expect(() =>
      render(<SearchResultCard result={result} query="(in SGD)" />)
    ).not.toThrow()
  })

  it('does not produce empty <mark> elements', () => {
    const { container } = render(
      <SearchResultCard result={searchResultFixture} query="claim" />
    )
    container.querySelectorAll('mark').forEach((m) => {
      expect(m.textContent).not.toBe('')
    })
  })

  it('stateful lastIndex bug is fixed — marks present on every re-render', () => {
    const { container, rerender } = render(
      <SearchResultCard result={searchResultFixture} query="claim" />
    )
    const countFirst = container.querySelectorAll('mark').length

    rerender(<SearchResultCard result={searchResultFixture} query="claim" />)
    const countSecond = container.querySelectorAll('mark').length

    rerender(<SearchResultCard result={searchResultFixture} query="claim" />)
    const countThird = container.querySelectorAll('mark').length

    expect(countFirst).toBeGreaterThan(0)
    expect(countSecond).toBe(countFirst)
    expect(countThird).toBe(countFirst)
  })

  it('handles a query that does not match anything gracefully', () => {
    const { container } = render(
      <SearchResultCard result={searchResultFixture} query="zzzzzz" />
    )
    // Title is still shown
    expect(screen.getByText(searchResultFixture.title)).toBeInTheDocument()
    // No marks
    expect(container.querySelectorAll('mark')).toHaveLength(0)
  })
})
