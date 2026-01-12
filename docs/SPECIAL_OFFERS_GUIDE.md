# Special Offers Guide

This guide explains how to create and manage special offers for tours.

## Table of Contents
1. [Offer Types Overview](#offer-types-overview)
2. [Percentage Off](#1-percentage-off)
3. [Fixed Amount](#2-fixed-amount)
4. [Early Bird](#3-early-bird)
5. [Last Minute](#4-last-minute)
6. [Promo Code](#5-promo-code)
7. [Group Discount](#6-group-discount)
8. [Creating Offers in Admin](#creating-offers-in-admin)
9. [How Discounts Calculate](#how-discounts-calculate)
10. [Troubleshooting](#troubleshooting)

---

## Offer Types Overview

| Type | How It Works | Example |
|------|--------------|---------|
| **Percentage Off** | X% off the base price | 20% off → $100 becomes $80 |
| **Fixed Amount** | $X off the price | $15 off → $100 becomes $85 |
| **Early Bird** | Discount for advance bookings | Book 14+ days ahead → 15% off |
| **Last Minute** | Discount for last-minute bookings | Book within 48 hours → 25% off |
| **Promo Code** | Discount with code entry | Enter "SAVE10" → 10% off |
| **Group Discount** | Discount for large groups | 5+ people → 10% off |

---

## 1. Percentage Off

### What It Does
Applies a percentage discount to the base price of the tour.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `percentage` | Offer type |
| Discount Value | `20` | Percentage (0-100) |
| Max Discount | Optional | Cap maximum discount amount |

### How It Calculates
```
Original Price: $100
Discount: 20%
Calculation: $100 × 0.20 = $20 off
Final Price: $80
```

### Customer Experience
- Customer sees strikethrough original price with discounted price
- Discount is automatically applied
- Badge shows "20% OFF"

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "Summer Sale 20% Off"
3. Select Type: **Percentage Off**
4. Enter Discount Value: **20**
5. Set Start/End Dates
6. Select applicable tours
7. Enable **Active** and optionally **Featured**
8. Click **Create Offer**

---

## 2. Fixed Amount

### What It Does
Subtracts a fixed dollar amount from the price.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `fixed` | Offer type |
| Discount Value | `15` | Dollar amount |
| Min Booking Value | Optional | Minimum order for discount to apply |

### How It Calculates
```
Original Price: $100
Discount: $15 flat
Calculation: $100 - $15 = $85
Final Price: $85
```

### Important Notes
- If booking is less than discount amount, price won't go below $0
- Optional minimum booking value prevents misuse on small purchases
- Example: Min $50 booking → $40 tour won't qualify

### Customer Experience
- Shows "$15 OFF" badge
- Price displays as: ~~$100~~ → $85

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "Save $15"
3. Select Type: **Fixed Amount**
4. Enter Discount Value: **15**
5. Optionally set Min Booking Value: **50**
6. Set Start/End Dates
7. Select applicable tours
8. Click **Create Offer**

---

## 3. Early Bird

### What It Does
Rewards customers who book in advance by giving them a discount.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `early_bird` | Offer type |
| Discount Value | `15` | Percentage off |
| Min Days In Advance | `14` | Days before tour required |

### How It Works
```
Booking Date: January 1
Tour Date: January 20
Days Between: 19 days

If minDaysInAdvance = 14:
  19 >= 14 → ✅ QUALIFIES (15% off)

If tour date was January 10 (9 days away):
  9 >= 14 → ❌ DOESN'T QUALIFY (full price)
```

### Customer Experience
- **14+ days ahead**: Sees discounted price with "Early Bird" badge
- **<14 days ahead**: Sees regular price, no offer displayed
- Message: "Book at least 14 days in advance to qualify"

### Use Cases
- Encourage advance planning
- Better capacity management
- Higher commitment from customers

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "Early Bird - Book 14 Days Ahead"
3. Select Type: **Early Bird**
4. Enter Discount Value: **15** (percentage)
5. Enter Min Days In Advance: **14**
6. Set Start/End Dates
7. Select applicable tours
8. Click **Create Offer**

---

## 4. Last Minute

### What It Does
Offers discounts to fill last-minute availability.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `last_minute` | Offer type |
| Discount Value | `25` | Percentage off |
| Max Days Before Tour | `2` | Maximum days before tour (48 hours = 2 days) |

### How It Works
```
Booking Date: January 15
Tour Date: January 16 (tomorrow)
Days Between: 1 day

If maxDaysBeforeTour = 2:
  1 <= 2 → ✅ QUALIFIES (25% off)

If tour date was January 25 (10 days away):
  10 <= 2 → ❌ DOESN'T QUALIFY (full price)
```

### Customer Experience
- **Within window**: Sees discounted price with "Last Minute" badge
- **Outside window**: Sees regular price
- Message: "Only valid when booking within 2 days of tour"

### Use Cases
- Fill unsold capacity
- Attract spontaneous travelers
- Reduce no-shows by encouraging last-minute bookings

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "Last Minute Deal"
3. Select Type: **Last Minute**
4. Enter Discount Value: **25** (percentage)
5. Enter Max Days Before Tour: **2** (48 hours)
6. Set Start/End Dates
7. Select applicable tours
8. Click **Create Offer**

---

## 5. Promo Code

### What It Does
Requires customers to enter a special code at checkout to receive the discount.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `percentage` or `fixed` | Discount type |
| Discount Value | `10` | Discount amount |
| Code | `SAVE10` | The promo code (auto-uppercased) |
| Usage Limit | `100` | Max times code can be used |

### How It Works
1. Customer proceeds to checkout
2. Enters promo code in the code field
3. System validates:
   - Code exists and is active
   - Usage limit not exceeded
   - Current date within offer period
4. If valid: discount applied, usage count incremented
5. If invalid: error message shown

### Customer Experience

**Without Code:**
```
Subtotal: $100
Total: $100
```

**With Valid Code:**
```
Subtotal: $100
Promo Code: SAVE10 (-10%)
Discount: -$10
Total: $90
```

**With Invalid Code:**
```
❌ Invalid or expired promo code
```

### Use Cases
- Marketing campaigns
- Partner promotions
- Loyalty rewards
- Influencer tracking

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "SAVE10 Promo Code"
3. Select Type: **Percentage Off**
4. Enter Discount Value: **10**
5. Enter Promo Code: **SAVE10**
6. Enter Usage Limit: **100**
7. Set Start/End Dates
8. Select applicable tours (or leave empty for all)
9. Click **Create Offer**

---

## 6. Group Discount

### What It Does
Gives discounts when booking for multiple people.

### Configuration
| Field | Value | Description |
|-------|-------|-------------|
| Type | `group` | Offer type |
| Discount Value | `10` | Percentage off |
| Min Group Size | `5` | Minimum people required |

### How It Calculates
```
Booking: 6 adults for $100/person tour
Total before discount: $600

If minGroupSize = 5:
  6 >= 5 → ✅ QUALIFIES
  Discount: 10% off $600 = $60
  Final Total: $540
```

### Customer Experience
- Shows discount when group size threshold met
- Message: "Add X more people to unlock group discount"
- Badge: "Group Discount - 10% off for 5+ people"

### Create in Admin
1. Go to **Admin → Special Offers → Create Offer**
2. Enter Name: "Group Discount 10%"
3. Select Type: **Group Discount**
4. Enter Discount Value: **10**
5. Enter Min Group Size: **5**
6. Set Start/End Dates
7. Select applicable tours
8. Click **Create Offer**

---

## Creating Offers in Admin

### Step-by-Step Guide

1. **Navigate to Special Offers**
   - Go to `/admin/special-offers`
   - Click "Create Offer" button

2. **Basic Information**
   - **Name**: Clear, descriptive name
   - **Description**: Brief explanation for customers
   - **Type**: Select offer type

3. **Discount Settings**
   - **Discount Value**: Amount or percentage
   - **Type-specific fields**: Based on selected type

4. **Validity Period**
   - **Start Date**: When offer becomes active
   - **End Date**: When offer expires

5. **Tour Selection**
   - Select which tours the offer applies to
   - Optionally select specific booking options

6. **Status & Display**
   - **Active**: Enable/disable the offer
   - **Featured**: Show prominently on tour pages
   - **Featured Badge Text**: Custom badge text

7. **Save**
   - Click "Create Offer" or "Update Offer"

---

## How Discounts Calculate

### Priority System
When multiple offers could apply, the system selects the best one:

1. Offers are sorted by `priority` (higher first)
2. Among equal priority, highest discount value wins
3. Only ONE offer is applied per booking

### Calculation Order
```
1. Get base price
2. Find applicable offers
3. Check conditions (early bird, last minute, group size, etc.)
4. Calculate discount for each applicable offer
5. Apply max discount cap if set
6. Select best offer
7. Apply discount to final price
```

### Example Scenario
```
Tour Price: $100
Available Offers:
  - 20% off (percentage) - Priority 10
  - $15 off (fixed) - Priority 5
  - 15% early bird - Priority 8

If booking 14+ days ahead:
  All three could apply.
  20% off wins (highest priority) = $80 final price
```

---

## Troubleshooting

### Offer Not Showing

| Issue | Check |
|-------|-------|
| Not active | Verify `isActive` is true |
| Wrong dates | Check start/end dates include today |
| Usage exhausted | Check `usedCount` vs `usageLimit` |
| Tour not selected | Verify tour is in `applicableTours` |
| Tenant mismatch | Verify `tenantId` matches |

### Early Bird Not Working

| Issue | Check |
|-------|-------|
| Days calculated wrong | Booking date vs travel date |
| Threshold too high | Lower `minDaysInAdvance` |
| Tour date not selected | Customer must select travel date first |

### Promo Code Invalid

| Issue | Check |
|-------|-------|
| Wrong case | Codes are auto-uppercased |
| Expired | Check date range |
| Usage exceeded | Check `usedCount` < `usageLimit` |
| Tour not applicable | Code may be tour-specific |

---

## Seed Sample Offers

To create sample offers for testing:

```bash
npx tsx scripts/seed-sample-offers.ts
```

This creates:
1. Summer Sale 20% Off (percentage)
2. Save $15 (fixed)
3. Early Bird - Book 14 Days Ahead (early_bird)
4. Last Minute Deal (last_minute)
5. SAVE10 Promo Code (promo code)

---

## API Reference

### Get Active Offers for Tour
```
GET /api/offers/tour/[tourId]
```

### Calculate Discount
```typescript
import { calculateDiscountedPrice } from '@/lib/utils/offerCalculations';

const result = calculateDiscountedPrice(
  originalPrice,    // number
  offer,           // OfferData
  travelDate,      // Date (optional)
  groupSize,       // number (default: 1)
  bookingDate      // Date (default: now)
);

// Returns:
{
  originalPrice: number,
  discountedPrice: number,
  discountAmount: number,
  discountPercentage: number,
  isApplicable: boolean,
  reason?: string
}
```
