import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('network storefront visual consistency', () => {
  it('uses a solid, smaller hero secondary title with visible trust proof', () => {
    const hero = read('components/HeroSection.tsx');

    expect(hero).toContain('text-3xl font-bold');
    expect(hero).toContain('bg-slate-950/55');
    expect(hero).not.toContain('text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300');
    expect(hero).toContain('linear-gradient(to bottom right');
  });

  it('keeps one destination journey and exposes a real all-destinations action', () => {
    const homepage = read('app/[locale]/HomePageServer.tsx');
    const destinations = read('components/DestinationsServer.tsx');

    expect(homepage).not.toContain("import IcebarPromo from");
    expect(homepage).not.toContain("import InterestGridServer from");
    expect(destinations).toContain('href="/destinations"');
    expect(destinations).toContain("t('common.viewAll')");
  });

  it('uses tenant primary plus slate instead of competing tour-page gradients', () => {
    const tours = read('app/[locale]/tours/ToursClientPage.tsx');
    const egypt = read('app/[locale]/egypt/EgyptHeroClient.tsx');

    expect(tours).toContain('bg-slate-950 px-4 py-16 text-white');
    expect(tours).toContain('bg-[var(--primary-color)]');
    expect(tours).not.toContain('from-blue-600 via-indigo-600 to-purple-600');
    expect(tours).not.toContain('bg-purple-600 text-white');
    expect(egypt).toContain('bg-[var(--primary-color)]');
    expect(egypt).not.toContain('from-amber-400 to-amber-500');
  });
});
