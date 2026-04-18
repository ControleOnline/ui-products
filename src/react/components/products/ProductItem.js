import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';
import ProductTotem from '@controleonline/ui-orders/src/react/components/cart/ProductTotem';
import { APP_ENV } from '@controleonline/../../config/env.js';
import styles from './ProductItem.styles';

const TYPE_CONFIG = {
  product:     { label: 'Produto',       color: '#3B82F6', bg: '#EFF6FF' },
  service:     { label: 'Serviço',       color: '#8B5CF6', bg: '#F5F3FF' },
  component:   { label: 'Componente',    color: '#F97316', bg: '#FFF7ED' },
  feedstock:   { label: 'Matéria Prima', color: '#16A34A', bg: '#F0FDF4' },
  package:     { label: 'Embalagem',     color: '#0891B2', bg: '#ECFEFF' },
  custom:      { label: 'Custom',        color: '#DB2777', bg: '#FDF2F8' },
  manufactured:{ label: 'Fabricado',     color: '#D97706', bg: '#FFFBEB' },
};

const buildCoverUrl = (files, coverRelationId) => {
  const arr = files || []
  let first = null
  if (coverRelationId) {
    first = arr.find(item => String(item?.id) === String(coverRelationId) && item?.file?.id)
  }
  if (!first) first = arr.find(item => item?.file?.id)
  if (!first) return null
  return resolveFileImageUrl(first.file)
}

const ProductItem = ({ product, category }) => {
  const navigation = useNavigation();
  const coverUrl = buildCoverUrl(product.productFiles, product?.extraData?.imageCoverRelationId)
  const hasImage = !!coverUrl
  const isManager = APP_ENV.APP_TYPE === 'MANAGER'
  const typeConf = TYPE_CONFIG[product.type] || null

  const renderAction = () => {
    if (isManager) {
      return (
        <View style={styles.managerMeta}>
          {!!product.sku && (
            <Text style={styles.skuLabel} numberOfLines={1}>SKU {product.sku}</Text>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
        </View>
      );
    }
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
        <View>
          <Text style={styles.name} numberOfLines={2}>
            {product.product}
          </Text>
          {typeConf && (
            <View style={[styles.typeChip, { backgroundColor: typeConf.bg }]}>
              <Text style={[styles.typeChipText, { color: typeConf.color }]}>{typeConf.label}</Text>
            </View>
          )}
        </View>

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

export default memo(ProductItem);
