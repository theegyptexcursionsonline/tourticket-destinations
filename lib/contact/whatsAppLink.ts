/**
 * wa.me link for a configured WhatsApp number, or null when there is no
 * usable number. Placeholder numbers such as "+20 000 000 0000" (the
 * storefront's fallback contact) are never offered to a customer.
 */
export function whatsAppLink(value: string | null | undefined): string | null {
  // wa.me wants the international number without "+" or the "00" prefix.
  const digits = (value ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^\d{1,3}0{7,}$/.test(digits)) return null;
  return `https://wa.me/${digits}`;
}
