import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal'
import CategoryForm from '@controleonline/ui-common/src/react/components/CategoryForm'
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload'

import { inlineStyle_692_8, styles } from '../Categories.styles'

const CategoryEditorModal = ({
  brandColors,
  buttonPalette,
  category,
  companyId,
  context,
  formRef,
  title,
  visible,
  onClose,
  onCoverChanged,
  onSaved,
  onAttachmentsChanged,
}) => (
  <AnimatedModal
    visible={visible}
    onRequestClose={onClose}
    style={inlineStyle_692_8}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.headerCloseButton,
            {
              backgroundColor: buttonPalette?.iconBackground,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={buttonPalette?.modalCloseIcon || buttonPalette?.iconColor}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.modalBody}>
          <CategoryForm
            context={context}
            ref={formRef}
            category={category}
            onClose={onClose}
            onSaved={onSaved}
          />

          {category?.id ? (
            <View style={styles.attachmentSection}>
              <DefaultUpload
                relationStoreName="category_file"
                relationField="category"
                relationResource="categories"
                entityId={category.id}
                attachments={category.categoryFiles || []}
                companyId={companyId}
                context="products-category"
                coverRelationId={category?.extraData?.imageCoverRelationId}
                onChanged={onAttachmentsChanged}
                onCoverChanged={onCoverChanged}
                title="Imagens"
                triggerLabel="Gerenciar imagens"
                managerTitle="Gerenciador de imagens"
                searchPlaceholder="Buscar imagem"
                uploadButtonLabel="Enviar nova"
                emptyAttachmentLabel="Nenhuma imagem anexada."
                emptyLibraryLabel="Nenhuma imagem encontrada."
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[
            styles.modalCancelButton,
            {
              backgroundColor: buttonPalette?.buttonBackgroundSecondary,
              borderColor: buttonPalette?.buttonBorderSecondary,
            },
          ]}
          onPress={onClose}
        >
          <Text style={[styles.modalCancelButtonText, { color: buttonPalette?.buttonTextSecondary }]}>
            {global.t?.t?.('categories', 'button', 'cancel')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modalSaveButton,
            {
              backgroundColor: buttonPalette?.buttonBackground || brandColors.primary,
              borderColor: buttonPalette?.buttonBorder,
              borderWidth: 1,
            },
          ]}
          onPress={() => formRef.current?.submit()}
        >
          <Text style={[styles.modalSaveButtonText, { color: buttonPalette?.buttonText }]}>
            {category
              ? global.t?.t?.('categories', 'button', 'save')
              : global.t?.t?.('categories', 'button', 'create')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </AnimatedModal>
)

export default CategoryEditorModal
