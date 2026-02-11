import React, { useEffect } from 'react'
import { View, ScrollView, Image } from 'react-native'
import css from '@controleonline/ui-orders/src/react/css/orders'
import { env } from '@env'

const ITEM_SIZE = 100

const Carousel = ({ images }) => {
  const { styles } = css()

  if (!images || images.length === 0) {
    return (
      <View style={{ width: ITEM_SIZE, height: ITEM_SIZE }} />
    )
  }

  return (
    <View style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {images.map((item, index) => {
          if (!item?.file?.id) {
            return null
          }

          const imageUrl = `${env.API_ENTRYPOINT}/files/${item.file.id}/download?app-domain=${env.DOMAIN}`

          return (
            <View
              key={item.id || index}
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                resizeMode="cover"
              />
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default Carousel
