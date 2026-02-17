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
    expect(screen.getByText(/cart/i)).toBeInTheDocument()
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
    expect(screen.getByText(/empty|no items/i)).toBeInTheDocument()
  })

  it('should have action buttons', () => {
    render(<CartSidebar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
