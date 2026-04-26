import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInput from '@/components/chat/ChatInput'

describe('ChatInput', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────────

  it('renders a textarea with the correct placeholder', () => {
    render(<ChatInput onSend={jest.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter to send/i)).toBeInTheDocument()
  })

  it('renders the send button', () => {
    render(<ChatInput onSend={jest.fn()} />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('send button is disabled when textarea is empty', () => {
    render(<ChatInput onSend={jest.fn()} />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('send button is enabled once text is typed', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={jest.fn()} />)
    await user.type(screen.getByRole('textbox'), 'Hello')
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled()
  })

  // ─── Disabled state ───────────────────────────────────────────────────────────

  it('disables textarea and send button when disabled=true', () => {
    render(<ChatInput onSend={jest.fn()} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('does not call onSend when disabled and Enter is pressed', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} disabled />)
    // Simulate value present but component is disabled
    const textarea = screen.getByRole('textbox')
    await user.click(textarea)
    await user.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  // ─── Sending ──────────────────────────────────────────────────────────────────

  it('calls onSend with the trimmed message when Enter is pressed', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), 'Hello world')
    await user.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello world')
  })

  it('calls onSend when the send button is clicked', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), 'Click test')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).toHaveBeenCalledWith('Click test')
  })

  it('clears the textarea after sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={jest.fn()} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello')
    await user.keyboard('{Enter}')
    expect(textarea).toHaveValue('')
  })

  it('does not call onSend for empty input', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not call onSend for whitespace-only input', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), '   ')
    await user.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  // ─── Shift+Enter ──────────────────────────────────────────────────────────────

  it('does not call onSend on Shift+Enter (newline instead)', async () => {
    const onSend = jest.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), 'Hello')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
  })

  // ─── Character limit ──────────────────────────────────────────────────────────

  it('does not allow input beyond 2000 characters', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={jest.fn()} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.type(textarea, 'a'.repeat(2100))
    expect(textarea.value.length).toBeLessThanOrEqual(2000)
  })

  it('shows remaining character count when within 200 of limit', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={jest.fn()} />)
    // Type 1850 chars: 2000 - 1850 = 150, which is < 200 → counter visible
    await user.type(screen.getByRole('textbox'), 'a'.repeat(1850))
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('does not show character counter when well below the limit', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={jest.fn()} />)
    await user.type(screen.getByRole('textbox'), 'Short message')
    // 2000 - 13 = 1987 remaining — not shown
    expect(screen.queryByText('1987')).not.toBeInTheDocument()
  })
})
