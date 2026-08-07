import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { LinkedPageCard } from '@/lib/attractionPages/pageContent';
import { Link } from '@/i18n/navigation';

interface Props {
  pages: LinkedPageCard[];
  title?: string;
  subtitle?: string;
}

export default function LinkedPageCardsSection({
  pages,
  title = 'Explore more',
  subtitle = 'Hand-picked guides and collections related to this page',
}: Props) {
  // Nothing curated means no section at all — an empty "Explore more" heading
  // reads as broken rather than as a page with no extras.
  if (pages.length === 0) return null;

  // An editor who clears the subtitle means it, so only the missing case gets
  // the default; a deliberate blank stays blank.
  const heading = title?.trim() || 'Explore more';
  const strapline = subtitle?.trim();

  return (
    <section className="bg-slate-50 py-12" data-testid="linked-page-listings">
      <div className="container mx-auto px-6">
        <h2 className="mb-2 text-3xl font-bold text-slate-900">{heading}</h2>
        {strapline ? <p className="mb-8 text-slate-600">{strapline}</p> : <div className="mb-8" />}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={page.href}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-red-300 hover:shadow-lg"
            >
              {page.image ? (
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={page.image}
                    alt={page.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ) : null}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-red-600">{page.title}</h3>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-red-600" />
                </div>
                {page.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{page.description}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
