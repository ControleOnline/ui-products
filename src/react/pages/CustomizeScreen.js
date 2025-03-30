import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import css from '@controleonline/ui-products/src/react/css/products';
import {getStore} from '@store';

const CustomizeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {product} = route.params || {};
  const {globalStyles, styles} = css();
  const [selectedItems, setSelectedItems] = useState({});
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const {actions: productGroupActions} = getStore('product_group');
  const {actions: productGroupProductActions} = getStore(
    'product_group_product',
  );

  useEffect(() => {
    if (product) {
      product.selectedItems = {...selectedItems};
    }
  }, [selectedItems, product]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    if (!product || !product['@id'] || !product.id) {
      setError('Produto inválido');
      setLoading(false);
      return;
    }

    try {
      const response = await productGroupActions.getItems({
        product: product.id,
        'product.productType': 'component',
      });
      const newGroups = Array.isArray(response) ? [...response] : [];

      for (let group of newGroups) {
        const groupProducts = await fetchProductGroupProducts(group);
        setSelectedItems(prev => ({
          ...prev,
          [group.id]: [],
        }));
        group.products = Array.isArray(groupProducts)
          ? groupProducts.map(product => ({...product, selected: false}))
          : [];
      }
      setGroups(newGroups);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductGroupProducts = async group => {
    const result = await productGroupProductActions.getItems({
      productGroup: `/product_groups/${group.id}`,
      productType: 'component',
    });
    return result;
  };

  const getProcessedOptions = group => {
    let options = getProductOptions(group);
    const selectedCount = selectedItems[group.id]?.length || 0;
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
    if (!Array.isArray(group.products)) return [];
    return group.products.map(product => ({
      label: product.productChild?.product || 'Sem Nome',
      value: product,
    }));
  };

  const isSelected = (groupId, value) => {
    return (
      selectedItems[groupId]?.some(item => item['@id'] === value['@id']) ||
      false
    );
  };

  const isMaxSelected = (group, product) => {
    if (!group.maximum) return false;
    const selectedGroup = selectedItems[group.id] || [];
    return (
      selectedGroup.length >= group.maximum &&
      !selectedGroup.some(p => p['@id'] === product['@id'])
    );
  };

  const handleToggleOption = (groupId, option) => {
    const selectedGroup = selectedItems[groupId] || [];
    const isOptionSelected = isSelected(groupId, option.value);

    if (isOptionSelected) {
      setSelectedItems({
        ...selectedItems,
        [groupId]: selectedGroup.filter(
          item => item['@id'] !== option.value['@id'],
        ),
      });
    } else if (
      !isMaxSelected(
        {id: groupId, maximum: groups.find(g => g.id === groupId)?.maximum},
        option.value,
      )
    ) {
      setSelectedItems({
        ...selectedItems,
        [groupId]: [...selectedGroup, option.value],
      });
    }
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
          <View style={{flex: 0.6}}>
            <Text style={styles.text}>{option.label || 'Sem Nome'}</Text>
          </View>
          <View
            style={{
              flex: 0.4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
            <Text style={styles.text}>
              {Formatter.formatMoney(option.value?.price || 0, 'R$', 'pt-br')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroup = group => {
    return (
      <View key={group.id} style={{marginTop: 16, padding: 16}}>
        <Text style={styles.text}>
          {group.productGroup || 'Grupo sem nome'}
        </Text>
        {group.required && <Text>Grupo obrigatório!</Text>}
        {group.minimum > 0 && group.maximum > 0 ? (
          <Text style={styles.text}>
            Escolha entre {group.minimum} e {group.maximum}{' '}
            {group.productGroup || 'itens'}
          </Text>
        ) : null}
        {!group.minimum && group.maximum > 0 ? (
          <Text style={styles.text}>
            Escolha até {group.maximum} {group.productGroup || 'itens'}
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
        {groups.map(group => renderGroup(group))}
      </ScrollView>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[
          globalStyles.button,
          styles.customizeProduct?.Button,
          {marginTop: 16},
        ]}>
        <Text style={styles.customizeProduct?.ButtonText}>VOLTAR</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CustomizeScreen;
