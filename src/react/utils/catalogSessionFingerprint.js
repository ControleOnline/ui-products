import {Platform} from 'react-native';
import SHA256 from 'crypto-js/sha256';

export async function fingerprintCatalogSession(token) {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return SHA256(String(token)).toString();
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(token)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
