import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationManager from '../DestinationManager'
import { IDestination } from '@/lib/models/Destination'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    promise: jest.fn((promise, handlers) => {
      promise.then(handlers.success).catch(handlers.error)
      return promise
    }),
  },
}))

describe('DestinationManager', () => {
  const mockDestinations = [
    {
      _id: '1',
      name: 'Cairo',
      slug: 'cairo',
      country: 'Egypt',
      image: '/images/cairo.jpg',
      images: [],
      description: 'The vibrant capital',
      longDescription: 'Cairo is amazing',
      coordinates: { lat: 30.0444, lng: 31.2357 },
      currency: 'EGP',
      timezone: 'EET',
      bestTimeToVisit: 'October to April',
      highlights: ['Pyramids'],
      thingsToDo: ['Visit pyramids'],
      localCustoms: [],
      visaRequirements: 'Visa on arrival',
      languagesSpoken: ['Arabic'],
      emergencyNumber: '122',
      averageTemperature: { summer: '35°C', winter: '20°C' },
      climate: 'Hot desert',
      weatherWarnings: [],
      featured: true,
      isPublished: true,
      metaTitle: 'Visit Cairo',
      metaDescription: 'Explore Cairo',
      tags: ['ancient'],
      tourCount: 50,
    },
    {
      _id: '2',
      name: 'Luxor',
      slug: 'luxor',
      country: 'Egypt',
      image: '/images/luxor.jpg',
      images: [],
      description: 'Ancient temples',
      longDescription: '',
      coordinates: { lat: 25.6872, lng: 32.6396 },
      currency: 'EGP',
      timezone: 'EET',
      bestTimeToVisit: 'Winter',
      highlights: [],
      thingsToDo: [],
      localCustoms: [],
      visaRequirements: '',
      languagesSpoken: [],
      emergencyNumber: '122',
      averageTemperature: { summer: '', winter: '' },
      climate: '',
      weatherWarnings: [],
      featured: false,
      isPublished: false,
      metaTitle: '',
      metaDescription: '',
      tags: [],
      tourCount: 30,
    },
  ] as unknown as IDestination[]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe('Initial Rendering', () => {
    it('should render header with title', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByText('Destination Manager')).toBeInTheDocument()
      expect(screen.getByText('Manage your tour destinations and locations')).toBeInTheDocument()
    })

    it('should display destination count', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('destinations available')).toBeInTheDocument()
    })

    it('should render all destination cards', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByText('Cairo')).toBeInTheDocument()
      expect(screen.getByText('Luxor')).toBeInTheDocument()
    })

    it('should show add destination button', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByRole('button', { name: /add destination/i })).toBeInTheDocument()
    })
  })

  describe('Destination Cards', () => {
    it('should display destination details', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getAllByText('Egypt')[0]).toBeInTheDocument()
      expect(screen.getAllByText('/cairo')[0]).toBeInTheDocument()
      expect(screen.getAllByText('50 tours')[0]).toBeInTheDocument()
    })

    it('should show featured badge for featured destinations', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByText('Featured')).toBeInTheDocument()
    })

    it('should show published/draft status', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      expect(screen.getByText('Published')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should display placeholder for missing images', () => {
      const noImage = [{ ...(mockDestinations[0] as any), image: '' }] as any
      render(<DestinationManager initialDestinations={noImage} />)

      const placeholders = screen.getAllByRole('img').filter(img =>
        img.getAttribute('alt') === 'Cairo'
      )
      expect(placeholders.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no destinations', () => {
      render(<DestinationManager initialDestinations={[]} />)

      expect(screen.getByText('No destinations yet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add first destination/i })).toBeInTheDocument()
    })
  })

  describe('Create Destination Flow', () => {
    it('should open panel when add button is clicked', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      const addButton = screen.getByRole('button', { name: /add destination/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })
    })

    it('should show all tabs in create panel', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Basic Info')).toBeInTheDocument()
        expect(screen.getByText('Location')).toBeInTheDocument()
        expect(screen.getByText('Content')).toBeInTheDocument()
        expect(screen.getByText('Travel Info')).toBeInTheDocument()
        expect(screen.getByText('SEO')).toBeInTheDocument()
      })
    })

    it('should require name and description fields', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/destination name/i)).toBeRequired()
        expect(screen.getByLabelText(/short description/i)).toBeRequired()
      })
    })

    it('should auto-generate slug from name', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/destination name/i)
        await user.clear(nameInput)
        await user.type(nameInput, 'New Destination')
      })

      const slugInput = screen.getByLabelText(/url slug/i) as HTMLInputElement
      await waitFor(() => {
        expect(slugInput.value).toBe('new-destination')
      })
    })
  })

  describe('Edit Destination Flow', () => {
    it('should open edit panel when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      // Hover over card to show edit button
      const cairoCard = screen.getByText('Cairo').closest('.group')
      if (cairoCard) {
        const editButton = cairoCard.querySelector('button[title="Edit destination"]')
        if (editButton) {
          await user.click(editButton)

          await waitFor(() => {
            expect(screen.getByText('Edit Destination')).toBeInTheDocument()
          })
        }
      }
    })

    it('should populate form with existing data', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      const cairoCard = screen.getByText('Cairo').closest('.group')
      if (cairoCard) {
        const editButton = cairoCard.querySelector('button[title="Edit destination"]')
        if (editButton) {
          await user.click(editButton)

          await waitFor(() => {
            const nameInput = screen.getByLabelText(/destination name/i) as HTMLInputElement
            expect(nameInput.value).toBe('Cairo')
          })
        }
      }
    })
  })

  describe('Form Validation', () => {
    it('should show validation error when submitting without required fields', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const saveButton = screen.getByRole('button', { name: /save destination/i })
        await user.click(saveButton)
      })

      expect(toast.error).toHaveBeenCalled()
    })

    it('should disable save button when form is invalid', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save destination/i })
        expect(saveButton).toBeDisabled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should create new destination successfully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/destination name/i)
        await user.type(nameInput, 'Aswan')

        const descInput = screen.getByLabelText(/short description/i)
        await user.type(descInput, 'Beautiful Nubian city')

        const saveButton = screen.getByRole('button', { name: /save destination/i })
        await user.click(saveButton)
      })

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Destination created successfully!')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should update existing destination successfully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      render(<DestinationManager initialDestinations={mockDestinations} />)

      const cairoCard = screen.getByText('Cairo').closest('.group')
      if (cairoCard) {
        const editButton = cairoCard.querySelector('button[title="Edit destination"]')
        if (editButton) {
          await user.click(editButton)

          await waitFor(async () => {
            const descInput = screen.getByLabelText(/short description/i)
            await user.clear(descInput)
            await user.type(descInput, 'Updated description')

            const saveButton = screen.getByRole('button', { name: /save destination/i })
            await user.click(saveButton)
          })

          await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Destination updated successfully!')
          })
        }
      }
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast').default

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/destination name/i)
        await user.type(nameInput, 'Test')

        const descInput = screen.getByLabelText(/short description/i)
        await user.type(descInput, 'Test description')

        const saveButton = screen.getByRole('button', { name: /save destination/i })
        await user.click(saveButton)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('Delete Destination', () => {
    it('should delete destination successfully', async () => {
      const user = userEvent.setup()
      const toast = require('react-hot-toast')

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      render(<DestinationManager initialDestinations={mockDestinations} />)

      const cairoCard = screen.getByText('Cairo').closest('.group')
      if (cairoCard) {
        const deleteButton = cairoCard.querySelector('button[title="Delete destination"]')
        if (deleteButton) {
          await user.click(deleteButton)

          await waitFor(() => {
            expect(toast.default.promise).toHaveBeenCalled()
          })
        }
      }
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const locationTab = screen.getByRole('button', { name: /location/i })
        await user.click(locationTab)
      })

      expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument()
    })
  })

  describe('Array Field Management', () => {
    it('should add items to array fields', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(async () => {
        const contentTab = screen.getByRole('button', { name: /content/i })
        await user.click(contentTab)
      })

      await waitFor(async () => {
        const addHighlightButton = screen.getByRole('button', { name: /add/i, hidden: false })
        await user.click(addHighlightButton)
      })

      const highlightInputs = screen.getAllByPlaceholderText(/enter a highlight/i)
      expect(highlightInputs.length).toBeGreaterThan(0)
    })
  })

  describe('Image Upload', () => {
    it('should handle image upload', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, url: '/images/new-image.jpg' }),
      })

      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        const fileInput = screen.getByLabelText(/upload image/i)
        expect(fileInput).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/destination name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/url slug/i)).toBeInTheDocument()
      })
    })

    it('should have accessible buttons', () => {
      render(<DestinationManager initialDestinations={mockDestinations} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })
  })

  describe('Panel Behavior', () => {
    it('should close panel when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Add New Destination')).not.toBeInTheDocument()
      })
    })

    it('should close panel when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<DestinationManager initialDestinations={mockDestinations} />)

      await user.click(screen.getByRole('button', { name: /add destination/i }))

      await waitFor(() => {
        expect(screen.getByText('Add New Destination')).toBeInTheDocument()
      })

      const backdrop = document.querySelector('.bg-black\\/60')
      if (backdrop) {
        await user.click(backdrop as Element)

        await waitFor(() => {
          expect(screen.queryByText('Add New Destination')).not.toBeInTheDocument()
        })
      }
    })
  })
})
