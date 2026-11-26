import React, {memo, useMemo} from 'react';
import {Text, View, useWindowDimensions} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import DefaultFile from '@controleonline/ui-default/src/react/components/files/DefaultFile';
import ProductTotem from '@controleonline/ui-orders/src/react/components/cart/ProductTotem';
import {resolveProductCoverUrl} from '@controleonline/ui-products/src/react/domain/productMedia';
import styles from './SingleItemProductCard.styles';
import {useStore} from '@store';
import {app_type} from '@appType';
import {isPosSingleItemMode} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

const SingleItemProductCard = ({product, palette = {}, orderId = ''}) => {
  const {width} = useWindowDimensions();
  const coverUrl = resolveProductCoverUrl(product);
  const hasMedia = !!coverUrl;
  const {item:device} = useStore('device_config').getters;
  const compact = app_type === 'POS' && isPosSingleItemMode(device?.configs);
  const isNarrow = compact || width <= 340;
  const colors = useMemo(
    () => ({
      background: palette.cardBackground,
      border: palette.cardBorder,
      shadow: palette.cardShadow,
      text: palette.cardText,
      price: palette.singleItemPriceText || palette.textSuccess || palette.cardText,
      radioBorder: palette.radioBorder,
      radioSelectedBorder: palette.radioSelectedBorder,
      radioSelectedDot: palette.radioSelectedDot,
    }),
    [palette],
  );
  const productName = String(product?.product || '').trim();

  return (
    <ProductTotem
      accessibilityLabel={productName}
      orderId={orderId}
      palette={palette}
      product={product}
      singleItemMode
      containerStyle={styles.touchable}
    >
      {({isSelected}) => (
        <View
          style={[
            styles.card,
            hasMedia ? styles.cardWithMedia : styles.cardCompact,
            hasMedia && isNarrow && styles.cardWithMediaNarrow,
            compact && {minHeight:78,borderRadius:12},
            !hasMedia && isNarrow && styles.cardCompactNarrow,
            {
              backgroundColor: colors.background,
              borderColor: compact && isSelected ? colors.radioSelectedBorder : colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {hasMedia && (
            <View
              style={[
                styles.media,
                isNarrow && styles.mediaNarrow,
                compact && {width:64,minHeight:78},
                {backgroundColor: colors.background},
              ]}
            >
              <DefaultFile
                accessibilityLabel={`Imagem de ${productName}`}
                resizeMode={compact ? "contain" : "cover"}
                source={coverUrl}
                style={styles.mediaImage}
              />
            </View>
          )}

          <View
            style={[
              styles.content,
              hasMedia ? styles.contentWithMedia : styles.compactContent,
              compact && {flexDirection:"row",alignItems:"center",gap:12,padding:12},
            ]}
          >
            <View style={styles.identity}>
              <Text
                numberOfLines={2}
                style={[
                  styles.name,
                  hasMedia && !isNarrow && styles.nameWithMedia,
                  compact && {fontSize:14,fontWeight:"600",lineHeight:19},
                  {color: colors.text},
                ]}
              >
                {productName}
              </Text>
              {(!hasMedia || compact) && (
                <Text style={[styles.price, {color: compact ? colors.price : colors.text}]}>
                  {Formatter.formatMoney(product?.price)}
                </Text>
              )}
            </View>

            <View style={hasMedia && !compact ? styles.actionRow : undefined}>
              {hasMedia && !compact && (
                <Text style={[styles.price, {color: compact ? colors.price : colors.text}]}>
                  {Formatter.formatMoney(product?.price)}
                </Text>
              )}
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected
                      ? colors.radioSelectedBorder
                      : colors.radioBorder,
                  },
                ]}
              >
                {isSelected && (
                  <View
                    style={[
                      styles.radioMark,
                      {backgroundColor: colors.radioSelectedDot},
                    ]}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </ProductTotem>
  );
};

export default memo(SingleItemProductCard);
