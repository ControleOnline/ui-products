import {useEffect,useMemo,useRef,useState} from 'react';
import {useStore} from '@store';
import eventBus from '@controleonline/ui-common/src/react/components/EventBus';
import {getCatalogCacheScope} from '../../utils/catalogCacheScope';
import {readCatalogRecord,writeCatalogRecord} from '../../utils/cachedCatalogActions';
import {api} from '@controleonline/ui-common/src/api';
import {ALL_PRODUCTS_SENTINEL_ID} from '../../constants/categorySentinels';
import {buildProductCatalogRequestParams} from '../../utils/productCatalogRequestParams';

export async function fetchCategoryProductCount(categoryId,companyId,context,signal,refresh=false) {
 const scope=await getCatalogCacheScope(companyId,context);
 const assertCurrent=async()=>{
  if(signal?.aborted || (await getCatalogCacheScope(companyId,context)!==scope)){
   const error=new Error('Catalog count context changed or request aborted');error.name='AbortError';throw error;
  }
 };
 await assertCurrent();
 const params=buildProductCatalogRequestParams({categoryId,companyId,context});
 const query=new URLSearchParams();
 Object.entries({...params,itemsPerPage:1,'properties[]':'id'}).forEach(([key,value])=>{
  (Array.isArray(value)?value:[value]).forEach(item=>query.append(Array.isArray(value)?`${key}[]`:key,String(item)));
 });
 const id=JSON.stringify(['category-product-count',scope,companyId,context,String(query)]);
 const cached=scope&&!refresh?await readCatalogRecord(id):null;
 await assertCurrent();
 if(Number.isInteger(cached?.count)&&cached.count>=0&&Date.now()-cached.updatedAt<60000)return cached.count;
 const data=await api.fetch(`products?${query}`,{signal});
 const total=data?.totalItems??data?.['hydra:totalItems'];
 if(total===null||total===undefined||total===''||typeof total==='boolean'||!Number.isInteger(Number(total))||Number(total)<0)throw Error('Category total unavailable');
 await assertCurrent();
 if(scope)await writeCatalogRecord({id,count:Number(total),updatedAt:Date.now()});
 await assertCurrent();
 return Number(total);
}

// Read the canonical product collection total, which applies descendant-category
// DISTINCT filtering and the same active/type/company rules as the sale list.
export default function useCategoryProductCounts({categories,companyId,context,enabled}) {
 const ids=[ALL_PRODUCTS_SENTINEL_ID,...new Set((categories||[]).map(c=>String(c.id||c['@id']?.split('/').pop()||'')).filter(Boolean))];
 const auth=useStore('auth').getters,device=useStore('device').getters;
 const forceRefresh=useRef(false);
 const [revision,setRevision]=useState(0),[result,setResult]=useState({scope:null,counts:{},failed:false});
 const scope=useMemo(()=>({companyId,context,ids}),[companyId,context,JSON.stringify(ids),auth.user,auth.isLogged,device.item,revision]);
 useEffect(()=>{const invalidate=()=>setRevision(n=>n+1);eventBus.on('product-catalog-cache:cleared',invalidate);return()=>eventBus.off('product-catalog-cache:cleared',invalidate);},[]);
 useEffect(()=>{
  if(!enabled||!companyId||!ids.length)return;
  let cancelled=false,index=0;const controller=new AbortController();
  const refresh=forceRefresh.current;forceRefresh.current=false;
  setResult({scope,counts:{},failed:false});
  const worker=async()=>{
   while(!cancelled&&index<ids.length){const id=ids[index++];
    try{const count=await fetchCategoryProductCount(id,companyId,context,controller.signal,refresh);
     if(!cancelled)setResult(current=>({...current,counts:{...current.counts,[id]:count}}));
    }catch{if(!cancelled)setResult(current=>({...current,failed:true}));}
   }
  };
  void Promise.all([worker(),worker()]);
  return()=>{cancelled=true;controller.abort();};
 },[enabled,scope,revision]);
 return {...(result.scope===scope?result:{counts:{},failed:false}),retry:()=>{forceRefresh.current=true;setRevision(n=>n+1);}};
}
