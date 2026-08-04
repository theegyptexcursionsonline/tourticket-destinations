export const INTERNAL_LINK_LOCALES = [
  "en",
  "ar",
  "de",
  "fr",
  "es",
  "ru",
] as const;
export type InternalLinkLocale = (typeof INTERNAL_LINK_LOCALES)[number];
export type LocalizedText = Partial<Record<InternalLinkLocale, string>>;

export interface InternalLinkItem {
  id: string;
  label: LocalizedText;
  href: string;
  enabled: boolean;
}

export interface InternalLinkGroup {
  id: string;
  title: LocalizedText;
  enabled: boolean;
  links: InternalLinkItem[];
}

export interface InternalLinkBlockValue {
  enabled: boolean;
  heading: LocalizedText;
  groups: InternalLinkGroup[];
}

export interface LocalizedInternalLinkBlock {
  enabled: boolean;
  heading: string;
  groups: Array<{
    id: string;
    title: string;
    links: Array<{ id: string; label: string; href: string }>;
  }>;
}

export interface InternalLinkSourceItem {
  id: string;
  label: string;
  href: string;
}

export interface InternalLinkSourceGroup {
  id: string;
  title: string;
  items: InternalLinkSourceItem[];
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function localizedText(value: unknown, maxLength: number): LocalizedText {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    INTERNAL_LINK_LOCALES.map(
      (locale) => [locale, text(source[locale], maxLength)] as const,
    ).filter(([, translated]) => Boolean(translated)),
  ) as LocalizedText;
}

export function isSafeInternalHref(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const href = value.trim();
  return (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    href.length <= 300 &&
    !CONTROL_CHARACTERS.test(href)
  );
}

function stableId(value: unknown, fallback: string): string {
  const candidate = text(value, 64).toLowerCase();
  return SAFE_ID.test(candidate) ? candidate : fallback;
}

function uniqueId(
  candidate: string,
  used: Set<string>,
  fallbackIndex: number,
): string {
  if (!used.has(candidate)) return candidate;
  let suffix = Math.max(2, fallbackIndex + 1);
  let next = `${candidate.slice(0, 61)}-${suffix}`.slice(0, 64);
  while (used.has(next)) {
    suffix += 1;
    const suffixText = `-${suffix}`;
    next = `${candidate.slice(0, 64 - suffixText.length)}${suffixText}`;
  }
  return next;
}

export function sanitizeInternalLinkBlock(
  value: unknown,
): InternalLinkBlockValue {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const rawGroups = Array.isArray(source.groups)
    ? source.groups.slice(0, 8)
    : [];
  const usedGroupIds = new Set<string>();

  const groups = rawGroups
    .map((entry, groupIndex) => {
      const group =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const id = uniqueId(
        stableId(group.id, `group-${groupIndex + 1}`),
        usedGroupIds,
        groupIndex,
      );
      usedGroupIds.add(id);

      const usedLinkIds = new Set<string>();
      const links = (Array.isArray(group.links) ? group.links : [])
        .slice(0, 24)
        .map((rawLink, linkIndex) => {
          const link =
            rawLink && typeof rawLink === "object"
              ? (rawLink as Record<string, unknown>)
              : {};
          const linkId = uniqueId(
            stableId(link.id, `${id}-link-${linkIndex + 1}`),
            usedLinkIds,
            linkIndex,
          );
          usedLinkIds.add(linkId);
          return {
            id: linkId,
            label: localizedText(link.label, 120),
            href: isSafeInternalHref(link.href) ? link.href.trim() : "",
            enabled: link.enabled !== false,
          };
        })
        .filter((link) => Boolean(link.label.en) && Boolean(link.href));

      return {
        id,
        title: localizedText(group.title, 120),
        enabled: group.enabled !== false,
        links,
      };
    })
    .filter((group) => Boolean(group.title.en) && group.links.length > 0);

  return {
    enabled: source.enabled !== false,
    heading: localizedText(source.heading, 160),
    groups,
  };
}

function translated(value: LocalizedText, locale: string): string {
  const normalized = INTERNAL_LINK_LOCALES.includes(
    locale as InternalLinkLocale,
  )
    ? (locale as InternalLinkLocale)
    : "en";
  return value[normalized] || value.en || "";
}

export function localizeInternalLinkBlock(
  value: InternalLinkBlockValue,
  locale: string,
): LocalizedInternalLinkBlock {
  return {
    enabled: value.enabled,
    heading: translated(value.heading, locale),
    groups: value.groups
      .filter((group) => group.enabled)
      .map((group) => ({
        id: group.id,
        title: translated(group.title, locale),
        links: group.links
          .filter((link) => link.enabled)
          .map((link) => ({
            id: link.id,
            label: translated(link.label, locale),
            href: link.href,
          }))
          .filter((link) => Boolean(link.label)),
      }))
      .filter((group) => Boolean(group.title) && group.links.length > 0),
  };
}

export function buildDefaultInternalLinkBlock(
  groups: InternalLinkSourceGroup[],
  heading = "Explore Egypt",
): InternalLinkBlockValue {
  return sanitizeInternalLinkBlock({
    enabled: true,
    heading: { en: heading },
    groups: groups.map((group) => ({
      id: group.id,
      title: { en: group.title },
      enabled: true,
      links: group.items.map((item) => ({
        id: item.id,
        label: { en: item.label },
        href: item.href,
        enabled: true,
      })),
    })),
  });
}
