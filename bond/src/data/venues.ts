import type { Venue } from '@/lib/types';

/** DEMO DATA — a realistic Barcelona venue catalogue used by the mock Places adapter. */
export const DEMO_VENUES: Venue[] = [
  {
    id: 'v_monocrom',
    name: 'Monocrom',
    category: 'restaurant',
    address: 'Carrer de la Diputació 249, Barcelona',
    lat: 41.3899,
    lng: 2.1652,
    priceLevel: 3,
    atmosphereTags: ['intimate', 'creative', 'quiet'],
    dietaryTags: ['vegetarian_options', 'wine_pairing'],
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_gresca',
    name: 'Gresca',
    category: 'restaurant',
    address: 'Carrer de Provença 230, Barcelona',
    lat: 41.3906,
    lng: 2.1571,
    priceLevel: 3,
    atmosphereTags: ['refined', 'cosy', 'foodie'],
    dietaryTags: ['vegetarian_options', 'wine_pairing'],
    image:
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_disfrutar',
    name: 'Disfrutar',
    category: 'restaurant',
    address: 'Carrer de Villarroel 163, Barcelona',
    lat: 41.386,
    lng: 2.1518,
    priceLevel: 4,
    atmosphereTags: ['special', 'creative', 'lively'],
    dietaryTags: ['vegetarian_options', 'tasting_menu'],
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_vinitus',
    name: 'Vinitus',
    category: 'wine_bar',
    address: 'Carrer del Consell de Cent 333, Barcelona',
    lat: 41.3903,
    lng: 2.1637,
    priceLevel: 2,
    atmosphereTags: ['lively', 'casual', 'buzzy'],
    dietaryTags: ['tapas', 'gluten_free_options'],
    image:
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_barbrutal',
    name: 'Bar Brutal',
    category: 'wine_bar',
    address: "Carrer de la Princesa 14, Barcelona",
    lat: 41.3859,
    lng: 2.1815,
    priceLevel: 2,
    atmosphereTags: ['casual', 'natural_wine', 'relaxed'],
    dietaryTags: ['vegetarian_options', 'natural_wine'],
    image:
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_nomad',
    name: 'Nømad Coffee',
    category: 'cafe',
    address: 'Passatge Sert 12, Barcelona',
    lat: 41.3899,
    lng: 2.1755,
    priceLevel: 1,
    atmosphereTags: ['quiet', 'daytime', 'relaxed'],
    dietaryTags: ['vegan_options', 'specialty_coffee'],
    image:
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_satan',
    name: "Satan's Coffee Corner",
    category: 'cafe',
    address: 'Carrer de l’Arc de Sant Ramon del Call 11, Barcelona',
    lat: 41.3823,
    lng: 2.1755,
    priceLevel: 1,
    atmosphereTags: ['daytime', 'cosy', 'creative'],
    dietaryTags: ['vegan_options', 'brunch'],
    image:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
  {
    id: 'v_paradiso',
    name: 'Paradiso',
    category: 'bar',
    address: 'Carrer de Rera Palau 4, Barcelona',
    lat: 41.3844,
    lng: 2.1836,
    priceLevel: 3,
    atmosphereTags: ['special', 'buzzy', 'evening'],
    dietaryTags: ['cocktails'],
    image:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=60',
    isDemo: true,
  },
];

export const venueById = (id: string) => DEMO_VENUES.find((v) => v.id === id);
