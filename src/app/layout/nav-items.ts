export interface NavItem {
  path: string;
  /** Translation key. */
  label: string;
}

/**
 * Pages of the signed-in area. Entries are added as each feature is built (progress arrives in a
 * later phase): linking to a page that does not exist yet would only lead to the 404 page.
 */
export const PRIVATE_NAV_ITEMS: readonly NavItem[] = [
  { path: '/write', label: 'nav.write' },
  { path: '/history', label: 'nav.history' },
  { path: '/practice', label: 'nav.practice' },
  { path: '/settings', label: 'nav.settings' },
];
