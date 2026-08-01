import React, {memo, useMemo} from 'react';
import {Text, View, useWindowDimensions} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import DefaultFile from '@controleonline/ui-default/src/react/components/files/DefaultFile';
import ProductTotem from '@controleonline/ui-orders/src/react/components/cart/ProductTotem';
import {resolveProductCoverUrl} from '@controleonline/ui-products/src/react/domain/productMedia';
import styles from './SingleItemProductCard.styles';

const SingleItemProductCard = ({product, palette = {}, orderId = ''}) => {
  const {width} = useWindowDimensions();
  const coverUrl = resolveProductCoverUrl(product);
  const hasMedia = !!coverUrl;
  const isNarrow = width <= 340;
  const colors = useMemo(
    () => ({
      background: palette.cardBackground,
      border: palette.cardBorder,
      shadow: palette.cardShadow,
      text: palette.cardText,
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
            !hasMedia && isNarrow && styles.cardCompactNarrow,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {hasMedia && (
            <View
              style={[
                styles.media,
                isNarrow && styles.mediaNarrow,
                {backgroundColor: colors.background},
              ]}
            >
              <DefaultFile
                accessibilityLabel={`Imagem de ${productName}`}
                resizeMode="cover"
                source={coverUrl}
                style={styles.mediaImage}
              />
            </View>
          )}

          <View
            style={[
              styles.content,
              hasMedia ? styles.contentWithMedia : styles.compactContent,
            ]}
          >
            <View style={styles.identity}>
              <Text
                numberOfLines={2}
                style={[
                  styles.name,
                  hasMedia && !isNarrow && styles.nameWithMedia,
                  {color: colors.text},
                ]}
              >
                {productName}
              </Text>
              {!hasMedia && (
                <Text style={[styles.price, {color: colors.text}]}>
                  {Formatter.formatMoney(product?.price)}
                </Text>
              )}
            </View>

            <View style={hasMedia ? styles.actionRow : undefined}>
              {hasMedia && (
                <Text style={[styles.price, {color: colors.text}]}>
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
