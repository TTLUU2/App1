/**
 * Minimal class-name joiner for the deals components.
 *
 * Upstream uses tailwind-merge; we don't have that dependency here, and the
 * deals components don't rely on conflict-resolution semantics — plain
 * clsx is enough to merge conditional class strings.
 */
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
