import React, { useMemo } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import MarketplaceSyncIndicators from '@controleonline/ui-products/src/react/components/MarketplaceSyncIndicators'

import { styles } from '../Categories.styles'
import { buildCoverUrl } from './categoryPageUtils'

const CategoryCard = ({
  brandColors,
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
  const coverUrl = useMemo(
    () => buildCoverUrl(category.categoryFiles, category?.extraData?.imageCoverRelationId),
    [category],
  )

  return (
    <TouchableOpacity
      style={styles.cardTouchable}
      onPress={() => onOpen?.(category)}
      activeOpacity={0.88}
    >
      <View
        style={[
          styles.cardImage,
          isCompactMobile && styles.cardImageCompact,
          isMobileCatalog && styles.cardImageMobile,
          { backgroundColor: category.color || brandColors.primary },
        ]}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.cardCoverImage}
            resizeMode="cover"
          />
        ) : null}

        <View
          style={[
            styles.cardOverlay,
            isCompactMobile && styles.cardOverlayCompact,
            isMobileCatalog && styles.cardOverlayMobile,
          ]}
        >
          <Text
            style={[
              styles.cardOverlayName,
              isCompactMobile && styles.cardOverlayNameCompact,
              isMobileCatalog && styles.cardOverlayNameMobile,
            ]}
            numberOfLines={2}
          >
            {category.name}
          </Text>
        </View>

        {isManagerApp ? (
          <View style={styles.syncOverlay}>
            <MarketplaceSyncIndicators
              entityLabel={category.name}
              entityType="category"
              statuses={getCategoryStatuses(category)}
              onSync={onSync}
              syncingKey={marketplaceSyncingKey}
            />
          </View>
        ) : null}

        {isManagerApp ? (
          <TouchableOpacity
            onPress={() => onEdit?.(category)}
            style={styles.editOverlay}
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
