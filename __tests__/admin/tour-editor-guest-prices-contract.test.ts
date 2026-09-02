export {};
// The tour editor must author guest prices (tour, option, departure), option
// duration and add-on groups, and every option field it edits must survive a
// load → save round trip. The load mapping is a whitelist: a field missing
// there is blanked on open and erased on the next Update (the EEO defect
// class this test exists to stop recurring).
const fs = require('fs');
const path = require('path');
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const form = read('components/TourForm.tsx');

describe('Pricing & Details authors guest prices for RevenuePilot', () => {
  it('renders the block with adult mirroring the base price and editable child/infant', () => {
    expect(form).toContain('Guest prices for RevenuePilot');
    expect(form).toContain('aria-label="Adult price follows base price"');
    expect(form).toContain('id="revenue-guest-price-child"');
    expect(form).toContain('id="revenue-guest-price-infant"');
    expect(form).toMatch(/revenueGuestPrices: \{ child: event\.target\.value, infant: current\.revenueGuestPrices\?\.infant \?\? '' \}/);
    expect(form).toMatch(/revenueGuestPrices: \{ child: current\.revenueGuestPrices\?\.child \?\? '', infant: event\.target\.value \}/);
  });

  it('refuses to save a partial pair anywhere and sends a complete set or null', () => {
    expect(form).toContain("import { hasPartialGuestPrices, normalizeGuestPriceSet, pruneBookingOptionTimeSlots } from '@/lib/revenue/guestPrices';");
    expect(form).toContain('if (hasPartialGuestPrices(formData.revenueGuestPrices) || formData.bookingOptions.some((option) => hasPartialGuestPrices(option.guestPrices)))');
    expect(form).toContain('revenueGuestPrices: normalizeGuestPrices(cleanedData.discountPrice, cleanedData.revenueGuestPrices),');
    expect(form).toContain('guestPrices: normalizeGuestPrices(option.price, option.guestPrices),');
  });

  it('restores the stored tour set when a saved tour is opened', () => {
    expect(form).toMatch(/revenueGuestPrices: guestPriceInputs\(\s*tourToEdit\.discountPrice \|\| tourToEdit\.price \|\| '',/);
  });

  it('lets each universal departure override child and infant independently', () => {
    expect(form).toContain('const handleSlotGuestPriceChange = (index: number, guest: \'child\' | \'infant\', value: string) =>');
    expect(form).toContain('id={`availability-slot-${index}-${guest}`}');
    expect(form).toContain('guestPrices: Object.keys(guestPrices).length > 0 ? guestPrices : undefined,');
  });
});

describe('Booking options author duration, child and infant prices per option and per departure', () => {
  it('renders the duration input as optional and the guest-price inputs', () => {
    expect(form).toContain('id={`option-${index}-duration`}');
    expect(form).toContain("handleBookingOptionChange(index, 'duration', e.target.value)");
    expect(form).toContain('id={`option-${index}-child-price`}');
    expect(form).toContain('id={`option-${index}-infant-price`}');
    expect(form).toContain("handleBookingOptionChange(index, 'guestPrices', {");
  });

  it('renders per-slot adult/child/infant inputs that only enable for selected slots', () => {
    expect(form).toContain('const handleBookingOptionSlotGuestPrice = (optionIndex: number, time: string, guest: \'child\' | \'infant\', value: string) =>');
    expect(form).toContain('id={`option-${index}-slot-${slot.time}-${guest}`}');
    expect(form).toContain('onChange={(event) => handleBookingOptionSlotGuestPrice(index, slot.time, guest, event.target.value)}');
    expect(form).toMatch(/disabled=\{!isSelected\}\s+value=\{selectedSlot\?\.guestPrices\?\.\[guest\] \?\? ''\}/);
  });

  it('prunes stale option slots on every save path and when availability changes', () => {
    expect(form).toContain('bookingOptions: pruneBookingOptionTimeSlots(prev.bookingOptions, availabilityData.slots),');
    expect(form).toContain('pruneBookingOptionTimeSlots([formData.bookingOptions[index]], formData.availability?.slots)[0]');
    expect(form).toContain('? pruneBookingOptionTimeSlots(cleanedData.bookingOptions, cleanedData.availability?.slots)');
  });

  it('copies a slot\'s guest prices when the option adopts a universal slot', () => {
    expect(form).toContain('{ time: slot.time, capacity: slot.capacity, price: slot.price, guestPrices: slot.guestPrices }');
  });

  it('validates the pair on individual option save and normalises it', () => {
    const start = form.indexOf('const saveIndividualBookingOption');
    const end = form.indexOf('const handleAddOnChange', start);
    const block = form.slice(start, end);
    expect(block).toContain('if (hasPartialGuestPrices(option.guestPrices))');
    expect(block).toContain('guestPrices: normalizeGuestPrices(option.price, option.guestPrices),');
  });
});

describe('every editable booking-option field survives load → save', () => {
  // Fields the option panel edits through handleBookingOptionChange.
  const panelFields = Array.from(form.matchAll(/handleBookingOptionChange\(index, '([a-zA-Z]+)'/g)).map((match) => match[1]);
  // Fields the load mapping rebuilds for an existing option.
  const loadStart = form.indexOf('? tourToEdit.bookingOptions!.map((option: BookingOption) => ({');
  const loadEnd = form.indexOf('isRecommended: option.isRecommended || false', loadStart);
  const loadBlock = form.slice(loadStart, loadEnd);
  const loadedFields = new Set(Array.from(loadBlock.matchAll(/^\s+([a-zA-Z]+):/gm)).map((match) => match[1]));

  it('finds the fields it is checking (guards against the markers moving)', () => {
    expect(loadStart).toBeGreaterThan(0);
    expect(loadEnd).toBeGreaterThan(loadStart);
    expect(panelFields).toEqual(expect.arrayContaining(['label', 'type', 'price', 'duration', 'guestPrices', 'minCapacity', 'maxCapacity', 'description', 'applyTourDiscount']));
  });

  it.each(Array.from(new Set(['label', 'type', 'price', 'duration', 'guestPrices', 'minCapacity', 'maxCapacity', 'description', 'applyTourDiscount', 'timeSlots', 'id'])))(
    'restores "%s" when a saved tour is opened',
    (field) => {
      expect(loadedFields.has(field)).toBe(true);
    },
  );

  it('restores every field the panel can edit', () => {
    for (const field of panelFields) {
      expect(loadedFields.has(field)).toBe(true);
    }
  });

  it('restores per-slot guest prices when an option inherits the universal slots', () => {
    expect(loadBlock).toMatch(/price: slot\.price,\s+guestPrices: slot\.guestPrices,/);
  });
});

describe('Add-ons are authored in groups', () => {
  it('creates, titles, scopes and removes groups', () => {
    expect(form).toContain('const addAddOn = (groupKey?: string) =>');
    expect(form).toContain('const addOnGroups = useMemo(() => {');
    expect(form).toContain("const updateAddOnGroup = (groupKey: string, changes: Pick<AddOn, 'groupTitle' | 'bookingOptionKeys'>) =>");
    expect(form).toContain('const removeAddOnGroup = (groupKey: string) =>');
    expect(form).toContain('Create add-on group');
    expect(form).toContain('Add another add-on');
    expect(form).toContain('>All booking options<');
    expect(form).toContain('>Selected booking options<');
  });

  it('keys group assignments by the stable option id (MT keying, not EEO pricingKey)', () => {
    expect(form).toContain("updateAddOnGroup(group.key, { bookingOptionKeys: [formData.bookingOptions[0]?.id || ''].filter(Boolean) })");
    const groupEditor = form.slice(form.indexOf('const addOnGroups = useMemo'), form.indexOf('const handleAddOnChange'));
    expect(groupEditor).not.toMatch(/bookingOptionKeys[^\n]*pricingKey/);
  });

  it('keeps add-ons saved before grouping visible under one legacy group', () => {
    expect(form).toContain("const LEGACY_ADD_ON_GROUP = 'legacy-add-ons';");
    expect(form).toContain('groupKey: addon.groupKey || LEGACY_ADD_ON_GROUP,');
  });
});
