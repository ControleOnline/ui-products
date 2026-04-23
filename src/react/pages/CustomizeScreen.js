import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {View, Text, TouchableOpacity, ScrollView, Alert} from 'react-native';

import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';

import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-products/src/react/css/products';
import {useStore} from '@store';
import {env} from '@env';

import {
  inlineStyle_344_8,
  inlineStyle_352_10,
  inlineStyle_354_16,
  inlineStyle_355_18,
  inlineStyle_361_12,
  inlineStyle_378_27,
  inlineStyle_401_10,
  inlineStyle_402_18,
  inlineStyle_421_18,
  inlineStyle_449_18,
} from './CustomizeScreen.styles';
import {mergeOrderWithOrderProducts} from '@controleonline/ui-orders/src/utils/orderState';

const normalizeEntityId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
};

const parseNumericValue = value => {
  const parsedValue = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const parseNullableInteger = value => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const parsedValue = parseInt(String(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatOptionQuantity = value => {
  const quantity = parseNumericValue(value);

  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const resolveEffectiveGroupMinimum = group => {
  const minimum = parseNullableInteger(group?.minimum);

  if (minimum !== null && minimum > 0) {
    return minimum;
  }

  return group?.required ? 1 : 0;
};

const resolveEffectiveGroupMaximum = group => {
  const maximum = parseNullableInteger(group?.maximum);

  if (maximum !== null && maximum > 0) {
    return maximum;
  }

  return null;
};

const resolvePriceCalculationLabel = value => {
  switch (String(value || '').trim().toLowerCase()) {
    case 'biggest':
      return 'maior valor';
    case 'average':
      return 'media';
    case 'free':
      return 'gratis';
    case 'sum':
    default:
      return 'soma';
  }
};

const resolveCompactSelectionRuleLabel = (minimum, maximum) => {
  if (minimum > 0 && maximum !== null) {
    if (minimum === maximum) {
      return minimum === 1 ? '1 selecao' : `${minimum} selecoes`;
    }

    return `${minimum} a ${maximum} selecoes`;
  }

  if (minimum > 0) {
    return `min. ${minimum}`;
  }

  if (maximum !== null) {
    return `max. ${maximum}`;
  }

  return 'sem limite';
};

const resolveCompactGroupStateLabel = summary => {
  const selectedCount = summary?.selectedCount || 0;
  const selectedLabel = `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`;
  const extraPrice = parseNumericValue(summary?.extraPrice);

  if (extraPrice <= 0) {
    return selectedLabel;
  }

  return `${selectedLabel} • +${Formatter.formatMoney(extraPrice, 'R$', 'pt-br')}`;
};

const calculateGroupExtraPrice = (group, groupItems) => {
  const selectedItems = (Array.isArray(groupItems) ? groupItems : []).filter(
    item => item?.selected,
  );
  const prices = selectedItems.map(item => parseNumericValue(item?.price));
  const priceCalculation = String(group?.priceCalculation || 'sum')
    .trim()
    .toLowerCase();

  if (prices.length === 0) {
    return 0;
  }

  switch (priceCalculation) {
    case 'biggest':
      return Math.max(...prices);
    case 'average':
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    case 'free':
      return 0;
    case 'sum':
    default:
      return prices.reduce((sum, price) => sum + price, 0);
  }
};

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    product: routeProduct = null,
    productId: routeProductId = null,
    orderProduct: routeOrderProduct = null,
    orderProductId: routeOrderProductId = null,
    redirectToCart = false,
    returnDepth = 3,
  } = route.params || {};
  const {globalStyles, styles} = css();
  const [groupProductsByGroup, setGroupProductsByGroup] = useState({});
  const [selectedItems, setSelectedItems] = useState({});

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const product_groupStore = useStore('product_group');
  const productGroupsGetters = product_groupStore.getters;
  const productGroupActions = product_groupStore.actions;
  const {items: productGroups} = productGroupsGetters;
  const productsStore = useStore('products');
  const productsActions = productsStore.actions;
  const productsGetters = productsStore.getters;
  const productGroupProductStore = useStore('product_group_product');
  const productGroupProductActions = productGroupProductStore.actions;
  const cartStore = useStore('cart');
  const cartActions = cartStore.actions;
  const cartGetters = cartStore.getters;

  const order_productsStore = useStore('order_products');
  const orderProductsActions = order_productsStore.actions;
  const orderProductsGetters = order_productsStore.getters;
  const storedOrderProducts = Array.isArray(orderProductsGetters?.items)
    ? orderProductsGetters.items
    : [];
  const storedOrderProductItem = orderProductsGetters?.item;
  const isSavingCustomization = Boolean(orderProductsGetters?.isSaving);
  const {item: order} = ordersGetters;
  const {item: cart} = cartGetters;
  const activeChannel = String(order?.app || env.APP_TYPE || 'default').toLowerCase();
  const productGroupActionsRef = useRef(productGroupActions);
  const productsActionsRef = useRef(productsActions);
  const orderProductsActionsRef = useRef(orderProductsActions);
  const productGroupProductActionsRef = useRef(productGroupProductActions);
  const loadedGroupProductsRef = useRef({});

  const activeOrderProductId = useMemo(
    () =>
      normalizeEntityId(
        routeOrderProductId ||
        routeOrderProduct?.id ||
        routeOrderProduct?.['@id'],
      ),
    [routeOrderProductId, routeOrderProduct],
  );

  const activeOrderProduct = useMemo(() => {
    if (
      routeOrderProduct &&
      typeof routeOrderProduct === 'object' &&
      normalizeEntityId(routeOrderProduct?.id || routeOrderProduct?.['@id']) ===
        activeOrderProductId
    ) {
      return routeOrderProduct;
    }

    if (
      storedOrderProductItem &&
      typeof storedOrderProductItem === 'object' &&
      normalizeEntityId(
        storedOrderProductItem?.id || storedOrderProductItem?.['@id'],
      ) === activeOrderProductId
    ) {
      return storedOrderProductItem;
    }

    return (
      storedOrderProducts.find(
        item =>
          normalizeEntityId(item?.id || item?.['@id']) === activeOrderProductId,
      ) || null
    );
  }, [
    activeOrderProductId,
    routeOrderProduct,
    storedOrderProductItem,
    storedOrderProducts,
  ]);

  const activeProductId = useMemo(
    () =>
      normalizeEntityId(
        routeProductId ||
          routeProduct?.id ||
          routeProduct?.['@id'] ||
          activeOrderProduct?.product?.id ||
          activeOrderProduct?.product?.['@id'] ||
          route.params?.id,
      ),
    [
      activeOrderProduct?.product?.['@id'],
      activeOrderProduct?.product?.id,
      route.params?.id,
      routeProduct?.['@id'],
      routeProduct?.id,
      routeProductId,
    ],
  );

  const activeProduct = useMemo(() => {
    if (
      routeProduct &&
      typeof routeProduct === 'object' &&
      normalizeEntityId(routeProduct?.id || routeProduct?.['@id']) ===
        activeProductId
    ) {
      return routeProduct;
    }

    if (
      activeOrderProduct?.product &&
      normalizeEntityId(
        activeOrderProduct.product?.id || activeOrderProduct.product?.['@id'],
      ) === activeProductId
    ) {
      return activeOrderProduct.product;
    }

    if (
      productsGetters?.item &&
      typeof productsGetters.item === 'object' &&
      normalizeEntityId(
        productsGetters.item?.id || productsGetters.item?.['@id'],
      ) === activeProductId
    ) {
      return productsGetters.item;
    }

    return null;
  }, [
    activeOrderProduct?.product,
    activeProductId,
    productsGetters?.item,
    routeProduct,
  ]);
  const activeResolvedProductId = useMemo(
    () => normalizeEntityId(activeProduct?.id || activeProduct?.['@id']),
    [activeProduct],
  );

  const activeProductIri = useMemo(() => {
    if (activeProduct?.['@id']) {
      return activeProduct['@id'];
    }
    return activeProductId ? `/products/${activeProductId}` : null;
  }, [activeProduct, activeProductId]);
  const isEditingExistingOrderProduct = !!activeOrderProductId;

  const activeOrderId = useMemo(
    () =>
      normalizeEntityId(
        activeOrderProduct?.order?.id ||
          activeOrderProduct?.order?.['@id'] ||
          order?.id ||
          order?.['@id'] ||
          cart?.id ||
          cart?.['@id'],
      ),
    [activeOrderProduct, cart, order],
  );

  const activeOrderIri = useMemo(() => {
    if (activeOrderProduct?.order?.['@id']) {
      return activeOrderProduct.order['@id'];
    }

    if (activeOrderProduct?.order?.id) {
      return `/orders/${activeOrderProduct.order.id}`;
    }

    if (order?.['@id']) {
      return order['@id'];
    }
    if (cart?.['@id']) {
      return cart['@id'];
    }
    return cart?.id ? `/orders/${cart.id}` : null;
  }, [activeOrderProduct, cart, order]);

  const existingSelectionsByGroup = useMemo(() => {
    const mappedSelections = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents
      : [];

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id ||
        component?.productGroup?.['@id'] ||
        component?.productGroup,
      );
      const productId = normalizeEntityId(
        component?.product?.id ||
        component?.product?.['@id'] ||
        component?.product,
      );

      if (!groupId || !productId) {
        return;
      }

      if (!mappedSelections[groupId]) {
        mappedSelections[groupId] = {};
      }

      mappedSelections[groupId][productId] = {
        selected: true,
        quantity: parseFloat(String(component?.quantity || 1).replace(',', '.')) || 1,
      };
    });

    return mappedSelections;
  }, [activeOrderProduct]);

  const orderProductGroupsById = useMemo(() => {
    const mappedGroups = {};
    const components = Array.isArray(activeOrderProduct?.orderProductComponents)
      ? activeOrderProduct.orderProductComponents
      : [];

    components.forEach(component => {
      const groupId = normalizeEntityId(
        component?.productGroup?.id ||
        component?.productGroup?.['@id'] ||
        component?.productGroup,
      );

      if (!groupId || !component?.productGroup || mappedGroups[groupId]) {
        return;
      }

      mappedGroups[groupId] = component.productGroup;
    });

    return mappedGroups;
  }, [activeOrderProduct]);

  const resolvedProductGroups = useMemo(() => {
    const mappedGroups = {};

    ;(Array.isArray(productGroups) ? productGroups : []).forEach(group => {
      const groupId = normalizeEntityId(group?.id || group?.['@id']);

      if (!groupId) {
        return;
      }

      mappedGroups[groupId] = {
        ...group,
        ...(orderProductGroupsById[groupId] || {}),
      };
    });

    Object.entries(orderProductGroupsById).forEach(([groupId, group]) => {
      if (!mappedGroups[groupId]) {
        mappedGroups[groupId] = group;
      }
    });

    return Object.values(mappedGroups).sort((leftGroup, rightGroup) => {
      const leftOrder = parseNumericValue(leftGroup?.groupOrder);
      const rightOrder = parseNumericValue(rightGroup?.groupOrder);

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return (
        parseNumericValue(normalizeEntityId(leftGroup?.id)) -
        parseNumericValue(normalizeEntityId(rightGroup?.id))
      );
    });
  }, [orderProductGroupsById, productGroups]);

  const resolvedProductGroupsById = useMemo(
    () =>
      Object.fromEntries(
        resolvedProductGroups
          .map(group => [String(normalizeEntityId(group?.id || group?.['@id'])), group])
          .filter(([groupId]) => !!groupId),
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

  const parseCsv = value =>
    String(value || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

  const timeNow = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const isBetweenTime = (current, from, to) => {
    if (!from && !to) return true;
    if (!from || !to) return true;
    return current >= from && current <= to;
  };

  useEffect(() => {
    productGroupActionsRef.current = productGroupActions;
  }, [productGroupActions]);

  useEffect(() => {
    productsActionsRef.current = productsActions;
  }, [productsActions]);

  useEffect(() => {
    orderProductsActionsRef.current = orderProductsActions;
  }, [orderProductsActions]);

  useEffect(() => {
    productGroupProductActionsRef.current = productGroupProductActions;
  }, [productGroupProductActions]);

  useFocusEffect(
    useCallback(() => {
      if (!activeProductId) {
        return undefined;
      }

      productGroupActionsRef.current.getItems({
        product: activeProductId,
        'product.productType': 'component',
      });
      return undefined;
    }, [activeProductId]),
  );

  useEffect(() => {
    setSelectedItems({});
  }, [activeOrderProductId, activeProductId]);

  useEffect(() => {
    setGroupProductsByGroup({});
    loadedGroupProductsRef.current = {};
  }, [activeProductId]);

  useFocusEffect(
    useCallback(() => {
      if (activeOrderProductId) {
        orderProductsActionsRef.current.get(activeOrderProductId).catch(() => null);
      }

      if (
        activeProductId &&
        activeResolvedProductId !== activeProductId
      ) {
        productsActionsRef.current.get(activeProductId).catch(() => null);
      }
    }, [
      activeOrderProductId,
      activeProductId,
      activeResolvedProductId,
    ]),
  );
  const leaveCustomizeScreen = useCallback(() => {
    if (redirectToCart) {
      navigation.navigate('ShopCartPage');
      return;
    }

    navigation.pop(Math.max(1, Number(returnDepth || 1)));
  }, [navigation, redirectToCart, returnDepth]);

  const refreshSavedOrderProducts = useCallback(async () => {
    if (!activeOrderId) {
      return [];
    }

    const refreshedOrderProducts = await orderProductsActions.getItems({
      'order.id': Number(activeOrderId),
      itemsPerPage: 200,
    });

    if (typeof ordersActions.syncOrderProducts === 'function') {
      ordersActions.syncOrderProducts({
        orderId: Number(activeOrderId),
        orderProducts: refreshedOrderProducts,
      });
    } else if (
      order &&
      normalizeEntityId(order?.id || order?.['@id']) === activeOrderId
    ) {
      ordersActions.setItem(
        mergeOrderWithOrderProducts(order, refreshedOrderProducts),
      );
    }

    if (
      cart &&
      typeof cartActions?.setItem === 'function' &&
      normalizeEntityId(cart?.id || cart?.['@id']) === activeOrderId
    ) {
      cartActions.setItem(
        mergeOrderWithOrderProducts(cart, refreshedOrderProducts),
      );
    }

    return refreshedOrderProducts;
  }, [
    activeOrderId,
    cart,
    cartActions,
    order,
    orderProductsActions,
    ordersActions,
  ]);

  useEffect(() => {
    let isActive = true;

    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setGroupProductsByGroup({});
      return () => {
        isActive = false;
      };
    }

    const currentGroups = resolvedProductGroups
      .map(group => ({
        id: String(normalizeEntityId(group?.id || group?.['@id'])),
        group,
      }))
      .filter(({id}) => !!id);

    const pendingGroups = currentGroups.filter(({id}) => {
      const cacheKey = `${activeProductId || 'none'}:${id}`;
      return !loadedGroupProductsRef.current[cacheKey];
    });

    if (pendingGroups.length === 0) {
      setGroupProductsByGroup(prev =>
        Object.fromEntries(
          currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
        ),
      );

      return () => {
        isActive = false;
      };
    }

    pendingGroups.forEach(({id}) => {
      loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loading';
    });

    Promise.all(
      pendingGroups.map(async ({id, group}) => {
        const groupProducts = await productGroupProductActionsRef.current.getItems({
          productGroup: `/product_groups/${group.id}`,
          productType: 'component',
        });

        return [id, Array.isArray(groupProducts) ? groupProducts : []];
      }),
    )
      .then(entries => {
        if (!isActive) {
          return;
        }

        entries.forEach(([id]) => {
          loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`] = 'loaded';
        });

        setGroupProductsByGroup(prev => {
          const nextGroups = Object.fromEntries(
            currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
          );

          entries.forEach(([id, items]) => {
            nextGroups[id] = items;
          });

          return nextGroups;
        });
      })
      .catch(() => {
        pendingGroups.forEach(({id}) => {
          delete loadedGroupProductsRef.current[`${activeProductId || 'none'}:${id}`];
        });

        if (!isActive) {
          return;
        }

        setGroupProductsByGroup(prev =>
          Object.fromEntries(
            currentGroups.map(({id}) => [id, Array.isArray(prev[id]) ? prev[id] : []]),
          ),
        );
      });

    return () => {
      isActive = false;
      pendingGroups.forEach(({id}) => {
        const cacheKey = `${activeProductId || 'none'}:${id}`;
        if (loadedGroupProductsRef.current[cacheKey] === 'loading') {
          delete loadedGroupProductsRef.current[cacheKey];
        }
      });
    };
  }, [activeProductId, resolvedProductGroupIdsKey, resolvedProductGroups]);

  useEffect(() => {
    if (!Array.isArray(resolvedProductGroups) || resolvedProductGroups.length === 0) {
      setSelectedItems({});
      return;
    }

    const nextSelectedItems = Object.fromEntries(
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const existingSelections = existingSelectionsByGroup[groupId] || {};
        const groupProducts = Array.isArray(groupProductsByGroup[groupId])
          ? groupProductsByGroup[groupId]
          : [];

        return [
          groupId,
          groupProducts.map(item => ({
            ...item,
            selected: !!existingSelections[
              normalizeEntityId(
                item?.productChild?.id || item?.productChild?.['@id'],
              )
            ]?.selected,
            quantity:
              existingSelections[
                normalizeEntityId(
                  item?.productChild?.id || item?.productChild?.['@id'],
                )
              ]?.quantity ||
              parseFloat(String(item?.quantity || 1).replace(',', '.')) ||
              1,
          })),
        ];
      }),
    );

    setSelectedItems(nextSelectedItems);
  }, [
    existingSelectionsByGroup,
    groupProductsByGroup,
    resolvedProductGroupIdsKey,
    resolvedProductGroups,
  ]);

  const groupSummaries = useMemo(
    () =>
      resolvedProductGroups.map(group => {
        const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
        const groupItems = Array.isArray(selectedItems[groupId])
          ? selectedItems[groupId]
          : [];
        const selectedCount = groupItems.filter(item => item?.selected).length;
        const minimum = resolveEffectiveGroupMinimum(group);
        const maximum = resolveEffectiveGroupMaximum(group);
        const extraPrice = calculateGroupExtraPrice(group, groupItems);
        let validationMessage = '';

        if (selectedCount < minimum) {
          validationMessage =
            minimum === 1
              ? 'Selecione 1 opcao.'
              : `Selecione pelo menos ${minimum} opcoes.`;
        } else if (maximum !== null && selectedCount > maximum) {
          validationMessage =
            maximum === 1
              ? 'Selecione no maximo 1 opcao.'
              : `Selecione no maximo ${maximum} opcoes.`;
        }

        let selectionRuleLabel = 'Sem limite de selecao.';
        if (minimum > 0 && maximum !== null) {
          selectionRuleLabel = `Escolha de ${minimum} ate ${maximum} opcoes.`;
        } else if (minimum > 0) {
          selectionRuleLabel = `Escolha no minimo ${minimum} opcoes.`;
        } else if (maximum !== null) {
          selectionRuleLabel = `Escolha ate ${maximum} opcoes.`;
        }

        return {
          groupId,
          groupName: group?.productGroup || `Grupo ${groupId}`,
          selectedCount,
          minimum,
          maximum,
          extraPrice,
          isValid: validationMessage === '',
          validationMessage,
          selectionRuleLabel,
          priceCalculationLabel: resolvePriceCalculationLabel(
            group?.priceCalculation,
          ),
          isRequired: minimum > 0 || !!group?.required,
        };
      }),
    [resolvedProductGroups, selectedItems],
  );

  const groupSummariesById = useMemo(
    () => Object.fromEntries(groupSummaries.map(summary => [summary.groupId, summary])),
    [groupSummaries],
  );

  const invalidGroupSummaries = useMemo(
    () => groupSummaries.filter(summary => !summary.isValid),
    [groupSummaries],
  );

  const canSubmitCustomization =
    !!activeProductIri &&
    !!activeOrderIri &&
    invalidGroupSummaries.length === 0;

  const getProcessedOptions = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    let options = getProductOptions(group);
    const selectedCount = groupSummariesById[groupId]?.selectedCount || 0;
    const maximum = resolveEffectiveGroupMaximum(group);
    const isMaxReached = maximum !== null && selectedCount >= maximum;

    if (isMaxReached) {
      options = options.filter(option => isSelected(groupId, option.value));
    }

    const now = timeNow();
    return options.map(option => ({
      ...option,
      disable:
        isMaxSelected(group, option.value) ||
        isOptionDisabledByRules(groupId, option.value, now),
    }));
  };

  const isOptionDisabledByRules = (groupId, optionValue, now) => {
    const extra = optionValue?.extraData || {};

    // Channel rule
    const channels = parseCsv(extra.channels || '');
    if (channels.length > 0) {
      const normalized = channels.map(c => c.toLowerCase());
      if (!normalized.includes(activeChannel)) return true;
    }

    // Availability time window rule (HH:mm)
    const from = extra.availableFrom || '';
    const to = extra.availableTo || '';
    if (!isBetweenTime(now, from, to)) return true;

    // Incompatibility rule with selected options by id
    const incompatibleIds = parseCsv(extra.incompatibleWith || '').map(v =>
      String(v).replace(/\D/g, ''),
    );
    if (incompatibleIds.length > 0) {
      const selectedIds = Object.values(selectedItems)
        .flat()
        .filter(item => item.selected)
        .map(item => String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, ''))
        .filter(Boolean);
      if (incompatibleIds.some(id => selectedIds.includes(id))) return true;
    }

    // Substitution rule: if substituteFor is set and target is already selected, block this option
    const substituteFor = String(extra.substituteFor || '').replace(/\D/g, '');
    if (substituteFor) {
      const targetSelected = Object.values(selectedItems)
        .flat()
        .filter(item => item.selected)
        .some(item => {
          const id = String(item?.productChild?.id || item?.productChild?.['@id'] || '').replace(/\D/g, '');
          return id === substituteFor;
        });
      if (targetSelected) return true;
    }

    return false;
  };

  const getProductOptions = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const groupItems = selectedItems[groupId] || [];
    if (!Array.isArray(groupItems)) {
      return [];
    }
    return groupItems.map(product => ({
      label: product.productChild?.product,
      value: product,
    }));
  };

  const isSelected = (groupId, value) => {
    const normalizedGroupId = String(groupId || '');
    return (
      selectedItems[normalizedGroupId]?.some(
        item => item['@id'] === value['@id'] && item.selected,
      ) || false
    );
  };

  const isMaxSelected = (group, product) => {
    const maximum = resolveEffectiveGroupMaximum(group);
    if (maximum === null) {
      return false;
    }
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const selectedGroup = selectedItems[groupId] || [];
    return (
      selectedGroup.filter(item => item.selected).length >= maximum &&
      !selectedGroup.some(p => p['@id'] === product['@id'] && p.selected)
    );
  };

  const handleToggleOption = (groupId, option) => {
    const normalizedGroupId = String(groupId || '');
    setSelectedItems(prev => {
      const selectedGroup = Array.isArray(prev[normalizedGroupId])
        ? prev[normalizedGroupId]
        : [];
      const optionId = option?.value?.['@id'];
      const currentGroup = resolvedProductGroupsById[normalizedGroupId];
      const maximum = resolveEffectiveGroupMaximum(currentGroup);
      const selectedCount = selectedGroup.filter(item => item?.selected).length;
      const targetOption = selectedGroup.find(item => item['@id'] === optionId);
      const isCurrentlySelected = !!targetOption?.selected;

      if (!isCurrentlySelected && maximum !== null && selectedCount >= maximum) {
        return prev;
      }

      const updatedGroup = selectedGroup.map(item =>
        item['@id'] === optionId
          ? {...item, selected: !item.selected}
          : item,
      );

      return {
        ...prev,
        [normalizedGroupId]: updatedGroup,
      };
    });
  };

  const getSubproducts = () => {
    const subProducts = [];
    Object.entries(selectedItems).forEach(([groupId, groupItems]) => {
      groupItems.forEach(item => {
        if (item.selected) {
          subProducts.push({
            product: item.productChild['@id'].replace(/\D/g, ''),
            productGroup: parseInt(groupId),
            quantity: parseFloat(String(item.quantity || 1).replace(',', '.')) || 1,
          });
        }
      });
    });
    return subProducts;
  };

  const addHandle = async () => {
    if (!activeProductIri || !activeOrderIri) {
      const message =
        'Nao foi possivel identificar produto ou carrinho para adicionar.';
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }
      return;
    }

    if (invalidGroupSummaries.length > 0) {
      const message = invalidGroupSummaries
        .map(summary => `${summary.groupName}: ${summary.validationMessage}`)
        .join('\n');

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }

      return;
    }

    const orderProductData = {
      ...(activeOrderProductId ? {id: activeOrderProductId} : {}),
      product: activeProductIri,
      sub_products: getSubproducts(),
      order: activeOrderIri,
      quantity: Number(activeOrderProduct?.quantity || 1),
    };

    try {
      await orderProductsActions.save(orderProductData);

      try {
        await refreshSavedOrderProducts();
      } catch {
        // The parent screen will still refetch on focus; avoid leaving local
        // order state in a shallow-merged, inconsistent hierarchy.
      }

      leaveCustomizeScreen();
    } catch (error) {
      const message =
        error?.message ||
        'Nao foi possivel salvar a customizacao do item.';

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        Alert.alert('Atencao', message);
      }
    }
  };

  const renderOption = (group, option, index) => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const isOptionSelected = isSelected(groupId, option.value);
    const optionQuantityLabel = formatOptionQuantity(option.value?.quantity || 1);
    const optionUnitLabel =
      option.value?.productChild?.productUnit?.productUnit ||
      option.value?.productChild?.productUnity?.productUnit ||
      option.value?.productChild?.productUnit?.unit ||
      option.value?.productChild?.productUnity?.unit ||
      '';

    return (
      <View
        key={`${group.id}-${index}`}
        style={inlineStyle_344_8({
          index: index,
        })}>
        <TouchableOpacity
          onPress={() => handleToggleOption(groupId, option)}
          style={inlineStyle_352_10}
          disabled={option.disable}
          activeOpacity={0.8}>
          <View style={inlineStyle_354_16}>
            <Text style={inlineStyle_355_18}>
              {isOptionSelected ? '✓' : '○'}
            </Text>
            <View style={{flex: 1}}>
              <Text style={styles.text}>{option.label}</Text>
              <Text style={{color: '#8A94A6', fontSize: 12, marginTop: 2}}>
                Adiciona {optionQuantityLabel}
                {optionUnitLabel ? ` ${optionUnitLabel}` : ''}
              </Text>
            </View>
          </View>
          <View
            style={inlineStyle_361_12}>
            <Text style={styles.text}>
              {Formatter.formatMoney(option.value?.price, 'R$', 'pt-br')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroup = group => {
    const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
    const summary = groupSummariesById[groupId];
    const compactSummaryParts = [
      summary?.isRequired ? 'Obrigatorio' : 'Opcional',
      resolveCompactSelectionRuleLabel(
        summary?.minimum || 0,
        summary?.maximum ?? null,
      ),
      `preco: ${summary?.priceCalculationLabel || 'soma'}`,
      resolveCompactGroupStateLabel(summary),
    ];

    return (
      <View key={group.id} style={inlineStyle_378_27}>
        <Text style={[styles.text, {fontWeight: '700', color: '#23384D'}]}>
          {group.productGroup}
        </Text>
        <Text style={inlineStyle_421_18}>{compactSummaryParts.join(' • ')}</Text>
        {!summary?.isValid ? (
          <Text style={inlineStyle_449_18}>{summary.validationMessage}</Text>
        ) : null}
        <View>
          {getProcessedOptions(group).map((item, index) =>
            renderOption(group, item, index),
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={inlineStyle_401_10}>
      <ScrollView
        style={inlineStyle_402_18}
        contentContainerStyle={{paddingBottom: 24}}>
        {resolvedProductGroups.map(group => renderGroup(group))}
      </ScrollView>
      <TouchableOpacity
        onPress={addHandle}
        disabled={isSavingCustomization || !canSubmitCustomization}
        style={[
          globalStyles.button,
          styles.customizeProduct?.Button,
          !canSubmitCustomization && !isSavingCustomization ? {opacity: 0.65} : null,
          {marginTop: 16, marginBottom: 8, maxHeight: '10%'},
        ]}>
        <Text style={styles.customizeProduct?.ButtonText}>
          {isSavingCustomization
            ? 'SALVANDO...'
            : isEditingExistingOrderProduct
              ? 'MODIFICAR'
              : 'ADICIONAR'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default CustomizeScreen;
