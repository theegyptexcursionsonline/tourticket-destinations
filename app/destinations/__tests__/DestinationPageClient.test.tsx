import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationPageClient from '../[slug]/DestinationPageClient'
import { Destination, Tour, Category } from '@/types'

// Mock the hooks and components
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

jest.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: jest.fn(),
  }),
}))

jest.mock('@/hooks/useSearch', () => ({
  useRecentSearches: () => ({
    addSearchTerm: jest.fn(),
  }),
}))

jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>
  }
})

jest.mock('@/components/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer</footer>
  }
})

jest.mock('@/components/BookingSidebar', () => {
  return function MockBookingSidebar({ isOpen, onClose }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="booking-sidebar">
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

jest.mock('@/components/SearchModel', () => {
  return function MockSearchModal({ onClose, onSearch }: any) {
    return (
      <div data-testid="search-modal">
        <button onClick={onClose}>Close</button>
        <input
          placeholder="Search"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    )
  }
})

describe('DestinationPageClient', () => {
  const mockDestination = {
    _id: '1',
    name: 'Cairo',
    slug: 'cairo',
    country: 'Egypt',
    image: '/images/cairo.jpg',
    images: ['/images/cairo1.jpg', '/images/cairo2.jpg'],
    description: 'The vibrant capital of Egypt',
    longDescription: 'Cairo is a sprawling metropolis with ancient history',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    currency: 'EGP',
    timezone: 'EET',
    bestTimeToVisit: 'October to April',
    highlights: ['Pyramids', 'Egyptian Museum', 'Khan el-Khalili'],
    thingsToDo: ['Visit pyramids', 'Nile cruise'],
    localCustoms: ['Dress modestly'],
    visaRequirements: 'Visa on arrival available',
    languagesSpoken: ['Arabic', 'English'],
    emergencyNumber: '122',
    averageTemperature: { summer: '35°C', winter: '20°C' },
    climate: 'Hot desert climate',
    weatherWarnings: ['Very hot in summer'],
    featured: true,
    isPublished: true,
    metaTitle: 'Visit Cairo',
    metaDescription: 'Explore the wonders of Cairo',
    tags: ['ancient', 'pyramids'],
    tourCount: 50,
  } as Destination

  const mockTours = [
    {
      _id: '1',
      title: 'Pyramids Tour',
      slug: 'pyramids-tour',
      image: '/images/pyramids.jpg',
      description: 'Visit the pyramids',
      duration: '4 hours',
      rating: 4.9,
      bookings: 5000,
      originalPrice: 100,
      discountPrice: 80,
      isFeatured: true,
      destination: '1',
      category: { _id: 'cat1', name: 'Historical', slug: 'historical' },
      tags: ['popular'],
    },
    {
      _id: '2',
      title: 'Egyptian Museum Tour',
      slug: 'museum-tour',
      image: '/images/museum.jpg',
      description: 'Explore ancient artifacts',
      duration: '3 hours',
      rating: 4.8,
      bookings: 3000,
      originalPrice: 60,
      discountPrice: 50,
      isFeatured: false,
      destination: '1',
      category: { _id: 'cat1', name: 'Historical', slug: 'historical' },
      tags: [],
    },
  ] as Tour[]

  const mockCategories: Category[] = [
    {
      _id: 'cat1',
      name: 'Historical',
      slug: 'historical',
      icon: '🏛️',
      description: 'Historical tours',
    },
    {
      _id: 'cat2',
      name: 'Adventure',
      slug: 'adventure',
      icon: '⛰️',
      description: 'Adventure tours',
    },
  ]

  const defaultProps = {
    destination: mockDestination,
    destinationTours: mockTours,
    allCategories: mockCategories,
    reviews: [],
    relatedDestinations: [],
  }

  describe('Component Rendering', () => {
    it('should render header and footer', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should render destination name in hero', () => {
      render(<DestinationPageClient {...defaultProps} />)

      // The destination name is split across elements
      expect(screen.getByText('Cairo')).toBeInTheDocument()
    })

    it('should render destination description', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('The vibrant capital of Egypt')).toBeInTheDocument()
    })
  })

  describe('Hero Section', () => {
    it('should display tour count', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/2\+ Tours/i)).toBeInTheDocument()
    })

    it('should display rating', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('4.8/5 Rating')).toBeInTheDocument()
    })

    it('should display traveler count', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('50K+ Travelers')).toBeInTheDocument()
    })

    it('should open search modal when search bar is clicked', async () => {
      const user = userEvent.setup()
      render(<DestinationPageClient {...defaultProps} />)

      // Find the search button by its class/structure
      const searchButtons = screen.getAllByRole('button')
      const searchButton = searchButtons.find(btn =>
        btn.querySelector('.lucide-search')
      )

      if (searchButton) {
        await user.click(searchButton)

        await waitFor(() => {
          expect(screen.getByTestId('search-modal')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Stats Section', () => {
    it('should display destination statistics', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/2\+ Tours/i)).toBeInTheDocument()
      expect(screen.getByText('50K+')).toBeInTheDocument()
      expect(screen.getByText('Happy Travelers')).toBeInTheDocument()
    })
  })

  describe('Quick Info Section', () => {
    it('should display best time to visit', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText('October to April')[0]).toBeInTheDocument()
    })

    it('should display currency', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText('EGP')[0]).toBeInTheDocument()
    })

    it('should display timezone', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('EET')).toBeInTheDocument()
    })

    it('should display available tours count', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('2 experiences')).toBeInTheDocument()
    })
  })

  describe('Featured Tours Section', () => {
    it('should render featured tours when available', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText(/Best Deals in Cairo/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText('Pyramids Tour')[0]).toBeInTheDocument()
    })

    it('should not render section when no featured tours', () => {
      const noFeaturedTours = mockTours.map(t => ({ ...t, isFeatured: false }))
      const props = { ...defaultProps, destinationTours: noFeaturedTours }

      render(<DestinationPageClient {...props} />)

      expect(screen.queryByText(/Best Deals in Cairo/i)).not.toBeInTheDocument()
    })
  })

  describe('Top 10 Tours Section', () => {
    it('should render top 10 tours', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText(/TOP 10 TOURS IN CAIRO/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText('Pyramids Tour')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Egyptian Museum Tour')[0]).toBeInTheDocument()
    })

    it('should display tour prices', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument()
      expect(screen.getAllByText('$50.00')[0]).toBeInTheDocument()
    })
  })

  describe('Categories Section', () => {
    it('should render categories with tours', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/Discover Cairo by Interest/i)).toBeInTheDocument()
      expect(screen.getByText('Historical')).toBeInTheDocument()
    })

    it('should display tour count per category', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('2 tours')).toBeInTheDocument()
    })

    it('should not show categories with zero tours', () => {
      render(<DestinationPageClient {...defaultProps} />)

      // Adventure category has no tours
      const adventureText = screen.queryByText('Adventure')
      expect(adventureText).not.toBeInTheDocument()
    })
  })

  describe('About Us Section', () => {
    it('should render about section with destination name', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/Your Local Guide In Cairo/i)).toBeInTheDocument()
    })

    it('should display long description when available', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/Cairo is a sprawling metropolis/i)).toBeInTheDocument()
    })

    it('should display default description when long description missing', () => {
      const noLongDesc = { ...mockDestination, longDescription: '' }
      const props = { ...defaultProps, destination: noLongDesc }

      render(<DestinationPageClient {...props} />)

      expect(screen.getByText(/Discover the best of Cairo/i)).toBeInTheDocument()
    })
  })

  describe('Highlights Section', () => {
    it('should render highlights when available', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/Why Visit Cairo/i)).toBeInTheDocument()
      expect(screen.getByText('Pyramids')).toBeInTheDocument()
      expect(screen.getByText('Egyptian Museum')).toBeInTheDocument()
      expect(screen.getByText('Khan el-Khalili')).toBeInTheDocument()
    })

    it('should not render highlights section when empty', () => {
      const noHighlights = { ...mockDestination, highlights: [] }
      const props = { ...defaultProps, destination: noHighlights }

      render(<DestinationPageClient {...props} />)

      expect(screen.queryByText(/Why Visit/i)).not.toBeInTheDocument()
    })
  })

  describe('Travel Tips Section', () => {
    it('should render travel tips', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getAllByText('Travel Tips & Essential Info')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Best Time to Visit')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Currency')[0]).toBeInTheDocument()
    })
  })

  describe('FAQ Section', () => {
    it('should render FAQ section', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText('FREQUENTLY ASKED QUESTIONS')).toBeInTheDocument()
    })

    it('should have destination-specific FAQ questions', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/What is the best time to visit Cairo/i)).toBeInTheDocument()
      expect(screen.getByText(/How many days should I spend in Cairo/i)).toBeInTheDocument()
    })

    it('should toggle FAQ items', async () => {
      const user = userEvent.setup()
      render(<DestinationPageClient {...defaultProps} />)

      const faqButton = screen.getByRole('button', {
        name: /What is the best time to visit Cairo/i
      })

      await user.click(faqButton)

      await waitFor(() => {
        expect(screen.getByText(/cooler months from October to April/i)).toBeInTheDocument()
      })
    })
  })

  describe('Newsletter Section', () => {
    it('should render newsletter signup', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.getByText(/Get Exclusive Cairo Travel Deals/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /subscribe now/i })).toBeInTheDocument()
    })
  })

  describe('Related Destinations', () => {
    it('should render related destinations when provided', () => {
      const relatedDests: Destination[] = [
        {
          ...mockDestination,
          _id: '2',
          name: 'Luxor',
          slug: 'luxor',
          tourCount: 30,
        },
      ]

      const props = { ...defaultProps, relatedDestinations: relatedDests }
      render(<DestinationPageClient {...props} />)

      expect(screen.getByText('Explore More Destinations')).toBeInTheDocument()
      expect(screen.getByText('Luxor')).toBeInTheDocument()
      expect(screen.getByText('30 tours available')).toBeInTheDocument()
    })

    it('should not render section when no related destinations', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.queryByText('Explore More Destinations')).not.toBeInTheDocument()
    })
  })

  describe('Reviews Section', () => {
    it('should render reviews when provided', () => {
      const reviews = [
        {
          _id: 'r1',
          userName: 'John Doe',
          rating: 5,
          comment: 'Amazing experience!',
          title: 'Best tour ever',
          verified: true,
        },
      ]

      const props = { ...defaultProps, reviews } as any
      render(<DestinationPageClient {...props} />)

      expect(screen.getByText(/What Travelers Say About Cairo/i)).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Amazing experience!')).toBeInTheDocument()
    })

    it('should not render section when no reviews', () => {
      render(<DestinationPageClient {...defaultProps} />)

      expect(screen.queryByText(/What Travelers Say/i)).not.toBeInTheDocument()
    })
  })

  describe('Floating Tags', () => {
    it('should render floating tags in hero section', () => {
      render(<DestinationPageClient {...defaultProps} />)

      // Tags are dynamically generated, check for some Cairo-specific tags
      const tags = screen.getAllByRole('button').filter(button =>
        button.textContent?.includes('PYRAMIDS') ||
        button.textContent?.includes('SPHINX') ||
        button.textContent?.includes('MUSEUM')
      )

      expect(tags.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Behavior', () => {
    it('should render mobile-friendly layout', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<DestinationPageClient {...defaultProps} />)

      // Component should render without errors on mobile
      expect(screen.getAllByText(/Cairo/i).length > 0).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<DestinationPageClient {...defaultProps} />)

      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should have accessible links', () => {
      render(<DestinationPageClient {...defaultProps} />)

      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })
  })
})
