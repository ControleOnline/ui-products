import React, {useState, useCallback, useMemo, useEffect} from 'react';
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
} from './CustomizeScreen.styles';
import {mergeOrderWithOrderProducts} from '@controleonline/ui-orders/src/utils/orderState';

const normalizeEntityId = value => {
  const clean = String(value || '').replace(/\D/g, '');
  return clean || null;
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

  useFocusEffect(
    useCallback(() => {
      init();
    }, [activeProductId]),
  );

  useEffect(() => {
    setSelectedItems({});
  }, [activeOrderProductId, activeProductId]);

  useFocusEffect(
    useCallback(() => {
      if (activeOrderProductId) {
        orderProductsActions.get(activeOrderProductId).catch(() => null);
      }

      if (
        activeProductId &&
        normalizeEntityId(activeProduct?.id || activeProduct?.['@id']) !== activeProductId
      ) {
        productsActions.get(activeProductId).catch(() => null);
      }
    }, [
      activeOrderProduct?.['@id'],
      activeOrderProduct?.id,
      activeOrderProductId,
      activeProduct?.['@id'],
      activeProduct?.id,
      activeProductId,
      orderProductsActions,
      productsActions,
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!Array.isArray(productGroups) || productGroups.length === 0) {
        setSelectedItems({});
        return () => {
          isActive = false;
        };
      }

      Promise.all(
        productGroups.map(async group => {
          const groupProducts = await productGroupProductActions.getItems({
            productGroup: `/product_groups/${group.id}`,
            productType: 'component',
          });
          const existingSelections =
            existingSelectionsByGroup[String(group.id)] || {};

          return [
            String(group.id),
            (Array.isArray(groupProducts) ? groupProducts : []).map(item => ({
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
      )
        .then(entries => {
          if (!isActive) {
            return;
          }

          setSelectedItems(Object.fromEntries(entries));
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setSelectedItems({});
        });

      return () => {
        isActive = false;
      };
    }, [existingSelectionsByGroup, productGroupProductActions, productGroups]),
  );

  const init = () => {
    if (!activeProductId) {
      return;
    }
    productGroupActions.getItems({
      product: activeProductId,
      'product.productType': 'component',
    });
  };

  const getProcessedOptions = group => {
    let options = getProductOptions(group);
    const selectedCount =
      selectedItems[group.id]?.filter(item => item.selected).length || 0;
    const isMaxReached = group.maximum && selectedCount >= group.maximum;

    if (isMaxReached) {
      options = options.filter(option => isSelected(group.id, option.value));
    }

    const now = timeNow();
    return options.map(option => ({
      ...option,
      disable:
        isMaxSelected(group, option.value) ||
        isOptionDisabledByRules(group.id, option.value, now),
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
    const groupItems = selectedItems[group.id] || [];
    if (!Array.isArray(groupItems)) {
      return [];
    }
    return groupItems.map(product => ({
      label: product.productChild?.product,
      value: product,
    }));
  };

  const isSelected = (groupId, value) => {
    return (
      selectedItems[groupId]?.some(
        item => item['@id'] === value['@id'] && item.selected,
      ) || false
    );
  };

  const isMaxSelected = (group, product) => {
    if (!group.maximum) {
      return false;
    }
    const selectedGroup = selectedItems[group.id] || [];
    return (
      selectedGroup.filter(item => item.selected).length >= group.maximum &&
      !selectedGroup.some(p => p['@id'] === product['@id'] && p.selected)
    );
  };

  const handleToggleOption = (groupId, option) => {
    setSelectedItems(prev => {
      const selectedGroup = prev[groupId] || [];
      const updatedGroup = selectedGroup.map(item =>
        item['@id'] === option.value['@id']
          ? {...item, selected: !item.selected}
          : item,
      );

      if (!updatedGroup.some(item => item['@id'] === option.value['@id'])) {
        if (
          !isMaxSelected(
            {
              id: groupId,
              maximum: productGroups.find(g => g.id === groupId)?.maximum,
            },
            option.value,
          )
        ) {
          updatedGroup.push({...option.value, selected: true});
        }
      }

      return {
        ...prev,
        [groupId]: updatedGroup,
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
    const isOptionSelected = isSelected(group.id, option.value);
    return (
      <View
        key={`${group.id}-${index}`}
        style={inlineStyle_344_8({
          index: index,
        })}>
        <TouchableOpacity
          onPress={() => handleToggleOption(group.id, option)}
          style={inlineStyle_352_10}
          disabled={option.disable}>
          <View style={inlineStyle_354_16}>
            <Text style={inlineStyle_355_18}>
              {isOptionSelected ? '✓' : '○'}
            </Text>
            <Text style={styles.text}>{option.label}</Text>
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
    return (
      <View key={group.id} style={inlineStyle_378_27}>
        <Text style={styles.text}>{group.productGroup}</Text>
        {group.required && <Text>Grupo obrigatório!</Text>}
        {group.minimum > 0 && group.maximum > 0 ? (
          <Text style={styles.text}>
            Escolha entre {group.minimum} e {group.maximum} {group.productGroup}
          </Text>
        ) : null}
        {!group.minimum && group.maximum > 0 ? (
          <Text style={styles.text}>
            Escolha até {group.maximum} {group.productGroup}
          </Text>
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
        {productGroups.map(group => renderGroup(group))}
      </ScrollView>
      <TouchableOpacity
        onPress={addHandle}
        disabled={isSavingCustomization}
        style={[
          globalStyles.button,
          styles.customizeProduct?.Button,
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
