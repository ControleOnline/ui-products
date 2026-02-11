import React, { useEffect } from 'react'
import { View, FlatList, Image } from 'react-native'
import css from '@controleonline/ui-orders/src/react/css/orders'
import { env } from '@env'

const Carousel = ({ images }) => {
  const { styles } = css()

  useEffect(() => {
  }, [images])

  const renderItem = ({ item, index }) => {

    const imageUrl = `${env.API_ENTRYPOINT}/files/${item?.file?.id}/download?app-domain=${env.DOMAIN}`

    return (
      <View style={[styles.slide, { width: 100, height: 100 }]}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 100, height: 100 }}
          resizeMode="cover"
        />
      </View>
    )
  }

  return (
    <View style={{ width: '100%' }}>
      <FlatList
        data={images || []}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          return item?.id?.toString() || index.toString()
        }}
        horizontal
        showsHorizontalScrollIndicator
      />
    </View>
  )
}

export default Carousel
