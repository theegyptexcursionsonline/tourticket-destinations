// Blog author resolver.
//
// The Blog model stores `author` as a plain string (see lib/models/Blog.ts).
// Historical posts were authored under short codes like "EEO" — we don't want
// those to render literally on the public author page. This module maps known
// author strings / URL slugs to a rich display profile (name, bio, avatar)
// used by /author/[slug].
//
// If a post's author isn't in KNOWN_AUTHORS, we fall back to the raw string.

export type KnownAuthor = {
  // Canonical display name shown in UI and metadata.
  name: string;
  // Canonical URL slug (lowercase, hyphenated). Every alias in `aliases`
  // routes to this slug.
  slug: string;
  // Strings that should resolve to this author. Includes the canonical name
  // and any short codes / legacy names found on existing posts.
  aliases: string[];
  bio: string;
  avatar?: string;
};

export const KNOWN_AUTHORS: KnownAuthor[] = [
  {
    name: 'Egypt Excursions Online Team',
    slug: 'egypt-excursions-online-team',
    aliases: [
      'EEO',
      'eeo',
      'Egypt Excursions Online',
      'Egypt Excursions Online Team',
      'egypt-excursions-online',
      'egypt-excursions-online-team',
    ],
    bio: 'The Egypt Excursions Online editorial team is a group of local guides, travel planners, and destination experts based in Hurghada, Cairo, and Luxor. We publish practical guides, itinerary ideas, and insider tips to help you plan your trip to Egypt with confidence.',
    avatar:
      'https://res.cloudinary.com/ddfxn8opk/image/upload/f_auto,q_auto/v1/blog/eeo-team-avatar',
  },
];

export function slugifyAuthorName(value?: string | null) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveAuthor(nameOrSlug?: string | null): KnownAuthor | null {
  if (!nameOrSlug) return null;
  const target = slugifyAuthorName(nameOrSlug);
  for (const author of KNOWN_AUTHORS) {
    if (author.slug === target) return author;
    if (author.aliases.some((alias) => slugifyAuthorName(alias) === target)) {
      return author;
    }
  }
  return null;
}

// Returns the canonical route slug for an author. Prefers a known mapping so
// links always use the human-readable slug (not the legacy short code).
export function getAuthorRouteSlug(
  author?: { slug?: string | null; name?: string | null } | null,
) {
  const known =
    resolveAuthor(author?.slug) || resolveAuthor(author?.name);
  if (known) return known.slug;
  const preferred = author?.slug || author?.name;
  return slugifyAuthorName(preferred);
}

// Does a post's stored `author` string correspond to the URL slug we're on?
// Handles known-author aliases so /author/EEO and
// /author/egypt-excursions-online-team both find posts stored as "EEO".
export function matchesAuthorSlug(
  authorName: string | undefined,
  candidateSlug: string,
) {
  const knownFromSlug = resolveAuthor(candidateSlug);
  if (knownFromSlug) {
    return knownFromSlug.aliases.some(
      (alias) => slugifyAuthorName(alias) === slugifyAuthorName(authorName),
    );
  }
  return slugifyAuthorName(authorName) === slugifyAuthorName(candidateSlug);
}

// Build the display profile from a post's raw author string. If the author is
// in KNOWN_AUTHORS, use the canonical name/bio/avatar; otherwise, fall back.
export function buildAuthorProfile(
  rawAuthor: string | undefined | null,
  fallback?: { authorAvatar?: string; authorBio?: string },
) {
  const known = resolveAuthor(rawAuthor);
  if (known) {
    return {
      name: known.name,
      slug: known.slug,
      bio: known.bio,
      avatar: known.avatar || fallback?.authorAvatar,
    };
  }
  const name = String(rawAuthor || '').trim() || 'Author';
  return {
    name,
    slug: slugifyAuthorName(name),
    bio:
      fallback?.authorBio ||
      `${name} shares travel guides and destination tips on Egypt Excursions Online.`,
    avatar: fallback?.authorAvatar,
  };
}
