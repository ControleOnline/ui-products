import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useStore } from '@store';

const ProductFeedStock = ({ row, componentProps }) => {
  const store = useStore('product_group_feedstock');
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const productId = row?.productChild?.['@id'] || row?.productChild?.id || null;
  const productGroup = componentProps?.productGroup || null;

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    if (!productId) return;

    // fetch feedstock items for this product/productGroup
    setLoaded(false);
    store.actions
      .getItems({ product: productId, productGroup, productType: 'feedstock' })
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => { mounted = false; };
  }, [visible, productId, productGroup]);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={{ padding: 6 }}>
        <Text style={{ color: '#007aff' }}>Info</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, padding: 16 }}>
          <TouchableOpacity onPress={() => setVisible(false)} style={{ marginBottom: 12 }}>
            <Text style={{ color: '#007aff' }}>Fechar</Text>
          </TouchableOpacity>

          {!loaded && <Text>Carregando...</Text>}

          {loaded && (
            <ScrollView>
              <View style={{ minWidth: 600 }}>
                <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}>
                  <Text style={{ flex: 1 }}>ID</Text>
                  <Text style={{ flex: 2 }}>Produto</Text>
                  <Text style={{ flex: 1 }}>Tipo</Text>
                </View>

                {store.items?.map(item => (
                  <View key={item.id} style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}>
                    <Text style={{ flex: 1 }}>{item.id}</Text>
                    <Text style={{ flex: 2 }}>{item.productChild?.name || item.productChild?.product || String(item.productChild?.id || '')}</Text>
                    <Text style={{ flex: 1 }}>{item.productChild?.type}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
};

export default ProductFeedStock;
