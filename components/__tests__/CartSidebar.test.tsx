import React from 'react'
import { render, screen } from '@testing-library/react'
import CartSidebar from '../CartSidebar'

const mockCloseCart = jest.fn()

jest.mock('@/hooks/useCart', () => ({
  useCart: jest.fn(() => ({
    cart: [
      {
        id: '1',
        title: 'Pyramids Tour',
        price: 100,
        quantity: 2,
        image: '/pyramid.jpg',
        discountPrice: 100,
      },
    ],
    totalPrice: 200,
    totalItems: 2,
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    addToCart: jest.fn(),
    isCartOpen: true,
    openCart: jest.fn(),
    closeCart: mockCloseCart,
  })),
}))

describe('CartSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render cart heading when open', () => {
    render(<CartSidebar />)
    const cartElements = screen.getAllByText(/cart/i)
    expect(cartElements.length).toBeGreaterThan(0)
  })

  it('should display cart item title', () => {
    render(<CartSidebar />)
    expect(screen.getByText('Pyramids Tour')).toBeInTheDocument()
  })

  it('should display total price', () => {
    render(<CartSidebar />)
    const priceElements = screen.getAllByText(/\$200/)
    expect(priceElements.length).toBeGreaterThan(0)
  })

  it('should show empty cart message when no items', () => {
    const useCartMock = require('@/hooks/useCart').useCart
    useCartMock.mockReturnValueOnce({
      cart: [],
      totalPrice: 0,
      totalItems: 0,
      removeFromCart: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      addToCart: jest.fn(),
      isCartOpen: true,
      openCart: jest.fn(),
      closeCart: jest.fn(),
    })

    render(<CartSidebar />)
    const emptyElements = screen.getAllByText(/empty|no items/i)
    expect(emptyElements.length).toBeGreaterThan(0)
  })

  it('should have action buttons', () => {
    render(<CartSidebar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  describe('guest prices', () => {
    const bookingOptions = [
      { id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 },
      { id: 'priced', type: 'Per Person', label: 'Family', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
      {
        id: 'slotted', type: 'Per Person', label: 'Evening', price: 100,
        guestPrices: { adult: 100, child: 70, infant: 15 },
        timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }],
      },
    ]
    const cartWith = (optionId: string, selectedTime: string) => {
      const option = bookingOptions.find((candidate) => candidate.id === optionId)!
      return {
        cart: [{
          id: '1', uniqueId: 'u1', title: 'Pyramids Tour', image: '/pyramid.jpg',
          price: 100, discountPrice: 100, bookingOptions, discountPercent: 0,
          quantity: 2, childQuantity: 1, infantQuantity: 1,
          selectedDate: '2099-05-01', selectedTime,
          selectedBookingOption: { id: option.id, title: option.label, type: option.type, price: option.price },
        }],
        totalPrice: 0, totalItems: 4,
        removeFromCart: jest.fn(), updateQuantity: jest.fn(), clearCart: jest.fn(), addToCart: jest.fn(),
        isCartOpen: true, openCart: jest.fn(), closeCart: mockCloseCart,
      }
    }
    const useCartMock = () => require('@/hooks/useCart').useCart

    it('legacy option totals child half and infant free with no per-guest breakdown', () => {
      useCartMock().mockReturnValueOnce(cartWith('legacy', '09:00'))
      render(<CartSidebar />)
      expect(screen.getAllByText(/\$250/).length).toBeGreaterThan(0)
      expect(screen.queryByTestId('guest-price-breakdown')).not.toBeInTheDocument()
    })

    it('a child-priced option shows the child and infant lines the server will charge', () => {
      useCartMock().mockReturnValueOnce(cartWith('priced', '09:00'))
      render(<CartSidebar />)
      expect(screen.getAllByText(/\$285/).length).toBeGreaterThan(0)
      const breakdown = screen.getByTestId('guest-price-breakdown')
      expect(breakdown).toHaveTextContent('$70')
      expect(breakdown).toHaveTextContent('$15')
    })

    it('a per-departure override prices the selected departure', () => {
      useCartMock().mockReturnValueOnce(cartWith('slotted', '14:00'))
      render(<CartSidebar />)
      expect(screen.getAllByText(/\$280/).length).toBeGreaterThan(0)
      expect(screen.getByTestId('guest-price-breakdown')).toHaveTextContent('$80')
    })
  })
})
