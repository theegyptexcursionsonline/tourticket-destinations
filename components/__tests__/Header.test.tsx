import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Header from '../Header'

const mockUseTenant = jest.fn()

jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => mockUseTenant(),
}))

jest.mock('next/image', () => {
  return function MockNextImage({ alt, src, fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: any) {
    return <img alt={alt} src={src} {...props} />
  }
})

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
  const renderStaticHeader = () =>
    render(<Header initialDestinations={[]} initialCategories={[]} />)

  beforeEach(() => {
    mockUseTenant.mockReturnValue({
      tenant: {
        tenantId: 'default',
        name: 'Test Brand',
        domain: 'localhost',
      },
      getLogo: () => '/logo.png',
      getSiteName: () => 'Test Brand',
      isFeatureEnabled: () => true,
    })
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/destinations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        })
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    }) as jest.Mock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render header component', () => {
    const { container } = renderStaticHeader()
    expect(container.firstChild).toBeTruthy()
  })

  it('should render navigation buttons', () => {
    renderStaticHeader()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should render the currency/language switcher', () => {
    renderStaticHeader()
    expect(screen.getByTestId('currency-language-switcher')).toBeInTheDocument()
  })

  it('should have accessible buttons', () => {
    renderStaticHeader()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('falls back to tenant-specific navigation when the API returns default-scoped content', async () => {
    mockUseTenant.mockReturnValue({
      tenant: {
        tenantId: 'el-gouna',
        name: 'El Gouna Excursions Online',
        domain: 'localhost',
      },
      getLogo: () => '/tenants/el-gouna/logo.png',
      getSiteName: () => 'El Gouna Excursions Online',
      isFeatureEnabled: () => true,
    })

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/destinations')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                { _id: 'default-dest', name: 'Hurghada', slug: 'hurghada', image: '/hurghada.jpg', tenantId: 'default' },
              ],
            }),
        })
      }

      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                { _id: 'default-cat', name: 'Boat Trips', slug: 'boat-trips', tenantId: 'default' },
              ],
            }),
        })
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    }) as jest.Mock

    render(<Header startSolid />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/destinations?tenantId=el-gouna&locale=en')
      expect(global.fetch).toHaveBeenCalledWith('/api/categories?featured=true&tenantId=el-gouna&locale=en')
    })

    fireEvent.click(screen.getByRole('button', { name: /explore/i }))

    expect(await screen.findByText('ABU TIG MARINA')).toBeInTheDocument()
    expect(screen.getByText('Kitesurfing & Watersports')).toBeInTheDocument()
    expect(screen.getByText('ABU TIG MARINA').closest('a')).toHaveAttribute(
      'href',
      '/search?q=Abu%20Tig%20Marina'
    )
    expect(screen.getByText('Kitesurfing & Watersports').closest('a')).toHaveAttribute(
      'href',
      '/search?q=Kitesurfing%20%26%20Watersports'
    )
    expect(screen.queryByText('HURGHADA')).not.toBeInTheDocument()
  })
})
