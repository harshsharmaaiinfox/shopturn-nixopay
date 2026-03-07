/**
 * List of category names that should be disabled (not clickable/selectable)
 */
export const DISABLED_CATEGORIES: string[] = [
  'Innerwear',
  'Ethnic Wear',
  'Western Wear',
  'Men Collection',
  'Men Western Wear',
  'Men Ethnic Wear',
  'Women Innerwear',
  'Women Ethnic Wear',
  'Women Western Wear',
  'Women Collection',
  'Active Style',
  'Gym & Training',
  'Sports & Performance'
];

/**
 * Checks if a category should be disabled based on its name
 * @param categoryName - The name of the category to check
 * @returns true if the category should be disabled, false otherwise
 */
export function isCategoryDisabled(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false;
  return DISABLED_CATEGORIES.includes(categoryName);
}

