import React, {useMemo, useState} from 'react'
import { View, ScrollView, Image } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { env } from '@env'

const Carousel = ({ images = [], style = {} }) => {
  const validImages = useMemo(
    () => (images || []).filter(item => item?.file?.id),
    [images],
  )
  const [failedImageIds, setFailedImageIds] = useState({})

  const renderPlaceholder = (icon = 'image-outline') => (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: '#F1F5F9',
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}>
      <MaterialCommunityIcons name={icon} size={36} color="#CBD5E1" />
    </View>
  )

  if (validImages.length === 0) return renderPlaceholder('image-outline')

  const visibleImages = validImages.filter(item => {
    const imageId = String(item?.id || item?.file?.id || '')
    return !failedImageIds[imageId]
  })

  if (visibleImages.length === 0) return renderPlaceholder('image-off-outline')

  return (
    <View style={[{ flex: 1, width: '100%' }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={visibleImages.length > 1} // snap em cada imagem se tiver várias
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'stretch', // força as views filhas a ocuparem a altura
        }}
      >
        {visibleImages.map((item, index) => {
          if (!item?.file?.id) return null

          const imageUrl = `${env.API_ENTRYPOINT}/files/${item.file.id}/download?app-domain=${env.DOMAIN || location?.host}`
          const imageId = String(item?.id || item?.file?.id || index)

          return (
            <View
              key={item.id || index}
              style={{
                flex: 1,              // ← crucial: faz cada slide ocupar 100% da área
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
                onError={e => {
                  if (typeof __DEV__ !== 'undefined' && __DEV__) {
                    console.warn('[Carousel] Erro ao carregar imagem', { fileId: item?.file?.id })
                  }
                  setFailedImageIds(prev => ({...prev, [imageId]: true}))
                }}
              />
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default Carousel
