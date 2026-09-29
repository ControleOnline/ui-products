import React from 'react'
import { ScrollView, Text, TouchableOpacity } from 'react-native'

import { styles } from '../Categories.styles'
import { normalizeEntityId } from './categoryPageUtils'

const PdvCategoryTabs = ({
  categories = [],
  onSelectCategory,
  palette = {},
  selectedCategoryId = '',
}) => (
  <ScrollView
    contentContainerStyle={styles.pdvCategoryTabsContent}
    horizontal
    showsHorizontalScrollIndicator={false}
    testID="pdv-category-tabs"
  >
    {(Array.isArray(categories) ? categories : []).map(category => {
      const categoryId = normalizeEntityId(category)
      const isSelected = categoryId === String(selectedCategoryId || '')

      return (
        <TouchableOpacity
          accessibilityLabel={`Categoria ${category.name}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: isSelected }}
          key={categoryId || category.name}
          onPress={() => onSelectCategory?.(category)}
          style={[
            styles.pdvCategoryTab,
            isSelected && {
              backgroundColor: palette.primary || '#2563EB',
              borderColor: palette.primary || '#2563EB',
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.pdvCategoryTabText,
              isSelected && styles.pdvCategoryTabTextSelected,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      )
    })}
  </ScrollView>
)

export default PdvCategoryTabs
