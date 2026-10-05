import {useEffect, useMemo, useState} from 'react';
import {api} from '@controleonline/ui-common/src/api';
import {createShopCustomizationSource} from './shopCustomizationSource';

export default function useShopCustomizationSource({enabled, companyId, productId}) {
  const [product, setProduct] = useState(null);
  const source = useMemo(() => enabled ? createShopCustomizationSource({
    companyId, productId, fetchCatalog: (...args) => api.fetch(...args),
  }) : null, [enabled, companyId, productId]);
  useEffect(() => {
    let active = true;
    setProduct(null);
    source?.load().then(value => { if (active) setProduct(value); }).catch(() => {});
    return () => { active = false; };
  }, [source]);
  return {source, product};
}
