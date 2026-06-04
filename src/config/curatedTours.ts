/**
 * Kuratierte (redaktionelle) Touren durch Winterthur. Statisch hinterlegt –
 * jede:r kann sie ohne Login auf der Karte ansehen (nummerierte Stops + Fußroute).
 *
 * Hinweis: Koordinaten sind Best-Effort-Schätzungen (Sandbox hat keinen
 * Nominatim-Zugriff). Sobald die DB-gestützten Admin-Touren stehen, werden
 * sie dort per Karte präzisiert.
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
      { lat: 47.5005, lon: 8.7237, name: 'Hauptbahnhof Winterthur' },
      { lat: 47.5004, lon: 8.7290, name: 'Marktgasse' },
      { lat: 47.5009, lon: 8.7297, name: 'Stadtkirche' },
      { lat: 47.5006, lon: 8.7285, name: 'Rathaus' },
      { lat: 47.5009, lon: 8.7301, name: 'Gewerbemuseum' },
      { lat: 47.5025, lon: 8.7310, name: 'Stadtpark' },
    ],
  },
  {
    id: 'museen',
    name: 'Museen & Kunst',
    description: 'Winterthur als Museumsstadt – von der Kunst bis zur Fotografie',
    emoji: '🎨',
    stops: [
      { lat: 47.5025, lon: 8.7312, name: 'Kunst Museum Winterthur' },
      { lat: 47.4985, lon: 8.7345, name: 'Lindengut-Museum' },
      { lat: 47.5009, lon: 8.7301, name: 'Gewerbemuseum' },
      { lat: 47.4970, lon: 8.7295, name: 'Villa Flora' },
      { lat: 47.4882, lon: 8.7285, name: 'Fotomuseum Winterthur' },
    ],
  },
  {
    id: 'parks',
    name: 'Parks & Aussicht',
    description: 'Grünes Winterthur – Parks, Natur und ein Aussichtspunkt',
    emoji: '🌳',
    stops: [
      { lat: 47.5025, lon: 8.7310, name: 'Stadtpark' },
      { lat: 47.4985, lon: 8.7345, name: 'Lindengut-Park' },
      { lat: 47.4955, lon: 8.7090, name: 'Goldenberg (Aussicht)' },
      { lat: 47.5045, lon: 8.7610, name: 'Eulachpark' },
    ],
  },
];
