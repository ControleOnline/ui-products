import { StyleSheet, Platform } from 'react-native'

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  line: { borderRadius: 6, backgroundColor: '#E2E8F0' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  invHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  invIconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  invName:      { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  typeChip:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  totalBadge:   { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  totalLabel:   { fontSize: 10, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  totalCount:   { fontSize: 20, fontWeight: '800', color: '#1E293B' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 6 },

  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, marginTop: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardHeaderLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 },
  cardHeaderCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },

  productRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  productRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rowLeft: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  productDescription: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  miniChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  miniChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  skuText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  noPiChip: { backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  noPiText: { fontSize: 9, fontWeight: '700', color: '#D97706', letterSpacing: 0.3 },

  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  stockCell: { backgroundColor: '#F8FAFC', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5, alignItems: 'center', minWidth: 48, flexShrink: 0 },
  stockCellLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  stockCellValue: { fontSize: 12, fontWeight: '700', color: '#475569' },

  rowRight: { alignItems: 'center', gap: 6 },
  availBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 56 },
  availBadgeLow: { backgroundColor: '#FFF7ED' },
  availValue: { fontSize: 18, fontWeight: '800', color: '#16A34A' },
  availValueLow: { color: '#D97706' },
  availLabel: { fontSize: 9, fontWeight: '700', color: '#86EFAC', textTransform: 'uppercase', letterSpacing: 0.3 },
  availLabelLow: { color: '#FCD34D' },
  actionBtns: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
});

const movStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title:    { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  body: { padding: 24, gap: 18 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText:   { fontSize: 13, color: '#DC2626', flex: 1 },

  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  balanceValue: { fontSize: 22, fontWeight: '800', color: '#1E293B' },

  opsRow: { flexDirection: 'row', gap: 8 },
  opChip: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  opLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },
  qtyInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 24, fontWeight: '800', color: '#1E293B',
    backgroundColor: '#F8FAFC', textAlign: 'center',
  },

  destChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  destChipActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  destChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  destChipTextActive: { color: '#7C3AED' },

  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  previewText: { fontSize: 13, color: '#475569', flex: 1 },

  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#1E293B' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const editStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title:    { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  body: { padding: 24, gap: 16 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  fieldsRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#0F172A', backgroundColor: '#F8FAFC', textAlign: 'center' },
  inputHighlight: { borderColor: '#16A34A', backgroundColor: '#F0FDF4', color: '#16A34A' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  infoText: { fontSize: 12, color: '#64748B', flex: 1, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export { skeletonStyles, styles, movStyles, editStyles }

export const inlineStyle_68_10 = {
  flex: 1,
  gap: 6,
};

export const inlineStyle_238_68 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_241_16 = {
  flex: 1,
};

export const inlineStyle_250_56 = {
  flexShrink: 1,
};

export const inlineStyle_400_62 = {
  justifyContent: 'flex-end',
};

export const inlineStyle_403_16 = {
  flex: 1,
};

export const inlineStyle_413_56 = {
  flexShrink: 1,
};

export const inlineStyle_515_12 = {
  paddingHorizontal: 12,
};

export const inlineStyle_644_14 = {
  flex: 1,
};

export const inlineStyle_661_75 = {
  marginRight: 8,
};

export const inlineStyle_670_60 = {
  padding: 4,
};

export const inlineStyle_681_14 = (
  {
    maxW: maxW,
  },
) => ({
  width: maxW,
  paddingHorizontal: 16,
  paddingTop: 8,
});

export const inlineStyle_816_85 = {
  marginBottom: 12,
};

