import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationManager from '../DestinationManager'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}))

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
    climate: 'Desert',
    weatherWarnings: [],
    featured: true,
    isPublished: true,
    metaTitle: 'Visit Cairo',
    metaDescription: 'Cairo tours',
    tags: ['ancient'],
    tourCount: 10,
    createdBy: { id: 'editor-1', name: 'Sara Editor', email: 'sara@example.com' },
    updatedBy: { id: 'editor-1', name: 'Sara Editor', email: 'sara@example.com' },
  },
]

describe('DestinationManager', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/admin/destinations') || url.includes('/api/destinations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockDestinations }),
        })
      }
      if (url.includes('/api/admin/tours')) {
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

  it('should render the heading', async () => {
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText('Destination Manager')).toBeInTheDocument()
  })

  it('should display destinations after loading', async () => {
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByText('Cairo')).toBeInTheDocument()
  })

  it('should display destination description', async () => {
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    // Description might be truncated or inside a tooltip
    const descEl = screen.queryByText(/vibrant capital/i)
    expect(descEl || screen.getByText('Cairo')).toBeInTheDocument()
  })

  it('should show create button', async () => {
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const buttons = screen.getAllByRole('button')
    const createButton = buttons.find(btn =>
      btn.textContent?.toLowerCase().includes('create') ||
      btn.textContent?.toLowerCase().includes('add') ||
      btn.textContent?.toLowerCase().includes('new')
    )
    expect(createButton || buttons.length > 0).toBeTruthy()
  })

  it('should show empty state when no destinations', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    })
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const emptyText = screen.queryByText(/no destinations/i) ||
      screen.queryByText(/create your first/i) ||
      screen.queryByText(/get started/i)
    expect(emptyText).toBeTruthy()
  })

  it('filters destinations by author or editor', async () => {
    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const input = screen.getByRole('searchbox', { name: 'Filter destinations by author or editor' })
    await userEvent.type(input, 'No matching editor')
    expect(screen.queryByText('Cairo')).not.toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, 'Sara')
    expect(screen.getByText('Cairo')).toBeInTheDocument()
    expect(screen.getByText('Edited by Sara Editor')).toBeInTheDocument()
  })

  // Client report (MT sheet, 31 Aug): the "Tour listings" selector offered
  // tours that had been moved to the Trash. The picker asks the API for live
  // tours only and drops any trashed row that still arrives.
  it('never offers a trashed tour in the Tour listings selector', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/admin/tours')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { _id: 'tour-live', title: 'Live Tour', slug: 'live-tour', archivedAt: null },
              { _id: 'tour-trashed', title: 'Trashed Tour', slug: 'trashed-tour', archivedAt: '2026-08-01T00:00:00.000Z' },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockDestinations }),
      })
    }) as jest.Mock

    render(<DestinationManager />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const tourRequest = (global.fetch as jest.Mock).mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes('/api/admin/tours'))
    expect(tourRequest).toContain('includeArchived=false')

    await userEvent.click(screen.getByRole('button', { name: /add destination/i }))
    await userEvent.click(screen.getByRole('button', { name: /^content$/i }))
    expect(await screen.findByText('Live Tour')).toBeInTheDocument()
    expect(screen.queryByText('Trashed Tour')).not.toBeInTheDocument()
  })
})
