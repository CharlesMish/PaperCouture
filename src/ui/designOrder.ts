import { GARMENTS } from '../fold/garments';

// Presentation order only: stable design IDs and construction defaults stay intact.
const featured = ['kimono', 'coat-dress', 'gown', 'sensu', 'trousers', 'cloche', 'kinchaku', 'zori', 'swing-coat', 'fit-flare', 'camp-shirt', 'shell-top', 'capelet', 'pleats',
  'wrap-top', 'mitten-left', 'mitten-right', 'boot-left', 'boot-right', 'necktie',
  'framed-brooch', 'clutch', 'hat', 'tunic', 'boat-top', 'vest', 'skirt', 'dress',
  'jacket', 'apron', 'tabard'];
/** Retired from browsing: superseded or hard to read as what they are. They stay
 * in the registry, so old links, saved boards and checks keep working, and the
 * name selector keeps them as hidden options so such a link still selects them. */
export const RETIRED_DESIGNS: readonly string[] = ['tunic', 'tabard', 'hat', 'boat-top', 'apron'];
const ordered = [...GARMENTS].sort((a, b) => {
  const rank = (id: string) => featured.includes(id) ? featured.indexOf(id) : featured.length;
  return rank(a.id) - rank(b.id);
});
export const BROWSE_GARMENTS = ordered.filter((g) => !RETIRED_DESIGNS.includes(g.id));
/** Every design, retired ones last: the name selector's options. */
export const ALL_GARMENTS_IN_ORDER = [...BROWSE_GARMENTS, ...ordered.filter((g) => RETIRED_DESIGNS.includes(g.id))];
