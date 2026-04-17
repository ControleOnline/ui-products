import { StyleSheet, Platform } from 'react-native'

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  header:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  productName:        { fontSize: 14, fontWeight: '700', color: '#1E293B', lineHeight: 19 },
  productDescription: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 16 },
  productType:        { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  fields:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  fieldWrap: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 15, fontWeight: '700', color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  invSection:     { marginTop: 2 },
  invChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  invChipText:    { fontSize: 12, fontWeight: '600', color: '#64748B' },
  invHint:        { fontSize: 11, color: '#F97316', marginTop: 6, fontStyle: 'italic' },
  supplierSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  commentSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  commentInput: {
    marginTop: 6, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1E293B',
    backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 60,
  },
});

const supplierStyles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#FAFAFA', marginTop: 6,
  },
  triggerText: { flex: 1, fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  selectedWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC',
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 6,
  },
  selectedName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#15803D' },
  clearBtn:     { padding: 2 },

  applyAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 5, paddingHorizontal: 4,
  },
  applyAllText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fff', marginTop: 6,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },

  resultList: {
    backgroundColor: '#fff', borderRadius: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  resultItem:  { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  resultName:  { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  resultAlias: { fontSize: 11, color: '#64748B', marginTop: 1 },

  emptyState: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginTop: 4,
  },
  emptyText: { fontSize: 12, color: '#94A3B8' },
});

const searchStyles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F8FAFC', justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', padding: 0 },
  resultList: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  resultTextBlock:   { flex: 1, minWidth: 0, marginRight: 8 },
  resultName:        { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  resultDescription: { fontSize: 12, color: '#64748B', marginTop: 2 },
  resultType:        { fontSize: 11, color: '#94A3B8', marginLeft: 8 },
});

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryLabel:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  summaryValue:   { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#F1F5F9' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 8,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  footer: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    ...Platform.select({
      web:     { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  originCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web:     { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
    }),
  },
  originLabel:       { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  originChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  originChipSelected: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  originChipText:    { fontSize: 12, fontWeight: '600', color: '#64748B' },
  originHint:        { fontSize: 11, color: '#F97316', marginTop: 6, fontStyle: 'italic' },

  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle:          { fontSize: 24, fontWeight: '800', color: '#16A34A', marginBottom: 8, textAlign: 'center' },
  successSub:            { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  successBtn:            { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  successBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBtnOutline:     { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  successBtnOutlineText: { fontWeight: '700', fontSize: 15 },
});

export { rowStyles, supplierStyles, searchStyles, styles }

export const inlineStyle_158_73 = {
  marginRight: 6,
};

export const inlineStyle_167_68 = {
  marginLeft: 6,
};

export const inlineStyle_168_76 = {
  marginLeft: 6,
};

export const inlineStyle_176_12 = {
  maxHeight: 200,
};

export const inlineStyle_196_72 = {
  padding: 8,
};

export const inlineStyle_221_14 = {
  flex: 1,
};

export const inlineStyle_266_70 = {
  marginTop: 6,
};

export const inlineStyle_267_16 = {
  flexDirection: 'row',
  gap: 8,
  paddingBottom: 4,
};

export const inlineStyle_408_75 = {
  marginRight: 6,
};

export const inlineStyle_417_72 = {
  marginLeft: 6,
};

export const inlineStyle_418_94 = {
  marginLeft: 6,
};

export const inlineStyle_704_8 = {
  flex: 1,
};

export const inlineStyle_743_76 = {
  marginTop: 6,
};

export const inlineStyle_744_22 = {
  flexDirection: 'row',
  gap: 8,
  paddingBottom: 4,
};

export const inlineStyle_795_16 = {
  height: 100,
};

