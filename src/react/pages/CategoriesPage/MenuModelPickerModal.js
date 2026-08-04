import React from 'react'
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { styles } from '../Categories.styles'

const MenuModelPickerModal = ({
  brandColors,
  buttonPalette,
  isLoading,
  models,
  selectedModel,
  visible,
  onClose,
  onSelect,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles.pickerModalOverlay}>
      <View style={styles.pickerModalContent}>
        <View style={styles.pickerModalHeader}>
          <Text style={styles.pickerModalTitle}>
            {global.t?.t?.('categories', 'title', 'selectMenuModel')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.pickerModalClose,
              {
                backgroundColor: buttonPalette?.iconBackground,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={buttonPalette?.modalCloseIcon || buttonPalette?.iconColor}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.pickerModalBody}>
          {isLoading ? (
            <View style={styles.pickerState}>
              <ActivityIndicator size="small" color={brandColors.primary} />
              <Text style={styles.pickerStateText}>
                {global.t?.t?.('categories', 'label', 'loadingModels')}
              </Text>
            </View>
          ) : models.length > 0 ? (
            models.map(model => {
              const isSelected = model?.['@id'] === selectedModel

              return (
                <TouchableOpacity
                  key={model?.['@id'] || model?.id}
                  style={[
                    styles.modelOption,
                    {
                      backgroundColor: isSelected
                        ? buttonPalette?.buttonBackground
                        : buttonPalette?.buttonBackgroundSecondary,
                      borderColor: isSelected
                        ? buttonPalette?.buttonBorder
                        : buttonPalette?.buttonBorderSecondary,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onSelect?.(model?.['@id'] || '')}
                >
                  <View style={styles.modelOptionCopy}>
                    <Text
                      style={[
                        styles.modelOptionTitle,
                        {
                          color: isSelected
                            ? buttonPalette?.buttonText
                            : buttonPalette?.buttonTextSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {model?.model}
                    </Text>
                    <Text style={[styles.modelOptionSubtitle, { color: isSelected ? buttonPalette?.buttonText : buttonPalette?.buttonTextSecondary }] }>
                      {global.t?.t?.('categories', 'label', 'menuContext')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : 'radiobox-blank'}
                    size={22}
                    color={isSelected ? buttonPalette?.buttonIcon : buttonPalette?.buttonIconSecondary}
                  />
                </TouchableOpacity>
              )
            })
          ) : (
            <View style={styles.pickerState}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={36}
                color="#CBD5E1"
              />
              <Text style={styles.pickerStateText}>
                {global.t?.t?.('categories', 'label', 'noMenuModels')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
)

export default MenuModelPickerModal
