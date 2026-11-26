import {api} from '@controleonline/ui-common/src/api';
import {env} from '@env';
import {resolveApiEntryPoint} from '@controleonline/ui-common/src/utils/apiEntryPoint';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';
import {getProductCatalogCacheRevision} from '@controleonline/ui-common/src/react/utils/productCatalogCacheRevision';
import {fingerprintCatalogSession} from './catalogSessionFingerprint';
import {app_type} from '@appType';
import {getAllStores} from '@store';

// Match the API's effective DEVICE (master first), tenant and session. Persist
// only a session digest, never an API token or the localStorage session object.
export async function getCatalogCacheScope(companyId, context = 'products') {
  if (!companyId || typeof localStorage === 'undefined') return null;
  try {
    const token = await api.getToken();
    if (!token) return null;
    const auth = getAllStores?.()?.auth?.getters;
    if (auth?.isLogged === false) return null;
    const user = auth?.user;
    const identity = user ? JSON.stringify([String(token), user.id || user.username || '',
      Array.isArray(user.roles) ? [...user.roles].sort() : []]) : String(token);
    const session = await fingerprintCatalogSession(identity);
    if (!session) return null;
    const master = JSON.parse(localStorage.getItem('master-device') || '{}');
    const device = master?.id ? master : JSON.parse(localStorage.getItem('device') || '{}');
    if (!device?.id) return null;
    return JSON.stringify([1, resolveApiEntryPoint(env.API_ENTRYPOINT), resolveAppDomain(env.DOMAIN),
      session, String(companyId), String(device.id), String(device.type || '').toUpperCase(), context,
      String(app_type || '').toUpperCase(), getProductCatalogCacheRevision()]);
  } catch { return null; }
}
