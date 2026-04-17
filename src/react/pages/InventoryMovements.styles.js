import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 6 },

  filtersWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingVertical: 8, gap: 6,
  },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#fff' },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  countText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  refreshBtn: { padding: 4 },

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
  itemDivider: { borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },

  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemBody: { flex: 1, gap: 3 },
  itemProduct: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  opChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  metaText: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  itemLocations: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemLocationText: { fontSize: 11, color: '#64748B', flex: 1 },
  itemDate: { fontSize: 10, color: '#CBD5E1', fontWeight: '500' },
  itemComment: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 1 },
  itemCommentText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', flex: 1 },

  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },

  loadMoreBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});

export default styles;

export const inlineStyle_275_73 = {
  marginRight: 8,
};

export const inlineStyle_284_58 = {
  padding: 4,
};

export const inlineStyle_367_14 = (
  {
    maxW: maxW,
  },
) => ({
  width: maxW,
  paddingHorizontal: 16,
  paddingTop: 4,
});

export const inlineStyle_390_85 = {
  marginBottom: 12,
};

export const inlineStyle_410_14 = {
  marginVertical: 16,
};

