import React, { useCallback, useState } from 'react'
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native'
import { useStore } from '@store'
import { SafeAreaView } from 'react-native-safe-area-context'
import css from '@controleonline/ui-orders/src/react/css/orders'
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel'
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { env } from '@env'
import CategoryForm from '@controleonline/ui-common/src/react/components/CategoryForm'

const CategoriesPage = () => {
  const navigation = useNavigation()
  const { width } = useWindowDimensions()

  const categoriesStore = useStore('categories')
  const { items } = categoriesStore.getters
  const categoryActions = categoriesStore.actions

  const peopleStore = useStore('people')
  const { currentCompany, isLoading } = peopleStore.getters

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)

  useFocusEffect(
    useCallback(() => {
      const cached = JSON.parse(localStorage.getItem('categories') || '[]')
      if (cached.length > 0) {
        categoryActions.setItems(cached)
      } else if (currentCompany?.id) {
        categoryActions
          .getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
          })
          .then(data => {
            localStorage.setItem('categories', JSON.stringify(data))
          })
      }
    }, [currentCompany?.id, categoryActions])
  )

  const changeCategory = category => {
    navigation.navigate('ProductsPage', { category })
  }

  const openCreateModal = () => {
    setSelectedCategory(null)
    setModalVisible(true)
  }

  const openEditModal = category => {
    setSelectedCategory(category)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedCategory(null)
  }

  const getColumns = () => {
    if (width < 640) return 2
    if (width < 960) return 3
    if (width < 1280) return 4
    return 5
  }

  const columns = getColumns()
  const maxContentWidth = 1600
  const containerWidth = Math.min(width, maxContentWidth)
  const gap = 16
  const cardWidth = (containerWidth - (columns + 1) * gap) / columns

  const { styles } = css()

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <StateStore store="categories" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ width: containerWidth, paddingHorizontal: gap / 2, paddingVertical: 20 }}>
          {env.APP_TYPE === 'MANAGER' && (
            <TouchableOpacity
              style={{
                marginBottom: 20,
                paddingVertical: 16,
                backgroundColor: '#000',
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={openCreateModal}
            >
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: width > 900 ? 20 : 17,
                }}
              >
                + Adicionar Categoria
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: gap,
              justifyContent: 'flex-start',
            }}
          >
            {items.map(category => (
              <View key={category.id} style={{ width: cardWidth, alignItems: 'center' }}>
                <TouchableOpacity
                  style={{ width: '100%' }}
                  onPress={() => changeCategory(category)}
                  activeOpacity={0.88}
                >
                  <View
                    style={{
                      width: '100%',
                      aspectRatio: 1,
                      borderRadius: 16,
                      overflow: 'hidden',
                      backgroundColor: category.color || '#e8e8e8',
                    }}
                  >
                    <Carousel images={category.categoryFiles || []} style={{ flex: 1 }} />
                  </View>

                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: width > 1100 ? 18 : width > 700 ? 16 : 15,
                      fontWeight: '600',
                      textAlign: 'center',
                      color: '#111',
                    }}
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>

                {env.APP_TYPE === 'MANAGER' && (
                  <TouchableOpacity
                    onPress={() => openEditModal(category)}
                    style={{ marginTop: 6, alignSelf: 'center' }}
                  >
                    <Text style={{ color: '#d32f2f', fontSize: 14, fontWeight: '500' }}>
                      Editar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: width > 900 ? 600 : '100%',
              maxWidth: 700,
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 25,
            }}
          >
            <CategoryForm
              category={selectedCategory}
              onClose={closeModal}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

export default CategoriesPage