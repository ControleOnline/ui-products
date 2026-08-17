// useCustomizeScreenData — extracted from CustomizeScreen.js for QA line-limit compliance.
// Manages data loading, selection state, summaries, and nested editor.

import {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  buildUnitTreeFromOrderProductComponents,
  calculateCustomizationTreePrice,
  findUnitTreeNode,
  resolveGroupMinimum,
} from '../domain/customizationTree';
import {
  computeGroupSummary,
  normalizeEntityId,
  normalizeOptionDedupKey,
  parseNumericValue,
  parseCsv,
  resolveEffectiveGroupMaximum,
  resolveEffectiveGroupMinimum,
  resolvePositiveQuantity,
  isBetweenTime,
  timeNow,
} from './customizeScreenHelpers';

const useCustomizeScreenData = ({
  activeProductId,
  activeOrderProduct,
  activeOrderProductQuantity,
  activeOrderProductId,
  activeChannel,
  productGroupActions,
  productsActions,
  productGroupProductActions,
}) => {
  const [fetchedProductGroups, setFetchedProductGroups] = useState([]);
  const [isLoadingProductGroups, setIsLoadingProductGroups] = useState(false);
  const [groupProductsByGroup, setGroupProductsByGroup] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [optionProductsById, setOptionProductsById] = useState({});
  const [nestedEditor, setNestedEditor] = useState(null);

  const productGroupActionsRef = useRef(productGroupActions);
  const productsActionsRef = useRef(productsActions);
  const productGroupProductActionsRef = useRef(productGroupProductActions);
  const loadedGroupProductsRef = useRef({});
  const loadedOptionProductsRef = useRef({});

  useEffect(() => { productGroupActionsRef.current = productGroupActions; }, [productGroupActions]);
  useEffect(() => { productsActionsRef.current = productsActions; }, [productsActions]);
  useEffect(() => { productGroupProductActionsRef.current = productGroupProductActions; }, [productGroupProductActions]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (!activeProductId) {
        setFetchedProductGroups([]);
        setIsLoadingProductGroups(false);
        return undefined;
      }
      setFetchedProductGroups([]);
      setIsLoadingProductGroups(true);
      productGroupActionsRef.current
        .getItems({product: activeProductId, 'product.productType': 'component'})
        .then(items => {
          if (!isActive) return;
          setFetchedProductGroups(Array.isArray(items) ? items : []);
          setIsLoadingProductGroups(false);
        })
        .catch(() => {
          if (isActive) {
            setFetchedProductGroups([]);
            setIsLoadingProductGroups(false);
          }
        });
      return () => { isActive = false; };
    }, [activeProductId]),
  );

  useEffect(() => { setSelectedItems({}); }, [activeOrderProductId, activeProductId]);

  useEffect(() => {
    setGroupProductsByGroup({});
    loadedGroupProductsRef.current = {};
    setOptionProductsById({});
    loadedOptionProductsRef.current = {};
  }, [activeProductId]);

  const existingSelectionsByGroup = useMemo(() => {
    const mappedSelections = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents : [];
    const existingUnitTree = buildUnitTreeFromOrderProductComponents(components, activeOrderProductQuantity);

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id || component?.productGroup?.['@id'] || component?.productGroup,
      );
      const productId = normalizeEntityId(
        component?.product?.id || component?.product?.['@id'] || component?.product,
      );
      if (!groupId || !productId) return;
      if (!mappedSelections[groupId]) mappedSelections[groupId] = {};

      const unitNode = findUnitTreeNode(existingUnitTree, groupId, productId);
      const nestedTree = unitNode?.sub_products || [];
      const componentQuantity = resolvePositiveQuantity(component?.quantity || 1);
      mappedSelections[groupId][productId] = {
        selected: true,
        quantity:
          activeOrderProductQuantity > 1
            ? Math.max(componentQuantity / activeOrderProductQuantity, 1)
            : componentQuantity,
        sub_products: nestedTree,
        hasNestedGroups: nestedTree.length > 0 || undefined,
        nestedState: nestedTree.length > 0 ? 'valid' : undefined,
      };
    });

    return mappedSelections;
  }, [activeOrderProduct, activeOrderProductQuantity]);

  const orderProductGroupsById = useMemo(() => {
    const mappedGroups = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents : [];

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id || component?.productGroup?.['@id'] || component?.productGroup,
      );
      if (!groupId || !component?.productGroup || mappedGroups[groupId]) return;
      mappedGroups[groupId] = component.productGroup;
    });

    return mappedGroups;
  }, [activeOrderProduct]);

  const resolvedProductGroups = useMemo(() => {
    const mappedGroups = {};

    ;(Array.isArray(fetchedProductGroups) ? fetchedProductGroups : []).forEach(group => {
      const groupId = normalizeEntityId(group?.id || group?.['@id']);
      if (!groupId) return;
      mappedGroups[groupId] = {...group, ...(orderProductGroupsById[groupId] || {})};
    });

    Object.entries(orderProductGroupsById).forEach(([groupId, group]) => {
      if (!mappedGroups[groupId]) mappedGroups[groupId] = group;
    });

    return Object.values(mappedGroups).sort((l, r) => {
      const lo = parseNumericValue(l?.groupOrder);
      const ro = parseNumericValue(r?.groupOrder);
      if (lo !== ro) return lo - ro;
      return parseNumericValue(normalizeEntityId(l?.id)) - parseNumericValue(normalizeEntityId(r?.id));
    });
  }, [fetchedProductGroups, orderProductGroupsById]);

  const resolvedProductGroupsById = useMemo(
    () =>
      Object.fromEntries(
        resolvedProductGroups
          .map(group => [String(normalizeEntityId(group?.id || group?.['@id'])), group])
          .filter(([id]) => !!id),
      ),
    [resolvedProductGroups],
  );

  const resolvedProductGroupIdsKey = useMemo(
    () =>
      resolvedProductGroups
        .map(group => normalizeEntityId(group?.id || group?.['@id']))
        .filter(Boolean)
        .join(','),
    [resolvedProductGroups],
  );

  const optionProductIdsNeedingImagesKey = useMemo(() => {
    const ids = new Set();
    Object.values(groupProductsByGroup).forEach(groupProducts => {
      if (!Array.isArray(groupProducts)) return;
      groupProducts.forEach(item => {
        const product = item?.productChild;
        const productId = normalizeEntityId(product?.id || product?.['@id']);
        const productFiles = Array.isArray(product?.productFiles) ? product.productFiles : [];
        if (productId && productFiles.length === 0) ids.add(productId);
      });
    });
    return Array.from(ids).sort((l, r) => Number(l) - Number(r)).join(',');
  }, [groupProductsByGroup]);

  useEffect(() => {
    const productIds = optionProductIdsNeedingImagesKey
      .split(',').map(v => v.trim()).filter(Boolean)
      .filter(
        id =>
          !optionProductsById[id] &&
          loadedOptionProductsRef.current[id] !== 'loading' &&
          loadedOptionProductsRef.current[id] !== 'loaded',
      );
    if (productIds.length === 0) return;

    let isActive = true;
    productIds.forEach(id => { loadedOptionProductsRef.current[id] = 'loading'; });

    productsActionsRef.current.getItems({id: productIds})
      .then(items => {
        if (!isActive) return;
        const nextProducts = {};
        (Array.isArray(items) ? items : []).forEach(product => {
          const productId = normalizeEntityId(product?.id || product?.['@id']);
          if (productId) nextProducts[productId] = product;
        });
        productIds.forEach(id => { loadedOptionProductsRef.current[id] = 'loaded'; });
        setOptionProductsById(prev => ({...prev, ...nextProducts}));
      })
      .catch(() => {
        productIds.forEach(id => { delete loadedOptionProductsRef.current[id]; });
      });

    return () => { isActive = false; };
  }, [optionProductIdsNeedingImagesKey]);

  useEffect(() => {
    let isActive = true;
    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setGroupProductsByGroup({});
      return () => { isActive = false; };
    }

    const currentGroups = resolvedProductGroups
      .map(group => ({id: String(normalizeEntityId(group?.id || group?.['@id'])), group}))
      .filter(({id}) => !!id);
    const pendingGroups = currentGroups.filter(
      ({id}) => !loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`],
    );

    if (pendingGroups.length === 0) {
      setGroupProductsByGroup(prev =>
        Object.fromEntries(currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []])),
      );
      return () => { isActive = false; };
    }

    pendingGroups.forEach(({id}) => {
      loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loading';
    });

    Promise.all(
      pendingGroups.map(async ({id, group}) => {
        const items = await productGroupProductActionsRef.current.getItems({
          productGroup: `/product_groups/${group.id}`,
          productType: 'component',
        });
        return [id, Array.isArray(items) ? items : []];
      }),
    )
      .then(entries => {
        if (!isActive) return;
        entries.forEach(([id]) => {
          loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loaded';
        });
        setGroupProductsByGroup(prev => {
          const next = Object.fromEntries(
            currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
          );
          entries.forEach(([id, items]) => { next[id] = items; });
          return next;
        });
      })
      .catch(() => {
        pendingGroups.forEach(({id}) => {
          delete loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`];
        });
        if (!isActive) return;
        setGroupProductsByGroup(prev =>
          Object.fromEntries(currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []])),
        );
      });

    return () => {
      isActive = false;
      pendingGroups.forEach(({id}) => {
        const key = `${activeProductId || 'none'}:${id}`;
        if (loadedGroupProductsRef.current[key] === 'loading') {
          delete loadedGroupProductsRef.current[key];
        }
      });
    };
  }, [activeProductId, resolvedProductGroupIdsKey, resolvedProductGroups]);

  useEffect(() => {
    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setSelectedItems({});
      return;
    }
    const next = Object.fromEntries(
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const existingSelections = existingSelectionsByGroup[groupId] || {};
        const groupProducts = Array.isArray(groupProductsByGroup[groupId])
          ? groupProductsByGroup[groupId] : [];
        return [
          groupId,
          groupProducts.map(item => {
            const productId = normalizeEntityId(item?.productChild?.id || item?.productChild?.['@id']);
            const existing = existingSelections[productId];
            return {
              ...item,
              selected: !!existing?.selected,
              quantity: existing?.quantity || parseFloat(String(item?.quantity || 1).replace(',', '.')) || 1,
              sub_products: existing?.sub_products || [],
              hasNestedGroups: existing?.hasNestedGroups,
              nestedState: existing?.nestedState,
            };
          }),
        ];
      }),
    );
    setSelectedItems(next);
  }, [existingSelectionsByGroup, groupProductsByGroup, resolvedProductGroupIdsKey, resolvedProductGroups]);

  const groupSummaries = useMemo(
    () =>
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const groupItems = Array.isArray(selectedItems[groupId]) ? selectedItems[groupId] : [];
        const summary = computeGroupSummary(group, groupItems);
        // Add nested tree prices
        const nestedExtra = summary.selectedOptions.reduce((s, item) => s + calculateCustomizationTreePrice(item?.sub_products), 0);
        return {...summary, extraPrice: summary.extraPrice + nestedExtra};
      }),
    [resolvedProductGroups, selectedItems],
  );

  const groupSummariesById = useMemo(
    () => Object.fromEntries(groupSummaries.map(s => [s.groupId, s])),
    [groupSummaries],
  );
  const invalidGroupSummaries = useMemo(
    () => groupSummaries.filter(s => !s.isValid),
    [groupSummaries],
  );

  const isOptionDisabledByRules = useCallback((groupId, optionValue, now) => {
    const extra = optionValue?.extraData || {};
    const channels = parseCsv(extra.channels || '');
    if (channels.length > 0 && !channels.map(c => c.toLowerCase()).includes(activeChannel)) return true;
    if (!isBetweenTime(now, extra.availableFrom || '', extra.availableTo || '')) return true;
    const incompatibleIds = parseCsv(extra.incompatibleWith || '').map(v => String(v).replace(/\D/g, ''));
    if (incompatibleIds.length > 0) {
      const selectedIds = Object.values(selectedItems).flat()
        .filter(item => item.selected)
        .map(item => String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, ''))
        .filter(Boolean);
      if (incompatibleIds.some(id => selectedIds.includes(id))) return true;
    }
    const substituteFor = String(extra.substituteFor || '').replace(/\D/g, '');
    if (substituteFor) {
      const targetSelected = Object.values(selectedItems).flat()
        .filter(item => item.selected)
        .some(item => String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, '') === substituteFor);
      if (targetSelected) return true;
    }

    return false;
  }, [activeChannel, selectedItems]);

  const getProcessedOptions = useCallback(group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const groupItems = selectedItems[groupId] || [];
    let options = Array.isArray(groupItems)
      ? groupItems.map(product => ({label: product.productChild?.product, value: product}))
      : [];
    const dedupedOptions = [];
    const dedupedByKey = {};

    options.forEach(option => {
      const key = normalizeOptionDedupKey(option);
      const existingIndex = dedupedByKey[key];
      if (existingIndex === undefined) {
        dedupedByKey[key] = dedupedOptions.length;
        dedupedOptions.push(option);
        return;
      }
      const isSelected = (selectedItems[groupId] || []).some(
        item => item['@id'] === option?.value?.['@id'] && item.selected,
      );
      if (isSelected) dedupedOptions[existingIndex] = option;
    });

    options = dedupedOptions;
    const selectedCount = groupSummariesById[groupId]?.selectedCount || 0;
    const maximum = resolveEffectiveGroupMaximum(group);
    if (maximum !== null && selectedCount >= maximum) {
      options = options.filter(option =>
        (selectedItems[groupId] || []).some(item => item['@id'] === option?.value?.['@id'] && item.selected),
      );
    }
    const now = timeNow();
    const isMaxSelected = (grp, product) => {
      const max = resolveEffectiveGroupMaximum(grp);
      if (max === null) return false;
      const gId = String(normalizeEntityId(grp?.id || grp?.['@id']));
      const grpItems = selectedItems[gId] || [];
      return grpItems.filter(item => item.selected).length >= max &&
        !grpItems.some(p => p['@id'] === product['@id'] && p.selected);
    };
    return options.map(option => ({
      ...option,
      disable: isMaxSelected(group, option.value) || isOptionDisabledByRules(groupId, option.value, now),
    }));
  }, [groupSummariesById, isOptionDisabledByRules, selectedItems]);

  const updateNestedOption = useCallback((groupId, optionId, updater) => {
    setSelectedItems(current => ({
      ...current,
      [groupId]: (current[groupId] || []).map(item =>
        item['@id'] === optionId ? updater(item) : item,
      ),
    }));
  }, []);
  const inspectNestedOption = useCallback(async (groupId, option) => {
    const optionId = option?.value?.['@id'] || option?.['@id'];
    const relation = option?.value || option;
    const baseProduct = relation?.productChild;
    const productId = normalizeEntityId(baseProduct?.id || baseProduct?.['@id']);
    if (!productId) return;
    updateNestedOption(groupId, optionId, item => ({...item, nestedState: 'checking'}));
    try {
      const nestedGroups = await productGroupActionsRef.current.getItems({
        product: productId,
        'product.productType': 'component',
      });
      if (!Array.isArray(nestedGroups) || nestedGroups.length === 0) {
        updateNestedOption(groupId, optionId, item => ({...item, hasNestedGroups: false, nestedState: 'valid'}));
        return;
      }
      updateNestedOption(groupId, optionId, item => ({
        ...item,
        hasNestedGroups: true,
        nestedState:
          item?.sub_products?.length > 0 || !nestedGroups.some(g => resolveGroupMinimum(g) > 0)
            ? 'valid'
            : 'pending',
      }));
      setNestedEditor({
        groupId,
        optionId,
        groups: nestedGroups,
        product: optionProductsById[productId]
          ? {...baseProduct, ...optionProductsById[productId]}
          : baseProduct,
      });
    } catch {
      updateNestedOption(groupId, optionId, item => ({...item, hasNestedGroups: true, nestedState: 'invalid'}));
    }
  }, [optionProductsById, updateNestedOption]);
  const handleToggleOption = useCallback((groupId, option) => {
    const normalizedGroupId = String(groupId || '');
    const isCurrentlySelected =
      (selectedItems[normalizedGroupId] || []).some(
        item => item['@id'] === option?.value?.['@id'] && item.selected,
      ) || false;
    setSelectedItems(prev => {
      const selectedGroup = Array.isArray(prev[normalizedGroupId]) ? prev[normalizedGroupId] : [];
      const optionId = option?.value?.['@id'];
      const currentGroup = resolvedProductGroupsById[normalizedGroupId];
      const maximum = resolveEffectiveGroupMaximum(currentGroup);
      const selectedCount = selectedGroup.filter(item => item?.selected).length;
      const targetOption = selectedGroup.find(item => item['@id'] === optionId);
      if (!targetOption?.selected && maximum !== null && selectedCount >= maximum) return prev;
      return {
        ...prev,
        [normalizedGroupId]: selectedGroup.map(item =>
          item['@id'] === optionId ? {...item, selected: !item.selected} : item,
        ),
      };
    });
    if (!isCurrentlySelected) inspectNestedOption(normalizedGroupId, option);
  }, [inspectNestedOption, resolvedProductGroupsById, selectedItems]);

  return {isLoadingProductGroups, selectedItems, setSelectedItems, optionProductsById,
    resolvedProductGroups, resolvedProductGroupsById, groupSummaries, groupSummariesById,
    invalidGroupSummaries, getProcessedOptions, updateNestedOption, inspectNestedOption,
    handleToggleOption, nestedEditor, setNestedEditor};
};

export default useCustomizeScreenData;
