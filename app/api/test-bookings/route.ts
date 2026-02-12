// app/api/test-bookings/route.ts
import { NextResponse } from 'next/server';

/**
 * Mock Booking API Endpoint
 * This endpoint provides a comprehensive mock booking with all possible data fields
 * for testing the booking detail pages (both customer and admin)
 */

export async function GET() {
  // Comprehensive mock booking data with all fields populated
  const mockBooking = {
    _id: '507f1f77bcf86cd799439011',
    bookingReference: 'EEO-12345678-ABC123',
    
    // Tour Information
    tour: {
      _id: '507f1f77bcf86cd799439012',
      title: 'Pyramids of Giza & Sphinx Full Day Tour with Camel Ride',
      image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop',
      images: [
        'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=800&h=600&fit=crop',
      ],
      duration: '8 hours',
      destination: {
        _id: '507f1f77bcf86cd799439013',
        name: 'Giza',
        slug: 'giza',
      },
      rating: 4.8,
      discountPrice: 45.00,
      meetingPoint: 'Hotel Lobby - Your guide will pick you up from your hotel in Cairo or Giza',
      slug: 'pyramids-of-giza-sphinx-full-day-tour-camel-ride',
    },
    
    // Customer Information
    user: {
      _id: '507f1f77bcf86cd799439014',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
    },
    
    // Booking Details
    date: new Date('2025-12-15').toISOString(),
    time: '08:00 AM',
    guests: 4,
    adultGuests: 2,
    childGuests: 2,
    infantGuests: 0,
    
    // Booking Option
    selectedBookingOption: {
      _id: '507f1f77bcf86cd799439015',
      title: 'Premium Experience with Private Guide',
      price: 75.00,
      originalPrice: 95.00,
      duration: '8 hours',
      badge: 'Most Popular',
    },
    
    // Add-ons
    selectedAddOns: {
      'addon1': 1,
      'addon2': 1,
    },
    selectedAddOnDetails: {
      'addon1': {
        title: 'Traditional Egyptian Lunch at Local Restaurant',
        price: 25.00,
        perGuest: false,
      },
      'addon2': {
        title: 'Professional Photography Service',
        price: 15.00,
        perGuest: true,
      },
    },
    
    // Pricing
    totalPrice: 235.50,
    
    // Payment Details
    paymentId: 'pi_3Q1a2b3c4d5e6f7g8h9i0j1k',
    paymentMethod: 'card',
    
    // Status
    status: 'Confirmed',
    
    // Additional Information
    specialRequests: 'Please arrange for a wheelchair-accessible vehicle. One of our party members has mobility issues. Also, we would prefer vegetarian options for lunch if possible.',
    emergencyContact: 'Jane Doe (Sister): +1 (555) 987-6543',
    
    // Timestamps
    createdAt: new Date('2025-11-20T10:30:00Z').toISOString(),
    updatedAt: new Date('2025-11-20T10:30:00Z').toISOString(),
  };

  // Additional mock bookings with different scenarios
  const mockBookings = [
    mockBooking,
    
    // Pending booking
    {
      ...mockBooking,
      _id: '507f1f77bcf86cd799439016',
      bookingReference: 'EEO-87654321-XYZ789',
      status: 'Pending',
      tour: {
        ...mockBooking.tour,
        title: 'Nile River Dinner Cruise with Entertainment',
        image: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ff?w=800&h=600&fit=crop',
      },
      date: new Date('2025-12-20').toISOString(),
      time: '07:00 PM',
      guests: 2,
      adultGuests: 2,
      childGuests: 0,
      infantGuests: 0,
      selectedBookingOption: {
        _id: '507f1f77bcf86cd799439017',
        title: 'Standard Experience',
        price: 55.00,
        originalPrice: 65.00,
        duration: '3 hours',
        badge: 'Best Value',
      },
      selectedAddOns: {},
      selectedAddOnDetails: {},
      totalPrice: 116.05,
      specialRequests: null,
      emergencyContact: null,
    },
    
    // Cancelled booking
    {
      ...mockBooking,
      _id: '507f1f77bcf86cd799439018',
      bookingReference: 'EEO-11223344-DEF456',
      status: 'Cancelled',
      tour: {
        ...mockBooking.tour,
        title: 'Alexandria Day Trip from Cairo',
        image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&h=600&fit=crop',
        destination: {
          _id: '507f1f77bcf86cd799439019',
          name: 'Alexandria',
          slug: 'alexandria',
        },
      },
      date: new Date('2025-11-25').toISOString(),
      time: '06:30 AM',
      guests: 3,
      adultGuests: 2,
      childGuests: 1,
      infantGuests: 0,
      selectedBookingOption: {
        _id: '507f1f77bcf86cd799439020',
        title: 'Group Tour',
        price: 60.00,
        originalPrice: 70.00,
        duration: '12 hours',
        badge: null,
      },
      selectedAddOns: {
        'addon3': 1,
      },
      selectedAddOnDetails: {
        'addon3': {
          title: 'Seafood Lunch at Mediterranean Restaurant',
          price: 30.00,
          perGuest: false,
        },
      },
      totalPrice: 192.15,
      specialRequests: 'Please pick us up at 6:15 AM sharp. We have a tight schedule.',
      emergencyContact: 'Mary Smith (Mother): +1 (555) 222-3333',
    },
    
    // Minimal booking (guest checkout, no add-ons)
    {
      ...mockBooking,
      _id: '507f1f77bcf86cd799439021',
      bookingReference: 'EEO-99887766-GHI789',
      user: {
        _id: '507f1f77bcf86cd799439022',
        firstName: 'Sarah',
        lastName: 'Johnson',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phone: null,
      },
      tour: {
        ...mockBooking.tour,
        title: 'Egyptian Museum Half-Day Tour',
        image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&h=600&fit=crop',
        duration: '4 hours',
        meetingPoint: 'Museum Main Entrance - Tahrir Square',
      },
      date: new Date('2025-12-10').toISOString(),
      time: '09:00 AM',
      guests: 1,
      adultGuests: 1,
      childGuests: 0,
      infantGuests: 0,
      selectedBookingOption: {
        _id: '507f1f77bcf86cd799439023',
        title: 'Standard Guided Tour',
        price: 35.00,
        originalPrice: 40.00,
        duration: '4 hours',
        badge: null,
      },
      selectedAddOns: {},
      selectedAddOnDetails: {},
      totalPrice: 37.80,
      specialRequests: null,
      emergencyContact: null,
      status: 'Confirmed',
    },
    
    // Family booking with infant
    {
      ...mockBooking,
      _id: '507f1f77bcf86cd799439024',
      bookingReference: 'EEO-55667788-JKL012',
      user: {
        _id: '507f1f77bcf86cd799439025',
        firstName: 'Michael',
        lastName: 'Brown',
        name: 'Michael Brown',
        email: 'michael.brown@example.com',
        phone: '+44 20 1234 5678',
      },
      tour: {
        ...mockBooking.tour,
        title: 'Cairo Citadel and Old Cairo Walking Tour',
        image: 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=800&h=600&fit=crop',
        duration: '6 hours',
        destination: {
          _id: '507f1f77bcf86cd799439026',
          name: 'Cairo',
          slug: 'cairo',
        },
      },
      date: new Date('2025-12-18').toISOString(),
      time: '10:00 AM',
      guests: 5,
      adultGuests: 2,
      childGuests: 2,
      infantGuests: 1,
      selectedBookingOption: {
        _id: '507f1f77bcf86cd799439027',
        title: 'Private Family Tour',
        price: 80.00,
        originalPrice: 100.00,
        duration: '6 hours',
        badge: 'Family Friendly',
      },
      selectedAddOns: {
        'addon4': 1,
        'addon5': 1,
      },
      selectedAddOnDetails: {
        'addon4': {
          title: 'Traditional Egyptian Snacks Pack',
          price: 12.00,
          perGuest: true,
        },
        'addon5': {
          title: 'Entry to Khan El-Khalili Bazaar Workshop',
          price: 20.00,
          perGuest: false,
        },
      },
      totalPrice: 280.20,
      specialRequests: 'We have a 6-month-old baby. Please ensure tour pace is suitable for families with infants. Also, need recommendations for baby-changing facilities along the route.',
      emergencyContact: 'Lisa Brown (Wife): +44 20 8765 4321',
      status: 'Confirmed',
    },
  ];

  return NextResponse.json({
    success: true,
    message: 'Mock booking data retrieved successfully',
    data: mockBookings,
    // Return the primary mock booking for single booking tests
    mockBooking: mockBooking,
    // Metadata
    meta: {
      total: mockBookings.length,
      scenarios: [
        'Confirmed with all fields',
        'Pending status',
        'Cancelled booking',
        'Minimal guest checkout',
        'Family with infant',
      ],
    },
  });
}

// POST endpoint to create/update mock booking
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // For testing, just return the mock data with any updates
    return NextResponse.json({
      success: true,
      message: 'Mock booking created/updated successfully',
      data: {
        ...body,
        _id: body._id || '507f1f77bcf86cd799439099',
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: 'Failed to process mock booking' },
      { status: 400 }
    );
  }
}
