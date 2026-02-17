// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill Web Streams API (required by ai SDK / react-instantsearch)
const { TransformStream, ReadableStream, WritableStream } = require('stream/web')
if (!globalThis.TransformStream) globalThis.TransformStream = TransformStream
if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream
if (!globalThis.WritableStream) globalThis.WritableStream = WritableStream

// Mock TenantContext globally — nearly every component uses useTenant()
jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({
    tenant: {
      tenantId: 'default',
      name: 'Test Brand',
      domain: 'localhost',
      branding: {
        logo: '/logo.png',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        accentColor: '#F4A261',
        fontFamily: 'Inter',
      },
      contact: {
        email: 'test@example.com',
        phone: '+1 000 000 0000',
        whatsapp: '+10000000000',
        address: '123 Test St',
      },
      seo: {
        defaultTitle: 'Test Brand',
        defaultDescription: 'Test description',
        ogImage: '/og.jpg',
      },
    },
    isLoading: false,
    getLogo: () => '/logo.png',
    getSiteName: () => 'Test Brand',
    getPrimaryColor: () => '#E63946',
    getSecondaryColor: () => '#1D3557',
    getContactEmail: () => 'test@example.com',
    getContactPhone: () => '+1 000 000 0000',
    isFeatureEnabled: () => true,
  }),
  TenantProvider: ({ children }) => children,
}))

// Mock WishlistContext globally
jest.mock('@/contexts/WishlistContext', () => ({
  useWishlist: () => ({
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    isInWishlist: () => false,
    isWishlisted: () => false,
    toggleWishlist: jest.fn(),
  }),
  WishlistProvider: ({ children }) => children,
}))

// Mock react-markdown (ESM-only, doesn't work with Jest/jsdom)
jest.mock('react-markdown', () => {
  return ({ children }) => children
})
jest.mock('remark-gfm', () => () => {})
jest.mock('rehype-raw', () => () => {})
jest.mock('rehype-sanitize', () => () => {})

// Mock AdminTenantContext globally
jest.mock('@/contexts/AdminTenantContext', () => ({
  useAdminTenant: () => ({
    selectedTenantId: 'default',
    setSelectedTenantId: jest.fn(),
    tenants: [],
    isLoading: false,
    getTenantFilter: () => ({}),
  }),
  AdminTenantProvider: ({ children }) => children,
}))

const mockT = (key) => {
  const translations = {
    'header.explore': 'Explore',
    'header.destinations': 'Destinations',
    'header.activities': 'Activities',
    'header.specialOffers': 'Special Offers',
    'header.deals': 'View Deals',
    'header.search': 'Search',
    'header.cart': 'Cart',
    'header.login': 'Sign In',
    'header.signup': 'Sign Up',
    'offers.save': 'Save big on tours',
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
  }
  return translations[key] || key
}

const mockSettingsValue = {
  currency: 'USD',
  language: 'en',
  setCurrency: jest.fn(),
  setLanguage: jest.fn(),
  formatPrice: (price) => `$${Number(price || 0).toFixed(2)}`,
  selectedCurrency: { code: 'USD', symbol: '$', rate: 1 },
  selectedLanguage: { code: 'en', name: 'English', flag: '🇬🇧' },
  languages: [{ code: 'en', name: 'English', flag: '🇬🇧' }],
  currencies: [{ code: 'USD', symbol: '$', rate: 1 }],
  t: mockT,
}

// Mock SettingsContext globally
jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => mockSettingsValue,
  SettingsProvider: ({ children }) => children,
}))

// Mock useSettings hook globally
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettingsValue,
  usePriceFormatter: () => (price) => `$${Number(price || 0).toFixed(2)}`,
  useTranslation: () => ({ t: mockT }),
}))

// Polyfill Response if missing (jsdom)
if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.ok = this.status >= 200 && this.status < 300
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    json() { return Promise.resolve(JSON.parse(this.body)) }
    text() { return Promise.resolve(String(this.body)) }
  }
}

// Ensure global fetch exists for jsdom
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  )
}

// Mock AuthContext globally
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href}>{children}</a>
  }
})

// Guard: only set browser globals when running in jsdom (not node)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock IntersectionObserver (safe in both node and jsdom)
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }
}
