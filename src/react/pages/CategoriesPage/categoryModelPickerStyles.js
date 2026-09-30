import {StyleSheet} from 'react-native'

export const categoryModelPickerStyles = StyleSheet.create({
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: 240,
    paddingBottom: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    paddingRight: 12,
  },
  pickerModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  pickerStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modelOptionSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  modelOptionCopy: {
    flex: 1,
  },
  modelOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modelOptionTitleSelected: {
    color: '#5B21B6',
  },
  modelOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },

})
