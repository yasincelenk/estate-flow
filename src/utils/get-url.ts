/**
 * Dynamic URL helper that determines the correct base URL based on environment
 * This ensures authentication works correctly on both localhost and Vercel deployments
 */
export function getURL(): string {
  // Check for explicit site URL (production environment)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  
  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  
  // Default to localhost for development
  return 'http://localhost:3000';
}

/**
 * Get the full URL with path
 */
export function getFullURL(path: string = ''): string {
  const baseURL = getURL();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL}${cleanPath}`;
}

/**
 * Get authentication redirect URL
 */
export function getAuthRedirectURL(path: string = '/auth/confirm'): string {
  return getFullURL(path);
}

/**
 * Get results redirect URL
 */
export function getResultsRedirectURL(): string {
  return getFullURL('/results');
}