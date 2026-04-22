type TenantMenuDestination = {
  name: string;
  slug: string;
  image: string;
  country: string;
};

type TenantMenuCategory = {
  name: string;
  slug: string;
  icon: string;
};

type TenantFooterDestination = {
  _id: string;
  name: string;
  slug: string;
};

type TenantScopedEntity = {
  tenantId?: string | null;
  tenantIds?: string[] | null;
};

const tenantDestinationPresets: Record<string, TenantMenuDestination[]> = {
  hurghada: [
    { name: 'Hurghada Marina', slug: 'hurghada-marina', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', country: 'Red Sea' },
    { name: 'Giftun Island', slug: 'giftun-island', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Orange Bay', slug: 'orange-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'Mahmya Island', slug: 'mahmya-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Sahl Hasheesh', slug: 'sahl-hasheesh', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&q=80', country: 'Red Sea' },
    { name: 'El Dahar', slug: 'el-dahar', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f0e?w=400&q=80', country: 'Hurghada' },
  ],
  speedboat: [
    { name: 'Giftun Island', slug: 'giftun-island', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Orange Bay', slug: 'orange-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'Mahmya Island', slug: 'mahmya-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Paradise Island', slug: 'paradise-island', image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80', country: 'Red Sea' },
    { name: 'Dolphin House', slug: 'dolphin-house', image: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=400&q=80', country: 'Red Sea' },
    { name: 'Hurghada Marina', slug: 'hurghada-marina', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', country: 'Red Sea' },
  ],
  cairo: [
    { name: 'Giza Pyramids', slug: 'giza-pyramids', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f0e?w=400&q=80', country: 'Egypt' },
    { name: 'Egyptian Museum', slug: 'egyptian-museum', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&q=80', country: 'Cairo' },
    { name: 'Khan El Khalili', slug: 'khan-el-khalili', image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80', country: 'Old Cairo' },
    { name: 'Old Cairo', slug: 'old-cairo', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=80', country: 'Cairo' },
    { name: 'Saqqara', slug: 'saqqara', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&q=80', country: 'Giza' },
    { name: 'Nile Corniche', slug: 'nile-corniche', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', country: 'Cairo' },
  ],
  makadi: [
    { name: 'Makadi Bay', slug: 'makadi-bay', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400&q=80', country: 'Red Sea' },
    { name: 'Orange Bay', slug: 'orange-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'Giftun Island', slug: 'giftun-island', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Mahmya Island', slug: 'mahmya-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Soma Bay', slug: 'soma-bay', image: 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=400&q=80', country: 'Red Sea' },
    { name: 'Hurghada Marina', slug: 'hurghada-marina', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', country: 'Red Sea' },
  ],
  elGouna: [
    { name: 'Abu Tig Marina', slug: 'abu-tig-marina', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&q=80', country: 'El Gouna' },
    { name: 'Zeytouna Beach', slug: 'zeytouna-beach', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'El Gouna' },
    { name: 'Mangroovy Beach', slug: 'mangroovy-beach', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400&q=80', country: 'El Gouna' },
    { name: 'Downtown El Gouna', slug: 'downtown-el-gouna', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80', country: 'El Gouna' },
    { name: 'Ancient Sands', slug: 'ancient-sands', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80', country: 'El Gouna' },
    { name: 'Sliders Cable Park', slug: 'sliders-cable-park', image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80', country: 'El Gouna' },
  ],
  luxor: [
    { name: 'Valley of the Kings', slug: 'valley-of-the-kings', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&q=80', country: 'Luxor' },
    { name: 'Karnak Temple', slug: 'karnak-temple', image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80', country: 'Luxor' },
    { name: 'Luxor Temple', slug: 'luxor-temple', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', country: 'Luxor' },
    { name: 'Hatshepsut Temple', slug: 'hatshepsut-temple', image: 'https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?w=400&q=80', country: 'West Bank' },
    { name: 'West Bank', slug: 'west-bank', image: 'https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=400&q=80', country: 'Luxor' },
    { name: 'Nile River', slug: 'nile-river-luxor', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', country: 'Upper Egypt' },
  ],
  sharm: [
    { name: 'Ras Mohammed', slug: 'ras-mohammed', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'White Island', slug: 'white-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Tiran Island', slug: 'tiran-island', image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=400&q=80', country: 'Sinai' },
    { name: 'Naama Bay', slug: 'naama-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Sharm El Sheikh' },
    { name: 'Soho Square', slug: 'soho-square', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80', country: 'Sharm El Sheikh' },
    { name: 'Old Market', slug: 'old-market-sharm', image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80', country: 'Sharm El Sheikh' },
  ],
  aswan: [
    { name: 'Philae Temple', slug: 'philae-temple', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&q=80', country: 'Aswan' },
    { name: 'Abu Simbel', slug: 'abu-simbel', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', country: 'Upper Egypt' },
    { name: 'High Dam', slug: 'high-dam', image: 'https://images.unsplash.com/photo-1482192505345-5655af888cc4?w=400&q=80', country: 'Aswan' },
    { name: 'Nubian Village', slug: 'nubian-village', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80', country: 'Aswan' },
    { name: 'Elephantine Island', slug: 'elephantine-island', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', country: 'Aswan' },
    { name: 'Unfinished Obelisk', slug: 'unfinished-obelisk', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=80', country: 'Aswan' },
  ],
  marsaAlam: [
    { name: 'Abu Dabbab', slug: 'abu-dabbab', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Marsa Alam' },
    { name: 'Sataya Reef', slug: 'sataya-reef', image: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=400&q=80', country: 'Red Sea' },
    { name: 'Hamata Islands', slug: 'hamata-islands', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Port Ghalib', slug: 'port-ghalib', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', country: 'Marsa Alam' },
    { name: 'Sharm El Luli', slug: 'sharm-el-luli', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'Wadi El Gemal', slug: 'wadi-el-gemal', image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80', country: 'Marsa Alam' },
  ],
  dahab: [
    { name: 'Blue Hole', slug: 'blue-hole', image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=400&q=80', country: 'Dahab' },
    { name: 'Three Pools', slug: 'three-pools', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Dahab' },
    { name: 'Dahab Lagoon', slug: 'dahab-lagoon', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400&q=80', country: 'Dahab' },
    { name: 'Mount Sinai', slug: 'mount-sinai', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80', country: 'Sinai' },
    { name: 'Colored Canyon', slug: 'colored-canyon', image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80', country: 'Sinai' },
    { name: 'Lighthouse Reef', slug: 'lighthouse-reef', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Dahab' },
  ],
  alexandria: [
    { name: 'Citadel of Qaitbay', slug: 'citadel-of-qaitbay', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&q=80', country: 'Alexandria' },
    { name: 'Bibliotheca Alexandrina', slug: 'bibliotheca-alexandrina', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&q=80', country: 'Alexandria' },
    { name: 'Montaza Palace', slug: 'montaza-palace', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', country: 'Alexandria' },
    { name: 'Catacombs', slug: 'catacombs-of-kom-el-shoqafa', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', country: 'Alexandria' },
    { name: 'Pompey Pillar', slug: 'pompey-pillar', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&q=80', country: 'Alexandria' },
    { name: 'Corniche', slug: 'alexandria-corniche', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f0e?w=400&q=80', country: 'Mediterranean' },
  ],
};

const tenantCategoryPresets: Record<string, TenantMenuCategory[]> = {
  hurghada: [
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Snorkeling Tours', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Desert Safari', slug: 'desert-safari', icon: 'desert' },
    { name: 'Diving Trips', slug: 'diving', icon: 'dive' },
    { name: 'Water Sports', slug: 'water-sports', icon: 'water' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Airport Transfers', slug: 'airport-transfers', icon: 'transfer' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
  ],
  speedboat: [
    { name: 'Speedboat Tours', slug: 'speedboat-tours', icon: 'boat' },
    { name: 'Island Hopping', slug: 'island-hopping', icon: 'island' },
    { name: 'Snorkeling Trips', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Dolphin Watching', slug: 'dolphin-watching', icon: 'dolphin' },
    { name: 'Sunset Cruises', slug: 'sunset-cruises', icon: 'sunset' },
    { name: 'Glass Bottom Boat', slug: 'glass-bottom-boat', icon: 'boat' },
    { name: 'Fishing Trips', slug: 'fishing', icon: 'fish' },
    { name: 'Private Charters', slug: 'private-charters', icon: 'yacht' },
  ],
  cairo: [
    { name: 'Historical Tours', slug: 'historical-tours', icon: 'history' },
    { name: 'Museum Tickets', slug: 'museums', icon: 'museum' },
    { name: 'Food Tours', slug: 'food-tours', icon: 'food' },
    { name: 'Nile Cruises', slug: 'nile-cruises', icon: 'boat' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Tours', slug: 'private-tours', icon: 'vip' },
    { name: 'Airport Transfers', slug: 'airport-transfers', icon: 'transfer' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
  ],
  makadi: [
    { name: 'Snorkeling Trips', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Desert Safari', slug: 'desert-safari', icon: 'desert' },
    { name: 'Spa & Wellness', slug: 'wellness-spa', icon: 'spa' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
    { name: 'Water Sports', slug: 'water-sports', icon: 'water' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Transfers', slug: 'private-transfers', icon: 'transfer' },
  ],
  elGouna: [
    { name: 'Kitesurfing & Watersports', slug: 'kitesurfing-watersports', icon: 'kite' },
    { name: 'Yacht & Boat Trips', slug: 'yacht-boat-trips', icon: 'yacht' },
    { name: 'Diving & Snorkeling', slug: 'diving-snorkeling', icon: 'dive' },
    { name: 'Desert Adventures', slug: 'desert-adventures', icon: 'desert' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Golf & Leisure', slug: 'golf-leisure', icon: 'golf' },
    { name: 'Wellness & Spa', slug: 'wellness-spa', icon: 'spa' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
  ],
  luxor: [
    { name: 'Temple Tours', slug: 'temple-tours', icon: 'temple' },
    { name: 'Nile Cruises', slug: 'nile-cruises', icon: 'boat' },
    { name: 'Hot Air Balloon', slug: 'hot-air-balloon', icon: 'balloon' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Tours', slug: 'private-tours', icon: 'vip' },
    { name: 'Cultural Experiences', slug: 'cultural-experiences', icon: 'culture' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
    { name: 'Airport Transfers', slug: 'airport-transfers', icon: 'transfer' },
  ],
  sharm: [
    { name: 'Diving Tours', slug: 'diving', icon: 'dive' },
    { name: 'Snorkeling', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Desert Safari', slug: 'desert-safari', icon: 'desert' },
    { name: 'Quad Biking', slug: 'quad-biking', icon: 'quad' },
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Water Sports', slug: 'water-sports', icon: 'water' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
  ],
  aswan: [
    { name: 'Temple Tours', slug: 'temple-tours', icon: 'temple' },
    { name: 'Nile Cruises', slug: 'nile-cruises', icon: 'boat' },
    { name: 'Cultural Tours', slug: 'cultural-tours', icon: 'culture' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Tours', slug: 'private-tours', icon: 'vip' },
    { name: 'Felucca Sailing', slug: 'felucca-sailing', icon: 'boat' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
    { name: 'Transfers', slug: 'transfers', icon: 'transfer' },
  ],
  marsaAlam: [
    { name: 'Diving & Snorkeling', slug: 'diving-snorkeling', icon: 'dive' },
    { name: 'Dolphin Tours', slug: 'dolphin-tours', icon: 'dolphin' },
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Desert Safari', slug: 'desert-safari', icon: 'desert' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Transfers', slug: 'private-transfers', icon: 'transfer' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
    { name: 'Wellness', slug: 'wellness', icon: 'spa' },
  ],
  dahab: [
    { name: 'Diving & Snorkeling', slug: 'diving-snorkeling', icon: 'dive' },
    { name: 'Desert Adventures', slug: 'desert-adventures', icon: 'desert' },
    { name: 'Hiking & Trekking', slug: 'hiking-trekking', icon: 'hike' },
    { name: 'Quad Biking', slug: 'quad-biking', icon: 'quad' },
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Wellness & Yoga', slug: 'wellness-yoga', icon: 'yoga' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
  ],
  alexandria: [
    { name: 'Historical Tours', slug: 'historical-tours', icon: 'history' },
    { name: 'Museums', slug: 'museums', icon: 'museum' },
    { name: 'Walking Tours', slug: 'walking-tours', icon: 'walk' },
    { name: 'Food Tours', slug: 'food-tours', icon: 'food' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Private Tours', slug: 'private-tours', icon: 'vip' },
    { name: 'Family Activities', slug: 'family-activities', icon: 'family' },
    { name: 'Transfers', slug: 'transfers', icon: 'transfer' },
  ],
};

function createTenantAliasMap<T>(groups: Array<{ aliases: string[]; value: T }>): Record<string, T> {
  return groups.reduce<Record<string, T>>((acc, group) => {
    for (const alias of group.aliases) {
      acc[alias] = group.value;
    }
    return acc;
  }, {});
}

export const tenantMegaMenuDestinations: Record<string, TenantMenuDestination[]> = createTenantAliasMap([
  { aliases: ['hurghada', 'hurghada-excursions-online'], value: tenantDestinationPresets.hurghada },
  { aliases: ['hurghada-speedboat'], value: tenantDestinationPresets.speedboat },
  { aliases: ['cairo', 'cairo-excursions-online'], value: tenantDestinationPresets.cairo },
  { aliases: ['makadi-bay'], value: tenantDestinationPresets.makadi },
  { aliases: ['el-gouna'], value: tenantDestinationPresets.elGouna },
  { aliases: ['luxor', 'luxor-excursions'], value: tenantDestinationPresets.luxor },
  { aliases: ['sharm', 'sharm-excursions-online'], value: tenantDestinationPresets.sharm },
  { aliases: ['aswan', 'aswan-excursions'], value: tenantDestinationPresets.aswan },
  { aliases: ['marsa-alam', 'marsa-alam-excursions'], value: tenantDestinationPresets.marsaAlam },
  { aliases: ['dahab', 'dahab-excursions'], value: tenantDestinationPresets.dahab },
  { aliases: ['alexandria'], value: tenantDestinationPresets.alexandria },
]);

export const tenantMegaMenuCategories: Record<string, TenantMenuCategory[]> = createTenantAliasMap([
  { aliases: ['hurghada', 'hurghada-excursions-online'], value: tenantCategoryPresets.hurghada },
  { aliases: ['hurghada-speedboat'], value: tenantCategoryPresets.speedboat },
  { aliases: ['cairo', 'cairo-excursions-online'], value: tenantCategoryPresets.cairo },
  { aliases: ['makadi-bay'], value: tenantCategoryPresets.makadi },
  { aliases: ['el-gouna'], value: tenantCategoryPresets.elGouna },
  { aliases: ['luxor', 'luxor-excursions'], value: tenantCategoryPresets.luxor },
  { aliases: ['sharm', 'sharm-excursions-online'], value: tenantCategoryPresets.sharm },
  { aliases: ['aswan', 'aswan-excursions'], value: tenantCategoryPresets.aswan },
  { aliases: ['marsa-alam', 'marsa-alam-excursions'], value: tenantCategoryPresets.marsaAlam },
  { aliases: ['dahab', 'dahab-excursions'], value: tenantCategoryPresets.dahab },
  { aliases: ['alexandria'], value: tenantCategoryPresets.alexandria },
]);

export function getTenantFooterDestinations(tenantId?: string): TenantFooterDestination[] | undefined {
  if (!tenantId) {
    return undefined;
  }

  return tenantMegaMenuDestinations[tenantId]?.slice(0, 5).map((destination, index) => ({
    _id: `tenant-footer-${tenantId}-${index}`,
    name: destination.name,
    slug: destination.slug,
  }));
}

export function hasTenantScopedNavigationContent(
  items: TenantScopedEntity[] | undefined,
  tenantId?: string
): boolean {
  if (!tenantId || !items?.length) {
    return false;
  }

  return items.some((item) => {
    if (item.tenantId === tenantId) {
      return true;
    }

    return Array.isArray(item.tenantIds) && item.tenantIds.includes(tenantId);
  });
}
