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

/**
 * Maps each German UI label to lowercase OSM tag values that should also match.
 * OSM data uses English cuisine/amenity/tourism tags, so we need to bridge the gap.
 */
export const SUB_CATEGORY_ALIASES: Record<string, string[]> = {
  // restaurants
  'Schweizer Küche': ['schweizer küche', 'swiss', 'regional', 'local'],
  'Italienisch':     ['italienisch', 'italian'],
  'Asiatisch':       ['asiatisch', 'asian', 'chinese', 'thai', 'vietnamese', 'indian', 'korean'],
  'Burger & Grill':  ['burger & grill', 'burger', 'american', 'grill', 'barbecue', 'bbq', 'steak', 'fast_food'],
  'Vegetarisch':     ['vegetarisch', 'vegetarian', 'vegan'],
  'International':   ['international'],
  'Pizza':           ['pizza'],
  'Sushi':           ['sushi', 'japanese'],
  // cafes
  'Konditorei':  ['konditorei', 'confectionery', 'pastry'],
  'Café-Bar':    ['café-bar', 'cafe', 'cafe_bar'],
  'Bistro':      ['bistro'],
  'Bäckerei':    ['bäckerei', 'bakery'],
  'Frühstück':   ['frühstück', 'breakfast'],
  // bars
  'Cocktailbar': ['cocktailbar', 'cocktail', 'bar'],
  'Weinbar':     ['weinbar', 'wine_bar', 'wine'],
  'Craft Beer':  ['craft beer', 'craft_beer', 'pub', 'beer'],
  'Kulturbar':   ['kulturbar', 'nightclub', 'music_venue'],
  'Tapas':       ['tapas'],
  // hotels
  'Luxus':       ['luxus', 'luxury'],
  'Mittelklasse':['mittelklasse', 'hotel'],
  'Budget':      ['budget', 'motel'],
  'Boutique':    ['boutique', 'guest_house'],
  'Hostel':      ['hostel'],
  // sightseeing
  'Altstadt':       ['altstadt', 'old_town'],
  'Kirchen':        ['kirchen', 'church', 'place_of_worship'],
  'Aussichtspunkte':['aussichtspunkte', 'viewpoint'],
  'Historisch':     ['historisch', 'monument', 'castle', 'building', 'historic', 'ruins'],
  // kultur
  'Museum':       ['museum'],
  'Theater':      ['theater', 'theatre'],
  'Konzert':      ['konzert', 'concert'],
  'Galerie':      ['galerie', 'gallery'],
  'Kulturzentrum':['kulturzentrum', 'arts_centre', 'cinema'],
  // geschaefte
  'Mode':        ['mode', 'clothes', 'fashion'],
  'Bücher':      ['bücher', 'books'],
  'Lebensmittel':['lebensmittel', 'supermarket', 'organic', 'marketplace', 'food'],
  'Elektronik':  ['elektronik', 'electronics'],
  'Souvenirs':   ['souvenirs', 'gift', 'souvenir'],
  // sport
  'Schwimmbad':['schwimmbad', 'swimming_pool', 'public_bath'],
  'Tennis':    ['tennis'],
  'Fitness':   ['fitness', 'fitness_centre', 'sports_centre', 'gym'],
  'Fussball':  ['fussball', 'soccer', 'football', 'pitch'],
  'Yoga':      ['yoga'],
  'Eishockey': ['eishockey', 'ice_rink', 'ice_hockey'],
  'Radfahren': ['radfahren', 'cycling', 'bicycle'],
  // touren
  'Stadtführung':['stadtführung', 'city_tour', 'walking_tour'],
  'Wandern':     ['wandern', 'hiking'],
  'E-Bike':      ['e-bike', 'e_bike', 'ebike'],
  'Radtour':     ['radtour', 'bike_tour'],
  'Weinland':    ['weinland', 'wine_tour', 'vineyard'],
};
