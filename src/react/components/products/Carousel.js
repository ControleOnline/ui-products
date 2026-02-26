import React from 'react'
import { View, ScrollView, Image } from 'react-native'
import { env } from '@env'

const Carousel = ({ images = [], style = {} }) => {
  // Se não tiver imagens válidas, retorna um placeholder vazio ou com cor de fundo
  const hasValidImages = images.some(item => item?.file?.id)

  if (!hasValidImages) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#f5f5f5' }, style]}>
        {/* Opcional: texto de fallback */}
        {/* <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Sem imagem</Text> */}
      </View>
    )
  }

  return (
    <View style={[{ flex: 1, width: '100%' }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={images.length > 1} // snap em cada imagem se tiver várias
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'stretch', // força as views filhas a ocuparem a altura
        }}
      >
        {images.map((item, index) => {
          if (!item?.file?.id) return null

          const imageUrl = `${env.API_ENTRYPOINT}/files/${item.file.id}/download?app-domain=${env.DOMAIN || location?.host}`

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
              // Para debug: descomente se quiser ver erros
              // onError={(e) => console.log('Erro ao carregar imagem:', imageUrl, e.nativeEvent.error)}
              />
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default Carousel