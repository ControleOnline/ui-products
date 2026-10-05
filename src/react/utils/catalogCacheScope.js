import {api} from '@controleonline/ui-common/src/api';
import {env} from '@env';
import {resolveApiEntryPoint} from '@controleonline/ui-common/src/utils/apiEntryPoint';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';

// Match the API's effective DEVICE (master first), tenant and session. Persist
// only a session digest, never an API token or the localStorage session object.
export async function getCatalogCacheScope(companyId, context = 'products') {
  if (!companyId || typeof localStorage === 'undefined' || !globalThis.crypto?.subtle) return null;
  try {
    const token = await api.getToken();
    if (!token) return null;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(token)));
    const session = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const master = JSON.parse(localStorage.getItem('master-device') || '{}');
    const device = master?.id ? master : JSON.parse(localStorage.getItem('device') || '{}');
    if (!device?.id) return null;
    return JSON.stringify([1, resolveApiEntryPoint(env.API_ENTRYPOINT), resolveAppDomain(env.DOMAIN),
      session, String(companyId), String(device.id), String(device.type || '').toUpperCase(), context]);
  } catch { return null; }
}
