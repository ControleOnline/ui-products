import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useStore } from '@store';

const ProductGroupProducts = ({ productGroup, ProductId }) => {
  const store = useStore('product_group_product');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!ProductId) {
      // nothing to load yet
      setLoaded(false);
      return () => { mounted = false; };
    }

    setLoaded(false);

    // fetch items for this filter set using getItems
    store.actions
      .getItems({ product: `/products/${ProductId}`, productGroup, productType: 'component' })
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => { mounted = false; };
  }, [ProductId, productGroup]);

  if (!loaded) return null;

  return (
    <ScrollView horizontal>
      <View style={{ minWidth: 800 }}>
        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}>
          <Text style={{ flex: 1 }}>ID</Text>
          <Text style={{ flex: 2 }}>Produto</Text>
          <Text style={{ flex: 1 }}>Tipo</Text>
        </View>

        {store.items?.map((item) => (
          <View
            key={item.id}
            style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}
          >
            <Text style={{ flex: 1 }}>{item.id}</Text>
            <Text style={{ flex: 2 }}>
              {(
                item.productChild?.name ||
                item.productChild?.product ||
                item.productChild?.title ||
                item.productChild?.label ||
                (item.productChild && (item.productChild.name || item.productChild.product)) ||
                String(item.productChild?.id || item.productChild?.['@id'] || '')
              )}
            </Text>
            <Text style={{ flex: 1 }}>
              {item.productChild?.type}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ProductGroupProducts;