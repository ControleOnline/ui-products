import {React} from 'react';
import {TouchableOpacity, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import css from '@controleonline/ui-products/src/react/css/products';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';

const ProductItem = ({product, category}) => {
  const navigation = useNavigation();
  const {styles, globalStyles} = css();
  const currentPageName =
    navigation.getState().routes[navigation.getState().index].name;

  const handleCustomize = product => {
    navigation.navigate('CustomizeScreen', {product});
  };

  return (
    <View style={[styles.boxWrap, styles.productItem.cardContainer]}>
      <View style={styles.productItem.rowContainer}>
        <View style={styles.productItem.infoContainer}>
          <View style={styles.productItem.columnContainer}>
            <Text
              style={[
                styles.boxTextColor,
                styles.boxOrderText,
                styles.productItem.productName,
              ]}>
              {product.product}
            </Text>
            <Text
              style={[
                styles.boxDateText,
                styles.boxTextColor,
                styles.productItem.productDescription,
              ]}>
              {product.description}
            </Text>
          </View>
        </View>

        <View style={styles.productItem.imageContainer}>
          <Carousel images={product.productFiles} />
        </View>
      </View>

      <View style={styles.productItem.priceRow}>
        <View style={styles.productItem.priceContainer}>
          <Text style={styles.productItem.priceText}>
            {product.quantity > 0 ? product.quantity + ' X ' : ''}
            {Formatter.formatMoney(product.price)}
          </Text>
          {product.quantity > 0 && (
            <Text style={styles.productItem.priceTotalText}>
              {Formatter.formatMoney(product.quantity * product.price)}
            </Text>
          )}
        </View>
        <View style={styles.productItem.actionContainer}>
          {product.type === 'custom' ? (
            <TouchableOpacity
              onPress={() => handleCustomize(product)}
              style={[globalStyles.button, styles.productItem.customizeButton]}>
              <Text style={styles.productItem.customizeButtonText}>
                CUSTOMIZAR
              </Text>
            </TouchableOpacity>
          ) : (
            <ProductQuantity
              product={product}
              category={category}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default ProductItem;
