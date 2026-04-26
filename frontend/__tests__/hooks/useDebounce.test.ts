import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('returns the initial value immediately without waiting', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )
    rerender({ value: 'world' })
    act(() => jest.advanceTimersByTime(299))
    expect(result.current).toBe('hello')
  })

  it('updates to the new value exactly at the delay boundary', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    )
    rerender({ value: 'world' })
    act(() => jest.advanceTimersByTime(300))
    expect(result.current).toBe('world')
  })

  it('resets the timer on each new value — only the last wins', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )
    rerender({ value: 'ab' })
    act(() => jest.advanceTimersByTime(100)) // 100ms elapsed
    rerender({ value: 'abc' })
    act(() => jest.advanceTimersByTime(100)) // 200ms total, timer reset
    expect(result.current).toBe('a') // still the original value
    act(() => jest.advanceTimersByTime(300)) // 300ms after last change
    expect(result.current).toBe('abc')
  })

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    )
    rerender({ value: 42 })
    act(() => jest.advanceTimersByTime(200))
    expect(result.current).toBe(42)
  })

  it('works with object references (shallow equality)', () => {
    const obj1 = { q: 'hello' }
    const obj2 = { q: 'world' }
    const { result, rerender } = renderHook(
      ({ value }: { value: typeof obj1 }) => useDebounce(value, 100),
      { initialProps: { value: obj1 } }
    )
    rerender({ value: obj2 })
    act(() => jest.advanceTimersByTime(100))
    expect(result.current).toBe(obj2)
  })

  it('handles delay of 0', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 0),
      { initialProps: { value: 'first' } }
    )
    rerender({ value: 'second' })
    act(() => jest.advanceTimersByTime(0))
    expect(result.current).toBe('second')
  })

  it('clears the timer on unmount — no state update after unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    )
    rerender({ value: 'second' })
    unmount()
    // Advancing time should not cause React "state update on unmounted component" warning
    expect(() => act(() => jest.advanceTimersByTime(300))).not.toThrow()
    expect(result.current).toBe('first') // last value before unmount
  })
})
