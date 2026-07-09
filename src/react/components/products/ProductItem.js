import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import ProductQuantity from '@controleonline/ui-orders/src/react/components/cart/ProductQuantity';
import ProductTotem from '@controleonline/ui-orders/src/react/components/cart/ProductTotem';
import MarketplaceSyncIndicators from '@controleonline/ui-products/src/react/components/MarketplaceSyncIndicators';
import ProductReferenceLink from '@controleonline/ui-products/src/react/components/ProductReferenceLink';
import { resolveProductCoverUrl } from '@controleonline/ui-products/src/react/domain/productMedia';
import { APP_ENV } from '@controleonline/../../config/env.js';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ProductItem.styles';

export const PRODUCT_TYPE_CONFIG = {
  product:     { label: 'Produto',       color: '#3B82F6', bg: '#EFF6FF' },
  service:     { label: 'Serviço',       color: '#8B5CF6', bg: '#F5F3FF' },
  component:   { label: 'Componente',    color: '#F97316', bg: '#FFF7ED' },
  feedstock:   { label: 'Matéria Prima', color: '#16A34A', bg: '#F0FDF4' },
  package:     { label: 'Embalagem',     color: '#0891B2', bg: '#ECFEFF' },
  custom:      { label: 'Custom',        color: '#DB2777', bg: '#FDF2F8' },
  manufactured:{ label: 'Fabricado',     color: '#D97706', bg: '#FFFBEB' },
  recipe:      { label: 'Preparo',       color: '#6B7280', bg: '#F3F4F6' },
};

export const getProductTypeLabel = type =>
  PRODUCT_TYPE_CONFIG[type]?.label || String(type || '').trim() || '';

const collectionFrom = value => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeCategory = value => {
  const category = value?.category || value;
  const categoryId = category?.id || category?.['@id'];
  const categoryName = category?.name || category?.category;

  if (!categoryId || !categoryName) {
    return null;
  }

  return {
    id: String(categoryId),
    name: categoryName,
    color: category?.color || '',
  };
};

const ProductItem = ({
  product,
  category,
  productCategories = [],
  catalogContext = 'products',
  displayMode = 'card',
  interactionMode = 'auto',
  palette = {},
  singleItemMode = false,
  orderId = '',
  marketplaceStatuses = [],
  onMarketplaceSync,
  marketplaceSyncingKey = '',
}) => {
  const navigation = useNavigation();
  const coverUrl = resolveProductCoverUrl(product);
  const hasImage = !!coverUrl
  const isManager =
    app_type === 'MANAGER' && interactionMode !== 'pdv'
  const typeConf = PRODUCT_TYPE_CONFIG[product.type] || null
  const queueLabel = product?.queue?.queue || product?.queue?.name || ''
  const isSupplyCatalog = catalogContext === 'supplies'
  const isTableMode = displayMode === 'table'
  const unitLabel =
    product?.productUnit?.productUnit ||
    product?.productUnit?.unit ||
    product?.productUnity?.productUnit ||
    product?.unit ||
    ''
  const priceLabel = isSupplyCatalog
    ? product.type === 'component'
      ? 'Preço opção'
      : 'Preço cad.'
    : ''
  const resolvedPalette = {
    background: palette.background || colors.background,
    border: palette.border || colors.border,
    primary: palette.primary || colors.primary,
    textSecondary: palette.textSecondary || colors.textSecondary,
  };
  const resolvedCategories = useMemo(() => {
    const source = productCategories.length > 0
      ? productCategories
      : collectionFrom(product?.productCategory);
    const categoriesById = {};

    source.forEach(item => {
      const normalizedCategory = normalizeCategory(item);
      if (normalizedCategory) {
        categoriesById[normalizedCategory.id] = normalizedCategory;
      }
    });

    return Object.values(categoriesById);
  }, [product?.productCategory, productCategories]);
  const primaryCategory = resolvedCategories[0] || null;
  const extraCategoryCount = Math.max(0, resolvedCategories.length - 1);

  const renderAction = () => {
    if (isManager) {
      if (isTableMode) {
        return <MaterialCommunityIcons name="chevron-right" size={20} color={resolvedPalette.textSecondary} />;
      }

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
          onPress={() =>
            navigation.navigate('CustomizeScreen', {
              productId: product?.id || product?.['@id'],
              interactionMode,
              // O custom do fluxo single-item precisa manter a mesma saida do PDV.
              singleItemMode: singleItemMode === true,
            })
          }
          style={[
            styles.customizeButton,
            isTableMode && styles.tableCustomizeButton,
            isTableMode && { backgroundColor: resolvedPalette.primary },
          ]}
        >
          <Text style={styles.customizeButtonText}>CUSTOMIZAR</Text>
        </TouchableOpacity>
      );
    }
    if (singleItemMode || app_type === 'TOTEM') {
      return (
        <ProductTotem
          product={product}
          category={category}
          singleItemMode={singleItemMode || app_type === 'TOTEM'}
          orderId={orderId}
        />
      );
    }
    return <ProductQuantity product={product} category={category} />;
  };

  const renderCategoryChip = ({ showPlaceholder = false } = {}) => {
    if (!primaryCategory && !showPlaceholder) {
      return null;
    }

    const isPlaceholder = !primaryCategory;

    return (
      <View
        style={[
          styles.categoryChip,
          isTableMode && styles.tableCategoryChip,
          isPlaceholder && styles.categoryChipPlaceholder,
          {
            backgroundColor: resolvedPalette.background,
            borderColor: resolvedPalette.border,
          },
        ]}
      >
        <View
          style={[
            styles.categorySwatch,
            isPlaceholder && styles.categorySwatchPlaceholder,
            {
              backgroundColor: primaryCategory?.color || resolvedPalette.background,
              borderColor: resolvedPalette.border,
            },
          ]}
        />
        <Text
          style={[
            styles.categoryChipText,
            isPlaceholder && styles.placeholderText,
            { color: resolvedPalette.textSecondary },
          ]}
          numberOfLines={1}
        >
          {primaryCategory?.name || 'Sem categoria'}
        </Text>
        {extraCategoryCount > 0 && (
          <Text style={[styles.categoryCountText, { color: resolvedPalette.textSecondary }]}>
            +{extraCategoryCount}
          </Text>
        )}
      </View>
    );
  };

  if (isTableMode) {
    return (
      <View style={[styles.tableRow, { borderColor: resolvedPalette.border }]}>
        <View style={styles.tableImageCell}>
          {hasImage && (
            <Image
              source={{ uri: coverUrl }}
              style={styles.tableImage}
              resizeMode="cover"
            />
          )}
          {!hasImage && (
            <View style={[styles.tableImage, styles.tableImageEmpty]}>
              <MaterialCommunityIcons name="image-outline" size={18} color={resolvedPalette.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.tableIdCell}>
          <ProductReferenceLink product={product} />
          {!!product.sku && (
            <Text style={styles.tableSkuText} numberOfLines={1}>{product.sku}</Text>
          )}
        </View>
        <View style={styles.tableProductCell}>
          <View style={styles.tableNameRow}>
            <Text style={styles.tableName} numberOfLines={2}>{product.product}</Text>
          </View>
          {!!product.description && (
            <Text style={styles.tableDescription} numberOfLines={1}>{product.description}</Text>
          )}
        </View>
        <View style={styles.tableSyncCell}>
          <MarketplaceSyncIndicators
            entityLabel={product.product}
            entityType="product"
            statuses={marketplaceStatuses}
            onSync={onMarketplaceSync}
            syncingKey={marketplaceSyncingKey}
          />
        </View>
        <View style={styles.tableCategoryCell}>
          {renderCategoryChip() || (
            <Text style={styles.tableMutedText} numberOfLines={1}>-</Text>
          )}
        </View>
        <View style={styles.tableTypeCell}>
          {typeConf ? (
            <View style={[styles.typeChip, styles.tableTypeChip, { backgroundColor: typeConf.bg }]}>
              <Text style={[styles.typeChipText, { color: typeConf.color }]}>{typeConf.label}</Text>
            </View>
          ) : (
            <Text style={styles.tableMutedText} numberOfLines={1}>-</Text>
          )}
        </View>
        <View style={styles.tableQueueCell}>
          <Text style={styles.tableMutedText} numberOfLines={1}>{queueLabel || '-'}</Text>
        </View>
        <View style={styles.tablePriceCell}>
          <Text style={[styles.price, isSupplyCatalog && styles.supplyPrice]} numberOfLines={1}>
            {Formatter.formatMoney(product.price)}
          </Text>
        </View>
        <View style={styles.tableActionCell}>
          {renderAction()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {hasImage && (
        <View style={[styles.imageWrap, { borderColor: resolvedPalette.border }]}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="contain"
          />
        </View>
      )}
      {!hasImage && (
        <View style={[styles.imageWrap, styles.imageWrapEmpty, { borderColor: resolvedPalette.border }]}>
          <MaterialCommunityIcons name="image-outline" size={26} color={resolvedPalette.textSecondary} />
        </View>
      )}

      <View style={[styles.body, !hasImage && styles.bodyNoImage]}>
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIdentity}>
              <ProductReferenceLink product={product} />
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={2}>
                  {product.product}
                </Text>
              </View>
              <Text
                style={[
                  styles.description,
                  !product.description && styles.descriptionPlaceholder,
                ]}
                numberOfLines={1}
              >
                {product.description || ' '}
              </Text>
            </View>
            <MarketplaceSyncIndicators
              entityLabel={product.product}
              entityType="product"
              size="comfortable"
              statuses={marketplaceStatuses}
              onSync={onMarketplaceSync}
              syncingKey={marketplaceSyncingKey}
            />
          </View>
          <View style={styles.metaGridRow}>
            <View style={styles.metaGridCell}>
              {renderCategoryChip({ showPlaceholder: true })}
            </View>
            <View style={styles.metaGridCell}>
              {typeConf && (
                <View style={[styles.typeChip, styles.cardTypeChip, { backgroundColor: typeConf.bg }]}>
                  <Text style={[styles.typeChipText, { color: typeConf.color }]}>{typeConf.label}</Text>
                </View>
              )}
            </View>
          </View>
          {isSupplyCatalog && !!unitLabel && (
            <View style={styles.metaChipsRow}>
              <View style={styles.unitChip}>
                <MaterialCommunityIcons name="scale" size={10} color="#64748B" />
                <Text style={styles.unitChipText}>{String(unitLabel).toUpperCase()}</Text>
              </View>
            </View>
          )}
          <View style={styles.queueLine}>
            <MaterialCommunityIcons
              name="tray-full"
              size={12}
              color={resolvedPalette.textSecondary}
            />
            <Text
              style={[
                styles.queueText,
                !queueLabel && styles.placeholderText,
                { color: resolvedPalette.textSecondary },
              ]}
              numberOfLines={1}
            >
              {queueLabel ? (
                <>
                  Fila:{' '}
                  <Text style={styles.queueValueText}>{queueLabel}</Text>
                </>
              ) : 'Sem fila'}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <View>
            {!!priceLabel && (
              <Text style={styles.priceLabel}>{priceLabel}</Text>
            )}
            {product.quantity > 0 && (
              <Text style={styles.priceTotal}>
                {Formatter.formatMoney(product.quantity * product.price)}
              </Text>
            )}
            <Text style={[styles.price, isSupplyCatalog && styles.supplyPrice]}>
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
