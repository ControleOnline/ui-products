import React, {useState, useCallback, useMemo} from 'react';
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

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {product, redirectToCart = false} = route.params || {};
  const {globalStyles, styles} = css();
  const [selectedItems, setSelectedItems] = useState({});
  const [saved, setSaved] = useState({});

  const ordersStore = useStore('orders');
  const ordersActions = ordersStore.actions;
  const ordersGetters = ordersStore.getters;
  const product_groupStore = useStore('product_group');
  const productGroupsGetters = product_groupStore.getters;
  const productGroupActions = product_groupStore.actions;
  const {items: productGroups} = productGroupsGetters;
  const productsStore = useStore('products');
  const productsGetters = productsStore.getters;
  const productGroupProductStore = useStore('product_group_product');
  const productGroupProductActions = productGroupProductStore.actions;
  const cartStore = useStore('cart');
  const cartGetters = cartStore.getters;

  const order_productsStore = useStore('order_products');
  const orderProductsActions = order_productsStore.actions;
  const {item: order} = ordersGetters;
  const {item: cart} = cartGetters;
  const activeChannel = String(order?.app || env.APP_TYPE || 'default').toLowerCase();

  const normalizeId = value => {
    const clean = String(value || '').replace(/\D/g, '');
    return clean || null;
  };

  const activeProduct = useMemo(() => {
    if (product && typeof product === 'object') {
      return product;
    }
    if (productsGetters?.item && typeof productsGetters.item === 'object') {
      return productsGetters.item;
    }
    return null;
  }, [product, productsGetters?.item]);

  const activeProductId = useMemo(
    () =>
      normalizeId(
        activeProduct?.id ||
          activeProduct?.['@id'] ||
          route.params?.productId ||
          route.params?.id,
      ),
    [activeProduct?.id, activeProduct?.['@id'], route.params?.id, route.params?.productId],
  );

  const activeProductIri = useMemo(() => {
    if (activeProduct?.['@id']) {
      return activeProduct['@id'];
    }
    return activeProductId ? `/products/${activeProductId}` : null;
  }, [activeProduct, activeProductId]);

  const activeOrderIri = useMemo(() => {
    if (order?.['@id']) {
      return order['@id'];
    }
    if (cart?.['@id']) {
      return cart['@id'];
    }
    return cart?.id ? `/orders/${cart.id}` : null;
  }, [cart, order]);

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
      if (activeProduct && typeof activeProduct === 'object') {
        activeProduct.selectedItems = {...selectedItems};
      }
    }, [activeProduct, selectedItems]),
  );

  useFocusEffect(
    useCallback(() => {
      init();
    }, [activeProductId]),
  );
  useFocusEffect(
    useCallback(() => {
      if (Object.keys(saved).length == 0) {
        return;
      }
      const currentOrderProducts = Array.isArray(order?.orderProducts)
        ? order.orderProducts
        : [];
      const updatedOrderProducts = currentOrderProducts.map(op =>
        op['@id'] === saved['@id']
          ? {...op, sub_products: getSubproducts()}
          : op,
      );
      setSaved({});
      if (order && typeof order === 'object') {
        const currentOrder = {...order};
        currentOrder.orderProducts = updatedOrderProducts;
        ordersActions.setItem(currentOrder);
      }

      if (redirectToCart) {
        navigation.navigate('ShopCartPage');
        return;
      }

      navigation.pop(3);
    }, [order, redirectToCart, saved]),
  );

  useFocusEffect(
    useCallback(() => {
      for (let group of productGroups) {
        productGroupProductActions
          .getItems({
            productGroup: `/product_groups/${group.id}`,
            productType: 'component',
          })
          .then(groupProducts => {
            setSelectedItems(prev => ({
              ...prev,
              [group.id]: groupProducts.map(item => ({
                ...item,
                selected: false,
              })),
            }));
          });
      }
    }, [productGroups]),
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

  const addHandle = () => {
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
      product: activeProductIri,
      sub_products: getSubproducts(),
      order: activeOrderIri,
      quantity: 1,
    };

    orderProductsActions.save(orderProductData).then(data => {
      setSaved(data);
    });
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
      <ScrollView style={inlineStyle_402_18}>
        {productGroups.map(group => renderGroup(group))}
      </ScrollView>
      <TouchableOpacity
        onPress={addHandle}
        style={[
          globalStyles.button,
          styles.customizeProduct?.Button,
          {marginTop: 16, maxHeight: '10%'},
        ]}>
        <Text style={styles.customizeProduct?.ButtonText}>ADICIONAR</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CustomizeScreen;
