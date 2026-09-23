export interface NavItem {
  path: string;
  /** Translation key. */
  label: string;
}

/** Pages of the signed-in area, in the order they appear in the navigation. */
export const PRIVATE_NAV_ITEMS: readonly NavItem[] = [
  { path: '/write', label: 'nav.write' },
  { path: '/history', label: 'nav.history' },
  { path: '/practice', label: 'nav.practice' },
  { path: '/progress', label: 'nav.progress' },
  { path: '/settings', label: 'nav.settings' },
];
