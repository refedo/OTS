import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve an uploaded-file path to a browser-ready URL.
 * Prepends NEXT_PUBLIC_BASE_PATH only when the path doesn't already start with it,
 * so paths stored with or without the prefix both work correctly.
 */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!base) return path;
  // Avoid double-prefix for paths already containing the basePath
  if (path.startsWith(base + '/') || path === base) return path;
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}
