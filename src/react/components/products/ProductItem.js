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
import {app_type} from '@appType';
import styles from './ProductItem.styles';

export const PRODUCT_TYPE_CONFIG = {
  product: {
    label: 'Produto',
    backgroundToken: 'chipSelectedBackground',
    textToken: 'chipSelectedText',
  },
  service: {
    label: 'Serviço',
    backgroundToken: 'buttonBackgroundSecondary',
    textToken: 'buttonTextSecondary',
  },
  component: {
    label: 'Componente',
    backgroundToken: 'chipBackground',
    textToken: 'textWarning',
  },
  feedstock: {
    label: 'Matéria Prima',
    backgroundToken: 'chipBackground',
    textToken: 'textSuccess',
  },
  package: {
    label: 'Embalagem',
    backgroundToken: 'chipSelectedBackground',
    textToken: 'chipSelectedText',
  },
  custom: {
    label: 'Custom',
    backgroundToken: 'buttonBackgroundSecondary',
    textToken: 'buttonTextSecondary',
  },
  manufactured: {
    label: 'Fabricado',
    backgroundToken: 'chipBackground',
    textToken: 'textWarning',
  },
  recipe: {
    label: 'Preparo',
    backgroundToken: 'chipBackground',
    textToken: 'textMuted',
  },
};

export const getProductTypeLabel = type =>
  PRODUCT_TYPE_CONFIG[type]?.label || String(type || '').trim() || '';

export const resolveProductTypeTheme = (type, palette = {}) => {
  const typeConfig = PRODUCT_TYPE_CONFIG[type] || null;

  if (!typeConfig) {
    return null;
  }

  return {
    ...typeConfig,
    backgroundColor: palette[typeConfig.backgroundToken],
    textColor: palette[typeConfig.textToken],
  };
};

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
  const resolvedPalette = useMemo(
    () => ({
      buttonBackground: palette.buttonBackground,
      buttonBackgroundSecondary: palette.buttonBackgroundSecondary,
      buttonText: palette.buttonText,
      buttonTextSecondary: palette.buttonTextSecondary,
      cardBackground: palette.cardBackground,
      cardBorder: palette.cardBorder,
      cardText: palette.cardText,
      chipBackground: palette.chipBackground,
      chipBorder: palette.chipBorder,
      chipSelectedBackground: palette.chipSelectedBackground,
      chipSelectedText: palette.chipSelectedText,
      chipText: palette.chipText,
      iconDisabled: palette.iconDisabled,
      textMuted: palette.textMuted,
      textSecondary: palette.textSecondary,
      textSuccess: palette.textSuccess,
      textWarning: palette.textWarning,
    }),
    [palette],
  );
  const typeConf = useMemo(
    () => resolveProductTypeTheme(product.type, resolvedPalette),
    [product.type, resolvedPalette],
  );
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
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={resolvedPalette.iconDisabled}
          />
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
            { backgroundColor: resolvedPalette.buttonBackground },
          ]}
        >
          <Text style={[styles.customizeButtonText, { color: resolvedPalette.buttonText }]}>
            CUSTOMIZAR
          </Text>
        </TouchableOpacity>
      );
    }
    if (singleItemMode || app_type === 'TOTEM') {
      return (
        <ProductTotem
          product={product}
          category={category}
          palette={resolvedPalette}
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
            backgroundColor: resolvedPalette.chipBackground,
            borderColor: resolvedPalette.chipBorder,
          },
        ]}
      >
        <View
          style={[
            styles.categorySwatch,
            isPlaceholder && styles.categorySwatchPlaceholder,
            {
              backgroundColor: primaryCategory?.color || resolvedPalette.chipBackground,
              borderColor: resolvedPalette.chipBorder,
            },
          ]}
        />
        <Text
          style={[
            styles.categoryChipText,
            isPlaceholder && styles.placeholderText,
            { color: resolvedPalette.chipText },
          ]}
          numberOfLines={1}
        >
          {primaryCategory?.name || 'Sem categoria'}
        </Text>
        {extraCategoryCount > 0 && (
          <Text style={[styles.categoryCountText, { color: resolvedPalette.chipText }]}>
            +{extraCategoryCount}
          </Text>
        )}
      </View>
    );
  };

  if (isTableMode) {
    return (
      <View
        style={[
          styles.tableRow,
          {
            backgroundColor: resolvedPalette.cardBackground,
            borderColor: resolvedPalette.cardBorder,
          },
        ]}>
        <View style={styles.tableImageCell}>
          {hasImage && (
            <Image
              source={{ uri: coverUrl }}
              style={styles.tableImage}
              resizeMode="cover"
            />
          )}
          {!hasImage && (
            <View
              style={[
                styles.tableImage,
                styles.tableImageEmpty,
                {backgroundColor: resolvedPalette.chipBackground},
              ]}>
              <MaterialCommunityIcons
                name="image-outline"
                size={18}
                color={resolvedPalette.iconDisabled}
              />
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
            <View
              style={[
                styles.typeChip,
                styles.tableTypeChip,
                {backgroundColor: typeConf.backgroundColor},
              ]}>
              <Text style={[styles.typeChipText, {color: typeConf.textColor}]}>
                {typeConf.label}
              </Text>
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
    <View style={[styles.card, {backgroundColor: resolvedPalette.cardBackground}]}>
      {hasImage && (
        <View
          style={[
            styles.imageWrap,
            {
              backgroundColor: resolvedPalette.cardBackground,
              borderColor: resolvedPalette.cardBorder,
            },
          ]}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            resizeMode="contain"
          />
        </View>
      )}
      {!hasImage && (
        <View
          style={[
            styles.imageWrap,
            styles.imageWrapEmpty,
            {
              backgroundColor: resolvedPalette.cardBackground,
              borderColor: resolvedPalette.cardBorder,
            },
          ]}>
          <MaterialCommunityIcons
            name="image-outline"
            size={26}
            color={resolvedPalette.iconDisabled}
          />
        </View>
      )}

      <View style={[styles.body, !hasImage && styles.bodyNoImage]}>
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIdentity}>
              <ProductReferenceLink product={product} />
              <View style={styles.nameRow}>
                <Text style={[styles.name, {color: resolvedPalette.cardText}]} numberOfLines={2}>
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
                  <View
                    style={[
                      styles.typeChip,
                      styles.cardTypeChip,
                      {backgroundColor: typeConf.backgroundColor},
                    ]}>
                    <Text style={[styles.typeChipText, {color: typeConf.textColor}]}>
                      {typeConf.label}
                    </Text>
                  </View>
                )}
              </View>
          </View>
          {isSupplyCatalog && !!unitLabel && (
            <View style={styles.metaChipsRow}>
              <View style={[styles.unitChip, {backgroundColor: resolvedPalette.chipBackground}]}>
                <MaterialCommunityIcons
                  name="scale"
                  size={10}
                  color={resolvedPalette.textMuted}
                />
                <Text style={[styles.unitChipText, {color: resolvedPalette.textMuted}]}>
                  {String(unitLabel).toUpperCase()}
                </Text>
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
              <Text style={[styles.priceLabel, {color: resolvedPalette.textMuted}]}>
                {priceLabel}
              </Text>
            )}
            {product.quantity > 0 && (
              <Text style={[styles.priceTotal, {color: resolvedPalette.textMuted}]}>
                {Formatter.formatMoney(product.quantity * product.price)}
              </Text>
            )}
            <Text
              style={[
                styles.price,
                {color: resolvedPalette.textSuccess},
                isSupplyCatalog && [styles.supplyPrice, {color: resolvedPalette.textSecondary}],
              ]}>
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
