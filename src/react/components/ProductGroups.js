import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import ProductGroupProducts from './ProductGroupProducts';

const ProductGroups = ({ ProductId }) => {
  const productGroupStore = useStore('product_group');
  const peopleStore = useStore('people');

  const { actions } = productGroupStore;
  const { currentCompany } = peopleStore.getters;

  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  // don't load or allow edits when there's no parent product
  if (!ProductId) return null;

  const loadData = useCallback(() => {
    actions
      .getItems({
        parentProduct: `/products/${ProductId}`,
        people: currentCompany?.id,
      })
      .then(response => {
        const items = response || [];
        setGroups(items);
        // preserve expanded state by group id when possible
        setExpanded(prev => {
          const next = {};
          items.forEach((g, i) => {
            const id = g['@id'] || g.id || String(i);
            next[id] = !!prev[id];
          });
          return next;
        });
        setReloadKey(prev => prev + 1);
      });
  }, [ProductId, currentCompany]);

  const updateGroup = useCallback(
    group => {
      const data = { ...group };
      delete data.products;

      data.minimum = parseFloat(data.minimum);
      data.maximum = parseFloat(data.maximum);
      data.groupOrder = parseFloat(data.groupOrder);
      data.productGroup = String(data.productGroup);
      data.priceCalculation =
        data.priceCalculation?.value || data.priceCalculation;

      actions.save(data).then(loadData);
    },
    [loadData],
  );

  const createGroup = () => {
    actions
      .save({
        parentProduct: `/products/${ProductId}`,
        people: currentCompany?.id,
        productGroup: 'Novo Grupo',
        minimum: 0,
        maximum: 1,
        required: false,
        priceCalculation: 'sum',
      })
      .then(loadData);
  };

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  const toggleExpand = id => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <StateStore store="product_group" />

      <TouchableOpacity
        onPress={createGroup}
        style={{
          backgroundColor: '#000',
          padding: 12,
          borderRadius: 6,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          Adicionar Grupo
        </Text>
      </TouchableOpacity>

      {groups.map((group, index) => {
        const gid = group['@id'] || group.id || String(index);
        return (
          <View key={gid} style={{ marginBottom: 20 }}>
            <TouchableOpacity onPress={() => toggleExpand(gid)}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {group.productGroup}
              </Text>
            </TouchableOpacity>

            {expanded[gid] && (
              <View style={{ marginTop: 12 }}>
              <TextInput
                value={group.productGroup}
                onChangeText={text =>
                  updateGroup({ ...group, productGroup: text })
                }
                placeholder="Grupo"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ marginRight: 10 }}>Obrigatório</Text>
                <Switch
                  value={group.required}
                  onValueChange={val =>
                    updateGroup({ ...group, required: val })
                  }
                />
              </View>

              <TextInput
                value={String(group.minimum || '')}
                onChangeText={text =>
                  updateGroup({ ...group, minimum: text })
                }
                placeholder="Mínimo"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                }}
              />

              <TextInput
                value={String(group.maximum || '')}
                onChangeText={text =>
                  updateGroup({ ...group, maximum: text })
                }
                placeholder="Máximo"
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: '#ccc',
                  padding: 10,
                  borderRadius: 6,
                }}
              />

              <ProductGroupProducts
                key={group['@id'] || group.id || reloadKey}
                products={group.products}
                productGroup={group['@id'] || group.id}
                ProductId={ProductId}
              />
            </View>
          )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default ProductGroups;