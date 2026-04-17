import React from 'react';
import {View, Text, Button} from 'react-native';
import { inlineStyle_11_6 } from './CustomIngredients.styles';

const CustomIngredients = ({productGroupProducts}) => {
  const showProduct = () => {
    console.log(productGroupProducts);
  };

  return (
    <View
      style={inlineStyle_11_6}>
      <Text>Customizar Ingredientes para </Text>
      <Button title="Fechar" onPress={showProduct} />
    </View>
  );
};

export default CustomIngredients;
