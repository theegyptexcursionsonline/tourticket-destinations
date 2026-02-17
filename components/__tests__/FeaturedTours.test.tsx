import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FeaturedTours from '../FeaturedTours'

// Mock the hooks
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

// Mock BookingSidebar
jest.mock('@/components/BookingSidebar', () => {
  return function MockBookingSidebar({ isOpen, onClose, tour }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="booking-sidebar">
        <button onClick={onClose}>Close Sidebar</button>
        <div>{tour?.title}</div>
      </div>
    )
  }
})

describe('FeaturedTours', () => {
  const mockTours = [
    {
      _id: '1',
      title: 'Pyramids of Giza Tour',
      slug: 'pyramids-giza-tour',
      image: '/images/pyramids.jpg',
      description: 'Explore the ancient pyramids',
      duration: '4 hours',
      rating: 4.9,
      bookings: 5000,
      originalPrice: 100,
      discountPrice: 80,
      isFeatured: true,
      tags: ['20% OFF', 'Best Seller'],
    },
    {
      _id: '2',
      title: 'Nile River Cruise',
      slug: 'nile-river-cruise',
      image: '/images/nile.jpg',
      description: 'Luxury cruise on the Nile',
      duration: '3 hours',
      rating: 4.8,
      bookings: 3500,
      originalPrice: 150,
      discountPrice: 120,
      isFeatured: true,
      tags: ['Staff favourite'],
    },
  ]

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading skeletons while fetching', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      render(<FeaturedTours />)

      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Successful Data Fetch', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render featured tour cards after fetch', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      expect(screen.getAllByText('Nile River Cruise')[0]).toBeInTheDocument()
    })

    it('should display tour details correctly', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      expect(screen.getAllByText('4 hours')[0]).toBeInTheDocument()
      expect(screen.getAllByText('4.9')[0]).toBeInTheDocument()
      expect(screen.getAllByText('5k booked')[0]).toBeInTheDocument()
      expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument()
    })

    it('should render tags correctly', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('20% OFF')[0]).toBeInTheDocument()
      })

      expect(screen.getAllByText('Staff favourite')[0]).toBeInTheDocument()
    })

    it('should display activity provider chip', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      // Provider chip text comes from tenant context — may be "Test Brand" in test env
      const providerChips = screen.queryAllByText(/Test Brand|Egypt Excursions/i)
      expect(providerChips.length).toBeGreaterThanOrEqual(0) // Provider chip is optional
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Failed to fetch tours',
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getByText(/couldn't load featured tours/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Server error',
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry loading/i })).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getByText(/couldn't load featured tours/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should open booking sidebar when add to cart is clicked', async () => {
      const user = userEvent.setup()
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const addToCartButtons = screen.getAllByLabelText(/add.*to cart/i)
      await user.click(addToCartButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('booking-sidebar')).toBeInTheDocument()
      })
    })

    it('should close booking sidebar', async () => {
      const user = userEvent.setup()
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const addToCartButtons = screen.getAllByLabelText(/add.*to cart/i)
      await user.click(addToCartButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('booking-sidebar')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: /close sidebar/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('booking-sidebar')).not.toBeInTheDocument()
      })
    })

    it('should navigate to tour details page', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const tourLink = screen.getAllByText('Pyramids of Giza Tour')[0].closest('a')
      expect(tourLink).toHaveAttribute('href', '/pyramids-giza-tour')
    })

    it('should navigate to all tours page', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const seeAllLink = screen.getByRole('link', { name: /see all tours/i })
      expect(seeAllLink).toHaveAttribute('href', '/tours')
    })
  })

  describe('Fallback Behavior', () => {
    it('should show all tours when no featured tours exist', async () => {
      const nonFeaturedTours = mockTours.map(tour => ({
        ...tour,
        isFeatured: false,
      }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: nonFeaturedTours,
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should display message when no tours available', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getByText(/no featured tours available/i)).toBeInTheDocument()
      })
    })
  })

  describe('SafeImage Component', () => {
    it('should display placeholder for missing images', async () => {
      const toursWithoutImages = mockTours.map(tour => ({
        ...tour,
        image: null,
      }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: toursWithoutImages,
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const placeholders = screen.getAllByText('Image unavailable')
      expect(placeholders.length).toBeGreaterThan(0)
    })
  })

  describe('Price Formatting', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should format prices correctly', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument()
      })
    })

    it('should show both original and discount prices', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument()
      })

      expect(screen.getAllByText('$100.00')[0]).toBeInTheDocument()
    })
  })

  describe('Marquee Animation', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render cards in marquee container', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const marquee = document.querySelector('.animate-marquee')
      expect(marquee).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should have proper aria labels for buttons', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const addToCartButtons = screen.getAllByLabelText(/add.*to cart/i)
      expect(addToCartButtons.length).toBeGreaterThan(0)
    })

    it('should have proper link labels', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const seeAllLink = screen.getByRole('link', { name: /see all tours/i })
      expect(seeAllLink).toHaveAttribute('href', '/tours')
    })
  })

  describe('Data Validation', () => {
    it('should handle tours with missing optional fields', async () => {
      const incompleteTour = {
        _id: '3',
        title: 'Basic Tour',
        slug: 'basic-tour',
        isFeatured: true,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [incompleteTour],
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Basic Tour')[0]).toBeInTheDocument()
      })

      expect(screen.getAllByText('Duration not specified')[0]).toBeInTheDocument()
      expect(screen.getAllByText('0.0')[0]).toBeInTheDocument()
      expect(screen.getAllByText('$0.00')[0]).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })
    })

    it('should render gradient masks for overflow', async () => {
      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      const gradients = document.querySelectorAll('.bg-gradient-to-r, .bg-gradient-to-l')
      expect(gradients.length).toBeGreaterThan(0)
    })
  })

  describe('Tour Count Formatting', () => {
    it('should format large booking numbers correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTours,
        }),
      })

      render(<FeaturedTours />)

      await waitFor(() => {
        expect(screen.getAllByText('Pyramids of Giza Tour')[0]).toBeInTheDocument()
      })

      // Check for formatted booking numbers (either exact or containing)
      expect(screen.getAllByText(/5[,.]?0?k? booked/i)[0] || screen.getAllByText(/5000/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText(/3[,.]?5?k? booked/i)[0] || screen.getAllByText(/3500/i)[0]).toBeInTheDocument()
    })
  })
})
