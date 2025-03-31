import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-products/src/react/css/products';
import {getStore} from '@store';

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {product} = route.params || {};
  const {globalStyles, styles} = css();
  const [selectedItems, setSelectedItems] = useState({});
  const [saved, setSaved] = useState({});

  const {getters: ordersGetters} = getStore('orders');
  const {getters: productGroupsGetters, actions: productGroupActions} =
    getStore('product_group');
  const {items: productGroups} = productGroupsGetters;
  const {actions: productGroupProductActions} = getStore(
    'product_group_product',
  );
  const {getters: orderProductGetters, actions: orderProductActions} =
    getStore('order_products');
  const {item: order} = ordersGetters;
  const {items: orderProducs} = orderProductGetters;

  useFocusEffect(
    useCallback(() => {
      product.selectedItems = {...selectedItems};
    }, [selectedItems, product]),
  );

  useFocusEffect(
    useCallback(() => {
      init();
    }, []),
  );
  useFocusEffect(
    useCallback(() => {
      if (Object.keys(saved).length == 0) return;
      const updatedOrderProducts = orderProducs.map(op =>
        op['@id'] === saved['@id']
          ? {...op, sub_products: getSubproducts()}
          : op,
      );
      setSaved({});
      orderProductActions.setItems(updatedOrderProducts);
      navigation.pop(3);
    }, [orderProducs, saved]),
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
    productGroupActions.getItems({
      product: product.id,
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

    return options.map(option => ({
      ...option,
      disable: isMaxSelected(group, option.value),
    }));
  };

  const getProductOptions = group => {
    const groupItems = selectedItems[group.id] || [];
    if (!Array.isArray(groupItems)) return [];
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
    if (!group.maximum) return false;
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
            quantity: 1,
          });
        }
      });
    });
    return subProducts;
  };

  const addHandle = () => {
    const orderProductData = {
      product: product['@id'],
      sub_products: getSubproducts(),
      order: order['@id'],
      quantity: 1,
    };

    orderProductActions.save(orderProductData).then(data => {
      setSaved(data);
    });
  };

  const renderOption = (group, option, index) => {
    const isOptionSelected = isSelected(group.id, option.value);
    return (
      <View
        key={`${group.id}-${index}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: index % 2 ? 'rgba(0, 0, 0, 0.03)' : '#fff',
        }}>
        <TouchableOpacity
          onPress={() => handleToggleOption(group.id, option)}
          style={{flexDirection: 'row', flex: 1, alignItems: 'center'}}
          disabled={option.disable}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 0.6}}>
            <Text style={{marginRight: 8, color: '#007AFF', fontSize: 18}}>
              {isOptionSelected ? '✓' : '○'}
            </Text>
            <Text style={styles.text}>{option.label}</Text>
          </View>
          <View
            style={{
              flex: 0.4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
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
      <View key={group.id} style={{marginTop: 16, padding: 16}}>
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
    <View style={{flex: 1, padding: 16}}>
      <ScrollView style={{flex: 1}}>
        {productGroups.map(group => renderGroup(group))}
      </ScrollView>
      <TouchableOpacity
        onPress={addHandle}
        style={[
          globalStyles.button,
          styles.customizeProduct?.Button,
          {marginTop: 16},
        ]}>
        <Text style={styles.customizeProduct?.ButtonText}>ADICIONAR</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CustomizeScreen;
