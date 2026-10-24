import React from 'react';
import {View, Text, Image} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import styles from './ProductItem.styles';

export default function ProductSearchResult({product, coverUrl, hasImage, resolvedPalette, action}) {
  return (
      <View
        style={[
          styles.searchResultCard,
          {
            backgroundColor: resolvedPalette.cardBackground,
            borderColor: resolvedPalette.cardBorder,
          },
        ]}
      >
        <View style={[styles.searchResultImageWrap, { borderColor: resolvedPalette.cardBorder }]}>
          {hasImage ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.searchResultImage}
              resizeMode="contain"
            />
          ) : (
            <MaterialCommunityIcons
              name="image-outline"
              size={22}
              color={resolvedPalette.iconDisabled}
            />
          )}
        </View>
        <View style={styles.searchResultCopy}>
          <Text style={[styles.searchResultName, { color: resolvedPalette.cardText }]} numberOfLines={2}>
            {product.product}
          </Text>
          {!!product.description ? (
            <Text style={styles.searchResultDescription} numberOfLines={2}>
              {product.description}
            </Text>
          ) : null}
          <Text style={[styles.searchResultPrice, { color: resolvedPalette.textSuccess }]} numberOfLines={1}>
            {Formatter.formatMoney(product.price)}
          </Text>
        </View>
        <View style={styles.searchResultAction}>{action}</View>
      </View>

  );
}
