import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import useCachedCatalogView from '../../hooks/useCachedCatalogView';
import {useNativeCatalogActions} from './PdvProductSearch';
import {normalizeEntityId} from './categoryPageUtils';
import {ALL_PRODUCTS_SENTINEL_ID} from '../../constants/categorySentinels';

// Catalog data may be cached; entering the modern PDV always starts at categories.
export default function usePdvCategoryNavigation({modernManagerCatalog, isManagerInline,
  cacheCatalog, categoryActions, productsActions, items, companyId, context,
  scopeRevision, resetKey}) {
  const [productSearchDraft, setProductSearchDraft] = useState('');
  const [activeProductSearch, setActiveProductSearch] = useState('');
  const [activePdvCategoryId, setActivePdvCategoryId] = useState('');
  const [browseCategoryId, setBrowseCategoryId] = useState('');
  const [nativeSearchOpen, setNativeSearchOpen] = useState(false);
  const browseCategories = useCallback((categoryId = '') => {
    setBrowseCategoryId(categoryId);
    setActivePdvCategoryId('');
    setActiveProductSearch('');
    setProductSearchDraft('');
    setNativeSearchOpen(false);
  }, []);
  const setCategory = useCallback(categoryId => {
    if (modernManagerCatalog && !categoryId) browseCategories();
    else setActivePdvCategoryId(categoryId);
  }, [modernManagerCatalog, browseCategories]);
  const nativeCatalogActions = useNativeCatalogActions(setNativeSearchOpen,
    setCategory, setActiveProductSearch, setProductSearchDraft);
  useFocusEffect(useCallback(() => {
    if (modernManagerCatalog) browseCategories();
  }, [modernManagerCatalog, companyId, context, resetKey, browseCategories]));
  const restore = useCallback(saved => {
    setActivePdvCategoryId(saved.categoryId || '');
    setProductSearchDraft(saved.search || '');
    setActiveProductSearch(saved.search || '');
  }, []);
  const cachedListProps = useCachedCatalogView({enabled:cacheCatalog && !modernManagerCatalog,
    companyId, context, viewKey:'categories', scopeRevision, resetKey,
    view:{categoryId:activePdvCategoryId, search:activeProductSearch}, restore});
  const handleProductSearchFiltersChange = useCallback(filters => {
    setProductSearchDraft(String(filters?.search || ''));
  }, []);
  const handleProductSearch = useCallback(query => {
    const search = String(query || '').trim();
    setProductSearchDraft(search);
    setActiveProductSearch(search);
    setActivePdvCategoryId('');
    setBrowseCategoryId('');
    productsActions?.setFilters?.({});
  }, [productsActions]);
  const handlePdvCategorySelect = useCallback(category => {
    const categoryId = isManagerInline && category?._isAllProducts
      ? ALL_PRODUCTS_SENTINEL_ID : normalizeEntityId(category);
    if (!categoryId) return;
    if (modernManagerCatalog && !category?._isAllProducts && !category?.__pdvOwnProducts &&
        (items || []).some(item => normalizeEntityId(item.parent) === categoryId)) {
      browseCategories(categoryId);
      return;
    }
    categoryActions.setItem(category);
    setProductSearchDraft('');
    setActiveProductSearch('');
    setBrowseCategoryId('');
    setActivePdvCategoryId(categoryId);
    productsActions?.setFilters?.({});
  }, [categoryActions, productsActions, isManagerInline, modernManagerCatalog, items, browseCategories]);
  return {productSearchDraft, activeProductSearch, activePdvCategoryId, browseCategoryId,
    nativeSearchOpen, setNativeSearchOpen, nativeCatalogActions, cachedListProps,
    handleProductSearchFiltersChange, handleProductSearch, handlePdvCategorySelect, browseCategories};
}
