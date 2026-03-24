import React, { useMemo, useState } from 'react'
import { View, ScrollView, Image } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { env } from '@env'

const buildUrl = fileId => {
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '')
  return `${env.API_ENTRYPOINT}/files/${fileId}/download?app-domain=${encodeURIComponent(host)}`
}

/*
 * Carousel — exibe uma ou mais imagens com paginação horizontal.
 * Usado na tela de detalhe do produto (full-size).
 * Para thumbnails em listas/grids, use CoverImage.
 */
const Carousel = ({ images = [], style = {} }) => {
  const validImages = useMemo(
    () => (images || []).filter(item => item?.file?.id),
    [images],
  )
  const [failedIds, setFailedIds] = useState({})
  const [containerWidth, setContainerWidth] = useState(0)

  const renderPlaceholder = (icon = 'image-outline') => (
    <View
      style={[
        { flex: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={36} color="#CBD5E1" />
    </View>
  )

  if (validImages.length === 0) return renderPlaceholder('image-outline')

  const visible = validImages.filter(item => {
    const id = String(item?.id || item?.file?.id || '')
    return !failedIds[id]
  })

  if (visible.length === 0) return renderPlaceholder('image-off-outline')

  return (
    <View
      style={[{ flex: 1, width: '100%' }, style]}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <ScrollView
          horizontal
          pagingEnabled={visible.length > 1}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={visible.length > 1}
          contentContainerStyle={{ alignItems: 'stretch' }}
        >
          {visible.map((item, index) => {
            const imageId = String(item?.id || item?.file?.id || index)
            const imageUrl = buildUrl(item.file.id)
            return (
              <View
                key={imageId}
                style={{ width: containerWidth, height: '100%' }}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  onError={() => {
                    setFailedIds(prev => ({ ...prev, [imageId]: true }))
                  }}
                />
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

export default Carousel
