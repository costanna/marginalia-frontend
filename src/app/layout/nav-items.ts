export interface NavItem {
  path: string;
  /** Translation key. */
  label: string;
}

/**
 * Pages of the signed-in area. Entries are added as each feature is built (practice and progress
 * arrive in later phases): linking to a page that does not exist yet would
 * only lead to the 404 page.
 */
export const PRIVATE_NAV_ITEMS: readonly NavItem[] = [
  { path: '/write', label: 'nav.write' },
  { path: '/history', label: 'nav.history' },
  { path: '/settings', label: 'nav.settings' },
];
