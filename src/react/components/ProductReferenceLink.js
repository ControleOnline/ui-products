import React, { useMemo } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products';

const inferContextFromProduct = product => {
  const type = String(product?.type || '').trim().toLowerCase();
  return ['feedstock', 'component', 'package'].includes(type)
    ? 'supplies'
    : 'products';
};

const ProductReferenceLink = ({
  product,
  productId,
  context,
  color = '#2563EB',
  textStyle,
  style,
}) => {
  const navigation = useNavigation();
  const resolvedProductId = normalizeEntityId(productId || product);
  const resolvedContext = useMemo(
    () => normalizeCatalogContext(context || inferContextFromProduct(product)),
    [context, product],
  );

  if (!resolvedProductId) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('ProductDetailsModal', {
          ProductId: resolvedProductId,
          context: resolvedContext,
        })
      }
      activeOpacity={0.75}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        style,
      ]}>
      <MaterialCommunityIcons name="identifier" size={12} color={color} />
      <Text
        style={[
          {
            fontSize: 11,
            fontWeight: '700',
            color,
          },
          textStyle,
        ]}>
        #{resolvedProductId}
      </Text>
    </TouchableOpacity>
  );
};

export default ProductReferenceLink;
