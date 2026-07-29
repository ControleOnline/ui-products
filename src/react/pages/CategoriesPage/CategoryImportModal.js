import React from 'react'
import { Modal } from 'react-native'
import ImportsPage from '@controleonline/ui-common/src/react/pages/Imports'

const CategoryImportModal = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent={false}>
    <ImportsPage
      context={{
        context: 'product',
        title: global.t?.t?.('categories', 'title', 'productImport'),
        searchPlaceholder: global.t?.t?.('categories', 'input', 'importSearch'),
      }}
      onClose={onClose}
    />
  </Modal>
)

export default CategoryImportModal
