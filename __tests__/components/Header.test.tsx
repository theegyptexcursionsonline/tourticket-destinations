import React from 'react'
import { render, screen } from '@testing-library/react'
import Header from '@/components/Header'

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    totalItems: 0,
    cart: [],
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
  return function MockSwitcher() {
    return <div data-testid="switcher">Switcher</div>
  }
})

jest.mock('@/components/AuthModal', () => {
  return function MockAuthModal() { return null }
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

describe('Header (integration)', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ destinations: [], categories: [] }) })
    ) as jest.Mock
  })

  it('should render without crashing', () => {
    const { container } = render(<Header />)
    expect(container.firstChild).toBeTruthy()
  })

  it('should render the switcher', () => {
    render(<Header />)
    expect(screen.getByTestId('switcher')).toBeInTheDocument()
  })
})
