import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CartSidebar from '../CartSidebar'

const mockRemoveFromCart = jest.fn()
const mockUpdateQuantity = jest.fn()
const mockClearCart = jest.fn()

const defaultCartState = {
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
  removeFromCart: mockRemoveFromCart,
  updateQuantity: mockUpdateQuantity,
  clearCart: mockClearCart,
  addToCart: jest.fn(),
  isCartOpen: true,
  openCart: jest.fn(),
  closeCart: jest.fn(),
}

jest.mock('@/hooks/useCart', () => ({
  useCart: jest.fn(() => defaultCartState),
}))

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}))

describe('CartSidebar', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
  }

  it('should render when open', () => {
    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByText(/cart|shopping/i)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<CartSidebar {...{...mockProps, isOpen: false} as any} />)

    expect(screen.queryByText(/cart|shopping/i)).not.toBeInTheDocument()
  })

  it('should display cart items', () => {
    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByText('Pyramids Tour')).toBeInTheDocument()
    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument()
  })

  it('should display total price', () => {
    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByText(/\$200\.00/)).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(<CartSidebar {...mockProps as any} />)

    const closeButton = screen.getByLabelText(/close/i) || screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(mockProps.onClose).toHaveBeenCalled()
  })

  it('should display item quantity', () => {
    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByText('2') || screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('should have checkout button', () => {
    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByRole('button', { name: /checkout|proceed/i })).toBeInTheDocument()
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

    render(<CartSidebar {...mockProps as any} />)

    expect(screen.getByText(/empty|no items|cart is empty/i)).toBeInTheDocument()
  })

  it('should have remove button for each item', () => {
    render(<CartSidebar {...mockProps as any} />)

    const removeButtons = screen.getAllByRole('button').filter(btn =>
      btn.getAttribute('aria-label')?.includes('remove') ||
      btn.textContent?.toLowerCase().includes('remove')
    )

    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('should display item image', () => {
    render(<CartSidebar {...mockProps as any} />)

    const image = (screen as any).getByAlt(/pyramids tour/i)
    expect(image).toBeInTheDocument()
  })
})
