export {};
// Booking options carry Minimum/Maximum Capacity. The gate must be authored
// once and enforced everywhere: the editor round-trips the fields, every write
// path validates them, the sidebar refuses a party the option cannot take, and
// the server refuses it again — UI graying is presentation, never authorization.
const fs = require('fs');
const path = require('path');
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('booking-option capacity is stored and validated on every write path', () => {
  it('the tour model persists both capacities with whole-number bounds', () => {
    const model = read('lib/models/Tour.ts');
    expect(model).toMatch(/minCapacity\?: number;/);
    expect(model).toMatch(/maxCapacity\?: number;/);
    expect(model).toMatch(/minCapacity: \{[\s\S]{0,400}max: \[100/);
    expect(model).toMatch(/maxCapacity: \{[\s\S]{0,600}Maximum capacity cannot be below the minimum capacity/);
  });

  it.each([
    ['tour create', 'app/api/admin/tours/route.ts'],
    ['tour update', 'app/api/admin/tours/[id]/route.ts'],
    ['single option save', 'app/api/tours/[tourId]/booking-options/route.ts'],
  ])('%s applies the defaults and refuses an invalid capacity', (_path, file) => {
    const src = read(file);
    expect(src).toContain("from '@/lib/admin/bookingOptionCapacity'");
    expect(src).toContain('applyBookingOptionCapacityDefaults');
    expect(src).toContain('bookingOptionCapacityError');
    expect(src).toMatch(/capacityError[\s\S]{0,200}status: 400/);
  });
});

describe('the tour editor round-trips the capacity fields', () => {
  const form = read('components/TourForm.tsx');

  it('restores both fields when a saved tour is loaded (the silent data-loss trap)', () => {
    // The load mapping rebuilds each option field by field: a field missing
    // here is blanked on open and erased on the next Update.
    expect(form).toMatch(/minCapacity: option\.minCapacity \?\? '',/);
    expect(form).toMatch(/maxCapacity: option\.maxCapacity \?\? '',/);
  });

  it('offers both inputs and marks the minimum required for Per Group', () => {
    expect(form).toContain('Minimum capacity');
    expect(form).toContain('Maximum capacity');
    expect(form).toContain('required={minCapacityRequired(option.type)}');
  });

  it('resets the minimum to the type default when the pricing type changes', () => {
    expect(form).toMatch(/if \(field === 'type'\)[\s\S]{0,300}defaultMinCapacity\(String\(value\)\)/);
  });

  it('sends the numbers, or nothing at all, on the single-option save', () => {
    expect(form).toMatch(/minCapacity: option\.minCapacity === '' \|\| option\.minCapacity === undefined \? undefined : Number\(option\.minCapacity\)/);
  });
});

describe('the capacity gate reaches the storefront and is re-enforced server-side', () => {
  it('the options API exposes the stored capacities', () => {
    const src = read('app/api/tours/[tourId]/options/route.ts');
    expect(src).toContain('minCapacity: option.minCapacity ?? undefined,');
    expect(src).toContain('maxCapacity: option.maxCapacity ?? undefined,');
  });

  it('the sidebar disables an option the party cannot take, with the reason', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toContain('const capacity = capacityAvailability(option, participants);');
    expect(src).toMatch(/isDisabled = isSoldOut \|\| Boolean\(option\.isStopSale\) \|\| !capacity\.available/);
    expect(src).toContain('Not available for this party size');
    expect(src).toContain("'booking.capacityBelowMinimum'");
    expect(src).toContain("{ limit: capacity.limit, unit: t('booking.participants'), participants }");
  });

  it('a party change that invalidates the selection clears it', () => {
    const src = read('components/BookingSidebar.tsx');
    expect(src).toMatch(/if \(chosen && !capacityAvailability\(chosen, next\.adults \+ next\.children\)\.available\) \{\s*next\.selectedTimeSlot = null;/);
  });

  it('the pricing authority refuses the party the UI would have grayed out', () => {
    const src = read('lib/security/checkoutPricing.ts');
    expect(src).toMatch(/capacityAvailability\(selectedOption as UnitCapacityOption, adults \+ children\)/);
    expect(src).toContain('This option needs at least ${gate.limit} participants');
    expect(src).toContain('This option takes at most ${gate.limit} participants');
  });
});

describe('the option list collapses and puts multiple departures in a dropdown', () => {
  const sidebar = read('components/BookingSidebar.tsx');

  it('collapses cards only when more than one option is offered', () => {
    expect(sidebar).toContain("collapsible={(availability?.tourOptions.length || 0) > 1}");
    expect(sidebar).toContain('const isOpen = !collapsible || expanded;');
  });

  it('opens one card at a time and keeps the selected one open', () => {
    expect(sidebar).toContain('setExpandedOptionId(prev => (prev === optionId ? null : optionId))');
    expect(sidebar).toContain("?? (bookingData.selectedTimeSlot?.optionId || null)");
  });

  it('exposes the collapse state to assistive tech', () => {
    expect(sidebar).toContain("'aria-expanded': isOpen");
    expect(sidebar).toContain("'aria-controls': bodyId");
  });

  it('moves multiple departures into a dropdown, single ones stay inline', () => {
    expect(sidebar).toContain('const usesSlotDropdown = option.timeSlots.length > 1;');
    expect(sidebar).toContain('role="listbox"');
  });

  it('keeps price and remaining spots visible on every dropdown row', () => {
    const menu = sidebar.slice(sidebar.indexOf('role="listbox"'), sidebar.indexOf('role="listbox"') + 2600);
    expect(menu).toContain('spots left');
    expect(menu).toContain('formatPrice(timeSlot.price)');
  });

  it('makes a sold-out time unselectable rather than merely styled', () => {
    const menu = sidebar.slice(sidebar.indexOf('role="listbox"'), sidebar.indexOf('role="listbox"') + 2600);
    expect(menu).toContain('disabled={isSoldOut}');
    expect(menu).toContain('if (isSoldOut) return;');
    expect(menu).toContain('Fully booked');
  });

  it('darkens the dropdown dividers in the dark storefront theme', () => {
    expect(read('app/globals.css')).toContain('[class~="divide-gray-100"]');
  });
  it('never renders a zero where a discount or original price is absent', () => {
    const src = read('components/BookingSidebar.tsx');
    // `{n && <jsx/>}` prints "0" when n is 0 — it put a stray 0 on every
    // option card whose discount was unset.
    expect(src).not.toMatch(/\{option\.discount && option\.discount > 0 && \(/);
    expect(src).not.toMatch(/\{timeSlot\.originalPrice && /);
    expect(src).not.toMatch(/\{addOn\.originalPrice && /);
    expect(src).not.toMatch(/\{tourDisplayData\?\.originalPrice && \(/);
  });

  it('keeps the casing each translation authored for participant nouns', () => {
    const src = read('components/BookingSidebar.tsx');
    // German capitalises nouns; lower-casing them in code produced
    // "4 teilnehmer (3 erwachsene, 1 kind)" on the German storefront.
    expect(src).not.toMatch(/t\('booking\.(adults?|child(ren)?|infants?)'\)\.toLowerCase\(\)/);
    expect(src).not.toContain('getParticipantsText().toLowerCase()');
  });
});
