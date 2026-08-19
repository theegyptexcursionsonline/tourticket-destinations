import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import InteractiveItineraryMap, { type InteractiveItineraryItem } from '../InteractiveItineraryMap';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      mapApproximateStage: 'Approximate stage',
      mapData: 'Map data',
      mapExactPlace: 'Exact place',
      mapInteractiveLabel: 'Interactive tour route with {count} numbered stages',
      mapLoading: 'Loading route map…',
      mapOpenRoute: 'Open route',
      mapRoadMap: 'Road map',
      mapRouteStages: '{count} route stages',
      mapSelectStage: 'Select an itinerary stage',
      mapShowStage: 'Show stage {number}: {title}',
      mapStageNote: 'Numbered stages follow the itinerary order. Generic pickup, sea and onboard stages are approximate; exact pickup is confirmed after booking.',
      mapTilesBy: 'Tiles by',
      mapUnavailable: 'The route map is temporarily unavailable.',
    };
    return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ''));
  },
}));

const itinerary: InteractiveItineraryItem[] = [
  { time: '08:00', title: 'Hotel Pickup', description: 'Pickup from your hotel.', location: 'Your Hotel' },
  { time: '09:00', title: 'First Snorkel Stop', description: 'Explore the reef.', location: 'Red Sea' },
  { time: '10:30', title: 'Second Snorkel Stop', description: 'Visit another reef.', location: 'Red Sea' },
  { time: '12:00', title: 'Orange Bay', description: 'Relax on the island.', location: 'Orange Bay, Giftun Island', coordinates: { lat: 27.223, lng: 33.856 } },
  { time: '14:00', title: 'Lunch', description: 'Lunch onboard.', location: 'On the boat' },
  { time: '15:00', title: 'Final Swim', description: 'Last sea stop.', location: 'Red Sea' },
  { time: '16:00', title: 'Hurghada Marina', description: 'Return to the marina.', location: 'Hurghada Marina', coordinates: { lat: 27.242, lng: 33.843 } },
  { time: '17:00', title: 'Hotel Drop-off', description: 'Return to your hotel.', location: 'Your Hotel' },
];

function ControlledMap() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <InteractiveItineraryMap
      itinerary={itinerary}
      openMapsUrl="https://maps.example.test/route"
      activeIndex={activeIndex}
      onSelect={setActiveIndex}
    />
  );
}

describe('InteractiveItineraryMap', () => {
  it('uses a keyless open map renderer instead of Google map assets', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/tours/InteractiveItineraryMap.tsx'),
      'utf8',
    );
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(packageJson.dependencies['maplibre-gl']).toBe('5.24.0');
    expect(source).toContain("import('maplibre-gl')");
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain("map.once('style.load'");
    expect(source).toContain('className="h-full w-full"');
    expect(source).toContain('https://tiles.openfreemap.org/styles/bright');
    expect(source).toContain('if (positions.length > 1)');
    expect(source).toContain("id: 'eeo-itinerary-route-casing'");
    expect(source).not.toContain('AttributionControl');
    expect(source).not.toContain('new maplibre.Popup');
    expect(source).not.toContain('maps.googleapis.com');
  });

  it('exposes one tap and keyboard target for every itinerary stage', () => {
    render(<ControlledMap />);
    const stageButtons = screen.getAllByRole('button', { name: /Show stage/i });
    const stageSelector = screen.getByLabelText('Select an itinerary stage');
    const detailCard = screen.getByTestId('itinerary-map-stage-card');
    expect(stageButtons).toHaveLength(8);
    expect(screen.getByLabelText('Interactive tour route with 8 numbered stages')).toBeInTheDocument();
    expect(stageSelector.compareDocumentPosition(detailCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('updates the visible detail card when a stage is hovered, focused, or clicked', () => {
    render(<ControlledMap />);
    const orangeBay = screen.getByRole('button', { name: 'Show stage 4: Orange Bay' });
    fireEvent.mouseEnter(orangeBay);
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Orange Bay');
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Exact place');

    const lunch = screen.getByRole('button', { name: 'Show stage 5: Lunch' });
    fireEvent.click(lunch);
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Lunch');
    expect(screen.getByTestId('itinerary-map-stage-card')).toHaveTextContent('Approximate stage');
  });

  it('shows required open-map attribution and retains external directions', () => {
    render(<ControlledMap />);
    expect(screen.getByRole('link', { name: 'OpenMapTiles' })).toHaveAttribute(
      'href',
      'https://www.openmaptiles.org/',
    );
    expect(screen.getByRole('link', { name: 'OpenStreetMap contributors' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
    expect(screen.getAllByRole('link', { name: 'Open route' })[0]).toHaveAttribute(
      'href',
      'https://maps.example.test/route',
    );
    expect(screen.getByText(/Generic pickup, sea and onboard stages are approximate/i)).toBeInTheDocument();
    expect(screen.getByText(/Road map · 8 route stages/i)).toBeInTheDocument();
  });

  it('renders a designed unavailable state instead of a broken image when coordinates are absent', async () => {
    render(
      <InteractiveItineraryMap
        itinerary={[{ title: 'Pickup', description: 'Meet your guide.', location: 'Your Hotel' }]}
        openMapsUrl="https://maps.example.test/route"
        activeIndex={0}
        onSelect={() => undefined}
      />,
    );
    expect(await screen.findByText('The route map is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Tour route map' })).not.toBeInTheDocument();
  });
});
