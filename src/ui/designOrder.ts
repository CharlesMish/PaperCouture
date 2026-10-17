import { GARMENTS } from '../fold/garments';

// Presentation order only: stable design IDs and construction defaults stay intact.
const featured = ['swing-coat', 'fit-flare', 'camp-shirt', 'capelet', 'pleats',
  'wrap-top', 'mitten-left', 'mitten-right', 'boot-left', 'boot-right', 'necktie',
  'framed-brooch', 'clutch', 'hat', 'tunic', 'boat-top', 'vest', 'skirt', 'dress',
  'jacket', 'apron', 'tabard'];
export const BROWSE_GARMENTS = [...GARMENTS].sort((a, b) => {
  const rank = (id: string) => featured.includes(id) ? featured.indexOf(id) : featured.length;
  return rank(a.id) - rank(b.id);
});
