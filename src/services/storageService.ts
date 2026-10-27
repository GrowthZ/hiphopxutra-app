import { StorageConfig } from '../domain/types';

// Per-browser settings for placeholder images. Uploading photos lives in ./media.ts (Cloudflare R2).

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  placeholders: {
    maleAvatarUrl: '',
    femaleAvatarUrl: '',
    maleHalfBodyUrl: '',
    femaleHalfBodyUrl: '',
    team2v2Url: '',
  },
};

const STORAGE_CONFIG_KEY = 'hiphop_xu_tra_storage_config';

export function getSavedStorageConfig(): StorageConfig {
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { placeholders: { ...DEFAULT_STORAGE_CONFIG.placeholders, ...(parsed.placeholders || {}) } };
    }
  } catch (e) {
    console.warn('Failed to load storage config:', e);
  }
  return DEFAULT_STORAGE_CONFIG;
}

export function saveStorageConfig(config: StorageConfig) {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save storage config:', e);
  }
}

/**
 * Convert any Google Drive URL into a direct embeddable image URL
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Pattern: drive.google.com/file/d/{id} or /open?id={id} or /uc?id={id}
  const fileIdMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    // Google's high-speed thumbnail / content delivery endpoint
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
  }

  return trimmed;
}
