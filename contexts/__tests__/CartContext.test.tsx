import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { CartProvider } from '../CartContext'
import { useCart } from '@/hooks/useCart'

function TestComponent() {
  const { cart, addToCart, clearCart, totalItems } = useCart()

  return (
    <div>
      <div data-testid="cart-count">{totalItems}</div>
      <div data-testid="cart-items">{JSON.stringify(cart)}</div>
      <button onClick={() => addToCart({
        id: '1',
        title: 'Test Tour',
        price: 100,
        quantity: 1,
        selectedDate: '2024-01-01',
      } as any, false)}>
        Add Item
      </button>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  )
}

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should initialize with empty cart', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
  })

  it('should add item to cart', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    await act(async () => {
      screen.getByText('Add Item').click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')
  })

  it('should clear cart', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    await act(async () => {
      screen.getByText('Add Item').click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1')

    await act(async () => {
      screen.getByText('Clear Cart').click()
    })

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0')
  })

  it('should persist cart to localStorage', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    )

    await act(async () => {
      screen.getByText('Add Item').click()
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const stored = localStorage.getItem('cart')
    expect(stored).toBeTruthy()
  })
})
