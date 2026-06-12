/**
 * Selects the preferred image filename from an array of filenames,
 * favouring `.webp` images over other formats.
 *
 * @param images - Array of image filenames, or undefined/empty.
 * @returns The preferred filename, or an empty string if none is found.
 */
export function selectPreferredImageFilename(images: string[] | undefined): string {
  if (!images?.length) return '';
  const sanitized = images.map((name) => name.trim()).filter((name) => name.length > 0);
  const webp = sanitized.find((name) => /\.webp$/i.test(name));
  return webp ?? sanitized[0] ?? '';
}
