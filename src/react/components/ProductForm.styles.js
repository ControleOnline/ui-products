import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 100 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  sectionCardError: { borderWidth: 1.5, borderColor: '#FCA5A5' },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sectionCardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  sectionCardTitle: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionCardTitleError: { color: '#EF4444' },

  saveBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, borderRadius: 14 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldHelperText: { fontSize: 12, lineHeight: 18, color: '#64748B', marginTop: -4, marginBottom: 12 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A' },
  textInputMultiline: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#0F172A', minHeight: 88, textAlignVertical: 'top' },

  selectButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1 },
  selectPlaceholder: { fontSize: 15, color: '#CBD5E1', flex: 1 },
  multiSelectButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  multiSelectSummary: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  categoryChip: { maxWidth: 180, backgroundColor: '#E2E8F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  categoryChipOverflow: { backgroundColor: '#CBD5E1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  categoryChipText: { color: '#334155', fontSize: 12, fontWeight: '700' },

  pickerModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '80%' },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pickerModalClose: { padding: 4 },
  pickerModalList: { maxHeight: 360 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  pickerOptionActive: { backgroundColor: '#F0FDF4' },
  pickerOptionText: { fontSize: 15, color: '#334155' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  switchRowLast: { borderBottomWidth: 0, marginBottom: 8 },
  switchLabel: { fontSize: 15, color: '#334155', fontWeight: '500', flex: 1 },

  displayField: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 13 },
  displayFieldText: { fontSize: 15, color: '#64748B' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  statusBannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusBannerError: { backgroundColor: '#FFF3F3', borderColor: '#FECACA' },
  statusBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoBoxText: { color: '#94A3B8', fontSize: 14, flex: 1 },
});

export default styles;

export const inlineStyle_71_8 = (
  {
    height: height,
    mb: mb,
    width: width,
  },
) => ({
  width,
  height,
  borderRadius: 7,
  backgroundColor: '#E2E8F0',
  marginBottom: mb,
});

export const inlineStyle_76_10 = {
  height: 180,
  borderRadius: 16,
  backgroundColor: '#E2E8F0',
  marginBottom: 16,
};

export const inlineStyle_78_20 = {
  backgroundColor: '#fff',
  borderRadius: 12,
  marginBottom: 10,
  padding: 16,
  shadowColor: '#000',

  shadowOffset: {
    width: 0,
    height: 1,
  },

  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
};

export const inlineStyle_84_14 = {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
};

export const inlineStyle_85_16 = {
  width: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: '#E2E8F0',
  marginRight: 8,
};

export const inlineStyle_144_12 = {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
};

export const inlineStyle_150_12 = {
  marginRight: 6,
};

export const inlineStyle_545_10 = {
  flex: 1,
  backgroundColor: '#F8FAFC',
};

export const inlineStyle_673_18 = {
  flex: 1,
};

export const inlineStyle_675_20 = {
  fontSize: 11,
  color: '#94A3B8',
  marginTop: 2,
};

export const inlineStyle_92_14 = {
  padding: 16,
  paddingBottom: 100,
};

