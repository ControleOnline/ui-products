import React from 'react';
import {View, Text, Button} from 'react-native';

const CustomIngredients = ({productGroupProducts}) => {
  const showProduct = () => {
    console.log(productGroupProducts);
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Customizar Ingredientes para </Text>
      <Button title="Fechar" onPress={showProduct} />
    </View>
  );
};

export default CustomIngredients;
