import {StyleSheet, Platform} from 'react-native'

export const categoryEditorStyles = StyleSheet.create({
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalBody: {
    padding: 24,
  },
  attachmentSection: {
    marginTop: 18,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
