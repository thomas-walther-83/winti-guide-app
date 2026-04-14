import type { ListingCategory } from '../types';

/**
 * Static subcategory (sub_type) definitions per listing category.
 * These must match the sub_type values stored in the database.
 */
export const SUB_CATEGORIES: Record<ListingCategory, string[]> = {
  restaurants: [
    'Schweizer Küche',
    'Italienisch',
    'Asiatisch',
    'Burger & Grill',
    'Vegetarisch',
    'International',
    'Pizza',
    'Sushi',
  ],
  cafes: ['Konditorei', 'Café-Bar', 'Bistro', 'Bäckerei', 'Frühstück'],
  bars: ['Cocktailbar', 'Weinbar', 'Craft Beer', 'Kulturbar', 'Tapas'],
  hotels: ['Luxus', 'Mittelklasse', 'Budget', 'Boutique', 'Hostel'],
  sightseeing: ['Altstadt', 'Kirchen', 'Aussichtspunkte', 'Historisch'],
  kultur: ['Museum', 'Theater', 'Konzert', 'Galerie', 'Kulturzentrum'],
  geschaefte: ['Mode', 'Bücher', 'Lebensmittel', 'Elektronik', 'Souvenirs'],
  sport: ['Schwimmbad', 'Tennis', 'Fitness', 'Fussball', 'Yoga', 'Eishockey', 'Radfahren'],
  touren: ['Stadtführung', 'Wandern', 'E-Bike', 'Radtour', 'Weinland'],
};
