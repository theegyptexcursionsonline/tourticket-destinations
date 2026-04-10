// BlogPosting + Article schema for blog detail pages
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

interface Props {
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  image?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
}

export default function BlogPostSchema({ title, slug, description, excerpt, image, author, publishedAt, updatedAt, tags }: Props) {
  const postUrl = `${BASE_URL}/blog/${slug}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['BlogPosting', 'Article'],
        headline: title,
        description: description || excerpt,
        url: postUrl,
        image: image || `${BASE_URL}/og-image.jpg`,
        author: {
          '@type': 'Organization',
          name: author || 'Egypt Excursions Online',
          url: BASE_URL,
        },
        publisher: { '@id': `${BASE_URL}/#organization` },
        datePublished: publishedAt,
        dateModified: updatedAt || publishedAt,
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        ...(tags && tags.length > 0 ? { keywords: tags.join(', ') } : {}),
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.blog-content', 'article'],
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
