import '@testing-library/jest-dom'

// Spy on localStorage methods so tests can assert calls
beforeEach(() => {
  jest.spyOn(Storage.prototype, 'getItem')
  jest.spyOn(Storage.prototype, 'setItem')
  jest.spyOn(Storage.prototype, 'removeItem')
  jest.spyOn(Storage.prototype, 'clear')
})

afterEach(() => {
  localStorage.clear()
  jest.restoreAllMocks()
})
