import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel'

const ProductForm = ({ route }) => {
  const { ProductId } = route.params || {};
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const peopleStore = useStore('people');

  const { actions: productActions } = productsStore;
  const { getters: peopleGetters } = peopleStore;

  const { currentCompany } = peopleGetters;

  const [product, setProduct] = useState(null);

  const isDesktop = width >= 768;

  const carouselConfigs = useMemo(
    () => ({
      store: 'product_file',
      isAdmin: true,
      context: 'products',
      zoom: false,
    }),
    [],
  );

  const getData = useCallback(() => {
    if (ProductId) {
      productActions.get(ProductId).then(data => {
        setProduct(data);
      });
    }
  }, [ProductId]);

  useEffect(() => {
    getData();
  }, [getData]);

  const handleChange = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = () => {
    if (!product?.id) return;
    productActions.save(product).then(getData);
  };

  if (!product) return null;

  const fields = [
    { name: 'sku', label: 'SKU' },
    { name: 'product', label: 'Produto' },
    { name: 'description', label: 'Descrição' },
    { name: 'productUnit', label: 'Unidade' },
    { name: 'type', label: 'Tipo' },
    { name: 'productCondition', label: 'Condição' },
    { name: 'price', label: 'Preço', keyboard: 'numeric' },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StateStore store="products" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 16,
          }}
        >
          {product?.id && (
            <View
              style={{
                width: isDesktop ? '20%' : '100%',
              }}
            >
              <Carousel
                images={product.productFiles || []}
                style={{ flex: 1 }}
              />
            </View>
          )}

          <View
            style={{
              width: product?.id
                ? isDesktop
                  ? '80%'
                  : '100%'
                : '100%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {fields.map(field => (
              <View
                key={field.name}
                style={{
                  width: isDesktop ? '33%' : '100%',
                }}
              >
                <Text style={{ marginBottom: 4 }}>
                  {field.label}
                </Text>

                <TextInput
                  value={String(product[field.name] || '')}
                  onChangeText={value =>
                    handleChange(field.name, value)
                  }
                  onBlur={handleBlur}
                  keyboardType={field.keyboard || 'default'}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 6,
                    padding: 10,
                    marginBottom: 12,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProductForm;