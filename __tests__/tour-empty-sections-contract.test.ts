import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  enhancementSections,
  hasGroupSize,
  hasList,
  hasText,
} from '@/lib/tours/enhancementSections';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('supplementary tour sections only appear when the backend filled them', () => {
  it('treats blank, whitespace and empty lists as no content', () => {
    expect(hasText('Bring a towel')).toBe(true);
    expect(hasText('   ')).toBe(false);
    expect(hasText('')).toBe(false);
    expect(hasText(undefined)).toBe(false);

    expect(hasList(['Sunscreen'])).toBe(true);
    expect(hasList([])).toBe(false);
    expect(hasList(['', '  '])).toBe(false);
    expect(hasList(undefined)).toBe(false);

    expect(hasGroupSize({ min: 1, max: 10 })).toBe(true);
    expect(hasGroupSize({ min: 0, max: 0 })).toBe(false);
    expect(hasGroupSize(null)).toBe(false);
  });

  it('reports every section as empty for a tour with no supplementary content', () => {
    // This is the client's screenshot: four titled sections, nothing inside.
    expect(enhancementSections({})).toEqual({
      practical: false,
      accessibility: false,
      policies: false,
      cultural: false,
    });
    expect(enhancementSections(undefined)).toEqual({
      practical: false,
      accessibility: false,
      policies: false,
      cultural: false,
    });
    expect(enhancementSections({ whatToBring: [], weatherPolicy: '  ', culturalInfo: [''] })).toEqual({
      practical: false,
      accessibility: false,
      policies: false,
      cultural: false,
    });
  });

  it('turns a section on as soon as any one of its own fields has content', () => {
    expect(enhancementSections({ whatToWear: ['Light clothing'] }).practical).toBe(true);
    expect(enhancementSections({ physicalRequirements: 'Moderate walking' }).practical).toBe(true);
    expect(enhancementSections({ groupSize: { min: 1, max: 10 } }).practical).toBe(true);
    expect(enhancementSections({ healthSafety: ['Life jackets provided'] }).accessibility).toBe(true);
    expect(enhancementSections({ transportationDetails: 'Air-conditioned van' }).accessibility).toBe(true);
    expect(enhancementSections({ tipPolicy: 'Tipping is optional' }).policies).toBe(true);
    expect(enhancementSections({ localCustoms: ['Cover shoulders at the temple'] }).cultural).toBe(true);
    expect(enhancementSections({ seasonalVariations: 'Cooler in winter' }).cultural).toBe(true);
  });

  it('leaves the other sections off when only one is filled', () => {
    const only = enhancementSections({ weatherPolicy: 'Tours run in light rain' });
    expect(only).toEqual({ practical: false, accessibility: false, policies: true, cultural: false });
  });

  it('renders each section and its tab behind that content check', () => {
    const source = read('components/TourDetailPage.tsx');
    expect(source).toContain('const sections = enhancementSections(enhancement);');
    expect(source).toContain('{sections.practical && <PracticalInfoSection');
    expect(source).toContain('{sections.accessibility && <AccessibilitySection');
    expect(source).toContain('{sections.policies && <PoliciesSection');
    expect(source).toContain('{sections.cultural && <CulturalSection');
    // The tab strip must not advertise a section that will not render.
    expect(source).toContain('.filter((tab) => tab.show)');
    expect(source).toContain("{ id: 'policies', label: 'Policies', icon: Shield, show: sections.policies }");
    // Individual cards are guarded too, so a half-filled section shows only what exists.
    expect(source).toContain('{hasText(enhancement.weatherPolicy) && (');
    expect(source).toContain('{hasList(enhancement.whatToBring) && (');
    expect(source).toContain('{hasGroupSize(enhancement.groupSize) && (');
  });
});
