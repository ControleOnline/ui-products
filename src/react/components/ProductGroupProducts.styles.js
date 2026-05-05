import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  /* ─── item card ─── */
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemQueueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  itemQueueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  itemCardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  parentQueueVisibilityLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  parentQueueVisibilityText: {
    fontSize: 11,
    color: '#0E7490',
    fontWeight: '600',
  },
  parentQueueVisibilityTextMuted: {
    color: '#94A3B8',
  },
  itemBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  itemCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemPriceWrap: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 11,
    color: '#94A3B8',
  },
  itemCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  visibilityRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  visibilityTextWrap: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },

  /* ─── botão adicionar ─── */
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ─── vazio ─── */
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  /* ─── modal busca ─── */
  searchModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchModalClose: {
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
  searchEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
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
  searchResultType: {
    fontSize: 12,
    color: '#94A3B8',
  },
  searchResultQueue: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  searchFooterLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },

  /* ─── modal formulário ─── */
  formModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  formModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formModalBody: {
    padding: 24,
  },
  formModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── produto readonly ─── */
  productReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  productReadonlyText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },

  /* ─── fields ─── */
  fieldWrap: { marginBottom: 14 },
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
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfField: { flex: 1 },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  quantityInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  unitInline: { fontSize: 13, fontWeight: '700', color: '#94A3B8', paddingLeft: 6 },

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
  required: {
    color: '#EF4444',
    fontSize: 11,
  },

  /* ─── confirmar exclusão ─── */
  confirmModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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

export const inlineStyle_85_8 = (
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

export const inlineStyle_159_75 = {
  marginRight: 8,
};

export const inlineStyle_177_10 = {
  flex: 1,
};

export const inlineStyle_206_22 = {
  flex: 1,
};

export const inlineStyle_240_62 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_249_20 = {
  flexShrink: 1,
};

export const inlineStyle_253_94 = {
  marginRight: 6,
};

export const inlineStyle_262_98 = {
  marginRight: 8,
};

export const inlineStyle_311_85 = {
  marginRight: 8,
};

export const inlineStyle_355_14 = {
  flex: 1,
  marginRight: 8,
};

export const inlineStyle_714_12 = {
  padding: 16,
};

export const inlineStyle_805_8 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_812_12 = {
  alignSelf: 'center',
  marginBottom: 10,
};

export const inlineStyle_816_18 = {
  fontWeight: '700',
};
