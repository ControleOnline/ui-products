import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { env } from '@env';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';
import ProductTotem from '@controleonline/ui-orders/src/react/components/cart/ProductTotem';
import { APP_ENV } from '@controleonline/../../config/env.js';

const buildCoverUrl = files => {
  const first = (files || []).find(item => item?.file?.id)
  if (!first) return null
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '')
  return `${env.API_ENTRYPOINT}/files/${first.file.id}/download?app-domain=${encodeURIComponent(host)}`
}

const ProductItem = ({ product, category }) => {
  const navigation = useNavigation();
  const coverUrl = buildCoverUrl(product.productFiles)
  const hasImage = !!coverUrl

  const renderAction = () => {
    if (product.type === 'custom') {
      return (
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomizeScreen', { product })}
          style={styles.customizeButton}
        >
          <Text style={styles.customizeButtonText}>CUSTOMIZAR</Text>
        </TouchableOpacity>
      );
    }
    if (APP_ENV.APP_TYPE === 'TOTEM') {
      return <ProductTotem product={product} category={category} />;
    }
    return <ProductQuantity product={product} category={category} />;
  };

  return (
    <View style={styles.card}>
      {hasImage && (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>
      )}
      {!hasImage && (
        <View style={[styles.imageWrap, styles.imageWrapEmpty]}>
          <MaterialCommunityIcons name="image-outline" size={28} color="#CBD5E1" />
        </View>
      )}

      <View style={[styles.body, !hasImage && styles.bodyNoImage]}>
        <Text style={styles.name} numberOfLines={2}>
          {product.product}
        </Text>

        {!!product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.priceRow}>
          <View>
            {product.quantity > 0 && (
              <Text style={styles.priceTotal}>
                {Formatter.formatMoney(product.quantity * product.price)}
              </Text>
            )}
            <Text style={styles.price}>
              {product.quantity > 0 ? `${product.quantity} × ` : ''}
              {Formatter.formatMoney(product.price)}
            </Text>
          </View>

          <View style={styles.actionWrap}>
            {renderAction()}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },

  imageWrap: {
    width: 100,
    height: 100,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
    overflow: 'hidden',
  },
  imageWrapEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },

  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  bodyNoImage: {
    paddingHorizontal: 16,
  },

  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
  priceTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 1,
  },

  actionWrap: {
    alignItems: 'flex-end',
  },

  customizeButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customizeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default memo(ProductItem);
