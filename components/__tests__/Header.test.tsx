import React from 'react'
import { render, screen } from '@testing-library/react'
import Header from '../Header'

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [{ id: '1', title: 'Test Tour' }],
    totalItems: 1,
    cart: [{ id: '1', title: 'Test Tour' }],
    isCartOpen: false,
    openCart: jest.fn(),
    closeCart: jest.fn(),
  }),
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
  }),
}))

jest.mock('@/components/shared/CurrencyLanguageSwitcher', () => {
  return function MockCurrencyLanguageSwitcher() {
    return <div data-testid="currency-language-switcher">Switcher</div>
  }
})

jest.mock('@/components/AuthModal', () => {
  return function MockAuthModal({ isOpen }: any) {
    if (!isOpen) return null
    return <div data-testid="auth-modal">Auth Modal</div>
  }
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useMotionValueEvent: jest.fn(),
  useInView: () => true,
}))

describe('Header', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ destinations: [], categories: [] }) })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render header component', () => {
    const { container } = render(<Header />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should render navigation buttons', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should render the currency/language switcher', () => {
    render(<Header />)
    expect(screen.getByTestId('currency-language-switcher')).toBeInTheDocument()
  })

  it('should have accessible buttons', () => {
    render(<Header />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
