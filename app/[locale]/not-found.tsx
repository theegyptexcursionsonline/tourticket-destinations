import { Link } from '@/i18n/navigation';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export default async function NotFoundPage() {
  // Get tenant info for branding
  let siteName = 'our team';
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    if (tenant?.name) {
      siteName = tenant.name;
    }
  } catch {
    // Use default
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 px-4 md:px-0">
      <div className="text-center p-8 max-w-lg mx-auto">
        {/* Custom Travel-Themed SVG Icon: A Compass */}
        <div className="inline-block mb-6 text-primary opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-28 w-28"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={0.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21.5c-5 0-9-4-9-9s4-9 9-9 9 4 9 9-4 9-9 9z"
              transform="scale(0.6) translate(8, 8)"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15l-3-3m0 0l3-3m-3 3h6m-3 3v-6"
              transform="scale(0.5) translate(12, 12) rotate(45 12 12)"
            />
          </svg>
        </div>

        <h1 className="text-8xl font-black text-primary tracking-tighter">
          404
        </h1>
        <p className="text-2xl md:text-3xl font-bold mt-4">
          Looks like you&apos;re off the beaten path.
        </p>
        <p className="text-gray-500 mt-4 mb-8 text-md md:text-lg">
          The travel itinerary you&apos;re looking for might be on a secret expedition,
          or perhaps it never existed. Don&apos;t worry! The{' '}
          <span className="font-semibold text-gray-700">{siteName}</span> crew
          is here to get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="w-full sm:w-auto inline-block px-8 py-3 text-lg font-semibold text-white bg-primary rounded-md shadow-lg transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 ease-in-out"
          >
            Back to Homepage
          </Link>
          <Link
            href="/tours"
            className="w-full sm:w-auto inline-block px-8 py-3 text-lg font-semibold text-primary bg-transparent border-2 border-primary rounded-md transform hover:scale-105 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 ease-in-out"
          >
            Explore All Tours
          </Link>
        </div>
      </div>
    </main>
  );
}