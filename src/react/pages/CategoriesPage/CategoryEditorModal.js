import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal'
import CategoryForm from '@controleonline/ui-common/src/react/components/CategoryForm'
import AttachmentManager from '@controleonline/ui-products/src/react/components/AttachmentManager'

import { inlineStyle_692_8, styles } from '../Categories.styles'

const CategoryEditorModal = ({
  brandColors,
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
        <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
          <MaterialCommunityIcons name="close" size={18} color="#64748B" />
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
              <AttachmentManager
                entityType="category"
                entityId={category.id}
                attachments={category.categoryFiles || []}
                companyId={companyId}
                context="products-category"
                coverRelationId={category?.extraData?.imageCoverRelationId}
                onChanged={onAttachmentsChanged}
                onCoverChanged={onCoverChanged}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
          <Text style={styles.modalCancelButtonText}>
            {global.t?.t?.('categories', 'button', 'cancel')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }]}
          onPress={() => formRef.current?.submit()}
        >
          <Text style={styles.modalSaveButtonText}>
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
