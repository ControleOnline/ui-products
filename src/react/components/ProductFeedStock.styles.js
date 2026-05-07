import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── toggle ─── */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ─── área expandida ─── */
  expandedArea: {
    paddingTop: 8,
  },
  loadingRow: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadingText: { fontSize: 12, color: '#94A3B8' },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  emptyText: { fontSize: 12, color: '#CBD5E1' },

  /* ─── card de insumo ─── */
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemReferenceLink: {
    marginBottom: 3,
  },
  itemReferenceText: {
    fontSize: 10,
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── botão adicionar ─── */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  /* ─── modal busca ─── */
  searchModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  searchEmptyText: { fontSize: 14, color: '#94A3B8' },
  searchMoreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  searchMoreText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchResultType: { fontSize: 12, color: '#94A3B8' },
  quickRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  quickRegBtnText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
  unitChipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  unitChip: {
    borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
  },
  unitChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  unitChipEmpty: { fontSize: 12, color: '#94A3B8', paddingVertical: 8 },
  searchFooterRegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },

  /* ─── modal formulário ─── */
  formModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  formClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBody: { padding: 24 },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── produto readonly ─── */
  productReadonlyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  productReadonlyText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },

  /* ─── quantidade + unidade ─── */
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  unitInline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    paddingLeft: 6,
  },

  /* ─── fields ─── */
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  required: { color: '#EF4444', fontSize: 11 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  /* ─── erro ─── */
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: { color: '#9e1b1b', fontSize: 14 },

  /* ─── botões ─── */
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ─── confirmar exclusão ─── */
  confirmModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmFooter: { flexDirection: 'row', gap: 12 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default styles;

export const inlineStyle_71_62 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_82_92 = {
  marginRight: 6,
};

export const inlineStyle_210_75 = {
  marginRight: 8,
};

export const inlineStyle_228_10 = {
  flex: 1,
};

export const inlineStyle_263_22 = {
  flex: 1,
};

export const inlineStyle_307_62 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_319_92 = {
  marginRight: 6,
};

export const inlineStyle_326_94 = {
  marginRight: 8,
};

export const inlineStyle_758_10 = {
  marginRight: 5,
};

export const inlineStyle_798_22 = {
  flex: 1,
};

export const inlineStyle_882_8 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_889_12 = {
  alignSelf: 'center',
  marginBottom: 8,
};

export const inlineStyle_893_18 = {
  fontWeight: '700',
};
