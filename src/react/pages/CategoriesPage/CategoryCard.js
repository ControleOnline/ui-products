import React, { useMemo } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import MarketplaceSyncIndicators from '@controleonline/ui-products/src/react/components/MarketplaceSyncIndicators'

import { styles } from '../Categories.styles'
import { buildCoverUrl } from './categoryPageUtils'

const CategoryCard = ({
  brandColors,
  presentation = null,
  category,
  getCategoryStatuses,
  isCompactMobile,
  isManagerApp,
  isMobileCatalog,
  marketplaceSyncingKey,
  onEdit,
  onOpen,
  onSync,
}) => {
  const cardStyles = {...styles, ...(presentation?.styles || {})};
  const coverFile = useMemo(() => {
    const files = Array.isArray(category.categoryFiles) ? category.categoryFiles : [];
    return (files.find(item => String(item.id) === String(category?.extraData?.imageCoverRelationId) && item?.file?.id)
      || files.find(item => item?.file?.id))?.file || null;
  }, [category]);
  const FileComponent = presentation?.FileComponent;
  const coverUrl = useMemo(
    () => buildCoverUrl(category.categoryFiles, category?.extraData?.imageCoverRelationId),
    [category],
  )

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={category.name}
      style={cardStyles.cardTouchable}
      onPress={() => onOpen?.(category)}
      activeOpacity={0.88}
    >
      <View
        style={[
          cardStyles.cardImage,
          isCompactMobile && cardStyles.cardImageCompact,
          isMobileCatalog && cardStyles.cardImageMobile,
          { backgroundColor: presentation ? presentation.background : category.color || brandColors.primary },
          presentation && category.color ? {borderLeftWidth:4,borderLeftColor:category.color} : null,
        ]}
      >
        {FileComponent && coverFile ? (
          <FileComponent file={coverFile} style={cardStyles.cardCoverImage} resizeMode="cover" />
        ) : !FileComponent && coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={cardStyles.cardCoverImage}
            resizeMode="cover"
          />
        ) : null}

        <View
          style={[
            cardStyles.cardOverlay,
            isCompactMobile && cardStyles.cardOverlayCompact,
            isMobileCatalog && cardStyles.cardOverlayMobile,
          ]}
        >
          <Text
            style={[
              cardStyles.cardOverlayName,
              isCompactMobile && cardStyles.cardOverlayNameCompact,
              isMobileCatalog && cardStyles.cardOverlayNameMobile,
            ]}
            numberOfLines={2}
          >
            {category.name}
          </Text>
        </View>

        {isManagerApp && (!presentation || presentation.showManagement) ? (
          <View style={cardStyles.syncOverlay}>
            <MarketplaceSyncIndicators
              entityLabel={category.name}
              entityType="category"
              statuses={getCategoryStatuses(category)}
              onSync={onSync}
              syncingKey={marketplaceSyncingKey}
            />
          </View>
        ) : null}

        {isManagerApp && (!presentation || presentation.showManagement) ? (
          <TouchableOpacity
            onPress={() => onEdit?.(category)}
            style={cardStyles.editOverlay}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

export default CategoryCard
