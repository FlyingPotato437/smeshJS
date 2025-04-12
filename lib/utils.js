/**
 * Combines multiple class names into a single string
 * Useful for combining tailwind classes conditionally
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
} 