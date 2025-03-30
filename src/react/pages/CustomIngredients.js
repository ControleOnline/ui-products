import React from 'react';
import { View, Text, Button } from 'react-native';

const CustomIngredients = ({ product }) => {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Customizar Ingredientes para {product?.product || 'Produto'}</Text>
      <Button title="Fechar" onPress={() => {}} />
    </View>
  );
};

export default CustomIngredients;