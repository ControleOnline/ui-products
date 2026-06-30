import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:        { flex: 1 },
  scrollContent: { alignItems: 'center' },

  /* summary */
  summaryCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  summaryRow:    { flexDirection: 'row', alignItems: 'center' },
  summaryItem:   { flex: 1, alignItems: 'center', gap: 2 },
  summaryNum:    { fontSize: 26, fontWeight: '800' },
  summaryLabel:  { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#F1F5F9' },

  /* grupo */
  groupCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    }),
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  groupCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  groupCheckboxActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  groupCategoryIcon: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  groupName:  { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  groupBadges: { flexDirection: 'row', gap: 4 },

  /* produto row */
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  productRowLast:        { borderBottomWidth: 0 },
  productRowCriticalSel: { backgroundColor: '#FEF2F2' },
  productRowLowSel:      { backgroundColor: '#FFFBEB' },
  productRowTop:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName:    { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  productMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  typeChip:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeChipText: { fontSize: 9, fontWeight: '700' },
  invChip:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  invChipText:  { fontSize: 10, color: '#64748B', fontWeight: '500' },

  /* barra de estoque */
  barTrack:    { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 2 },
  barFill:     { height: '100%', borderRadius: 2, minWidth: 3 },
  barFillCritical: { backgroundColor: '#DC2626' },
  barFillLow:      { backgroundColor: '#e67e22' },
  stockNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 },
  stockAvail:   { fontSize: 10, fontWeight: '600', color: '#64748B' },
  stockMin:     { fontSize: 10, color: '#CBD5E1' },

  /* deficit */
  deficitBadge:         { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  deficitBadgeCritical: { backgroundColor: '#FEE2E2' },
  deficitBadgeLow:      { backgroundColor: '#FEF3C7' },
  deficitText:          { fontSize: 13, fontWeight: '800' },

  /* badge */
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeCritical: { backgroundColor: '#FEE2E2' },
  badgeLow:      { backgroundColor: '#FEF3C7' },
  badgeText:     { fontSize: 10, fontWeight: '700' },

  /* botão comprar categoria */
  buyCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    margin: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
  },
  buyCatBtnText: { fontSize: 13, fontWeight: '700' },

  /* fab */
  fab: { position: 'absolute', bottom: 20, left: 16, right: 16, alignItems: 'center' },
  fabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16,
    width: '100%', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.2)' },
    }),
  },
  fabBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  fabCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  fabCountText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  /* empty */
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },

  /* print feedback banner */
  printFeedback: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  printFeedbackOk:   { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  printFeedbackErr:  { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  printFeedbackText: { fontSize: 13, fontWeight: '600', flex: 1 },

  /* modal impressora */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, maxHeight: '70%',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 12 },
      web:     { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  modalCurrentPrinter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 12,
  },
  modalCurrentText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  printerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  printerItemActive: { },
  printerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  printerSep:  { height: 1, backgroundColor: '#F1F5F9' },
  modalCloseBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
});

export default styles;

export const inlineStyle_125_14 = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingRight: 4,
};

export const inlineStyle_284_14 = (
  {
    maxW: maxW,
  },
) => ({
  width: maxW,
  paddingHorizontal: 16,
  paddingTop: 12,
});

export const inlineStyle_384_20 = {
  marginLeft: 4,
};

export const inlineStyle_410_28 = {
  flex: 1,
  gap: 4,
};

export const inlineStyle_479_18 = {
  alignItems: 'center',
  paddingVertical: 16,
};

export const inlineStyle_481_20 = {
  fontSize: 12,
  color: '#94A3B8',
  marginTop: 6,
};

