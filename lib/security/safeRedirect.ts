export function safeRelativeRedirect(value: string | null | undefined, fallback = '/user/dashboard') {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(value, 'https://local.invalid');
    if (parsed.origin !== 'https://local.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
