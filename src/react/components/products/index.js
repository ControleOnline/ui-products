import React, {useEffect, useState} from 'react';
import {TouchableOpacity, Text, View, ScrollView} from 'react-native';
import {getStore} from '@store';
import css from '@controleonline/ui-products/src/react/css/products';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';

export default ProductsList = props => {
  const {orderId} = props;
  const styles = css();

  const {getters, actions} = getStore('order_products');
  const {items, isLoading, error, columns} = getters;
  useEffect(() => {
    actions.getItems({
      company: '/people/4',
      order: 'orders/' + orderId,
      'exists[parentProduct]': 'false',
    });
  }, [orderId]);

  const handleDetailProduct = productId => {
    console.log('productId: ', productId);
  };

  return (
    <ScrollView>
      <Text style={styles.subHeader}>Itens do Pedido</Text>
      <StateStore store="order_products" />
      {!isLoading && items.length > 0 && !error && (
        <>
          {items.map(product => (
            <TouchableOpacity
              key={product.id}
              onPress={() => handleDetailProduct(product.id)}
              activeOpacity={0.6}
              style={styles.boxWrap}>
              <View>
                <View style={styles.boxHeader}>
                  <Text style={[styles.boxTextColor, styles.boxOrderText]}>
                    {' '}
                    #{product.id}
                  </Text>
                  <Text style={[styles.boxTextColor, styles.boxPrice]}>
                    {product.product.product}
                  </Text>
                </View>
                <View style={styles.boxContent}>
                  <Text style={[styles.boxDateText, styles.boxTextColor]}>
                    {product.product.description}
                  </Text>
                </View>
                <View style={styles.boxContent}>
                  <Text style={[styles.boxDateText, styles.boxTextColor]}>
                    {product.product['@type']}
                  </Text>
                  <Text style={styles.boxStatusText}>{product.price}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
};
