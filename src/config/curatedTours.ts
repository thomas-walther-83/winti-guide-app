/**
 * Kuratierte (redaktionelle) Touren durch Winterthur. Statisch hinterlegt –
 * jede:r kann sie ohne Login auf der Karte ansehen (nummerierte Stops + Fußroute).
 * Koordinaten sind bewusst kompakt/laufbar gewählt.
 */
export interface CuratedTour {
  id: string;
  name: string;
  description: string;
  emoji: string;
  stops: { lat: number; lon: number; name: string }[];
}

export const CURATED_TOURS: CuratedTour[] = [
  {
    id: 'altstadt',
    name: 'Altstadt-Rundgang',
    description: 'Die schönsten Ecken der Winterthurer Altstadt – ca. 1,5 km',
    emoji: '🏛️',
    stops: [
      { lat: 47.5001, lon: 8.7236, name: 'Hauptbahnhof Winterthur' },
      { lat: 47.4998, lon: 8.7276, name: 'Marktgasse' },
      { lat: 47.4995, lon: 8.7286, name: 'Stadtkirche' },
      { lat: 47.4996, lon: 8.7283, name: 'Rathaus' },
      { lat: 47.5010, lon: 8.7305, name: 'Gewerbemuseum' },
      { lat: 47.5035, lon: 8.7270, name: 'Stadtpark' },
    ],
  },
  {
    id: 'museen',
    name: 'Museen & Kunst',
    description: 'Winterthur als Museumsstadt – von der Kunst bis zur Fotografie',
    emoji: '🎨',
    stops: [
      { lat: 47.5030, lon: 8.7300, name: 'Kunst Museum Winterthur' },
      { lat: 47.5025, lon: 8.7320, name: 'Lindengut-Museum' },
      { lat: 47.5010, lon: 8.7305, name: 'Gewerbemuseum' },
      { lat: 47.4960, lon: 8.7250, name: 'Villa Flora' },
      { lat: 47.4890, lon: 8.7350, name: 'Fotomuseum Winterthur' },
    ],
  },
  {
    id: 'parks',
    name: 'Parks & Aussicht',
    description: 'Grünes Winterthur – Parks, Natur und ein Aussichtspunkt',
    emoji: '🌳',
    stops: [
      { lat: 47.5035, lon: 8.7270, name: 'Stadtpark' },
      { lat: 47.5025, lon: 8.7320, name: 'Lindengut-Park' },
      { lat: 47.4950, lon: 8.7080, name: 'Goldenberg (Aussicht)' },
      { lat: 47.5030, lon: 8.7660, name: 'Eulachpark' },
    ],
  },
];
