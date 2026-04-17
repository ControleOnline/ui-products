import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { padding: 16 },
  emptyText:     { fontSize: 14, color: '#64748B' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  emptyBlock:    { alignItems: 'center', paddingVertical: 24 },
  emptyCardText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  snapshotCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  snapshotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  snapshotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  noPiText: {
    fontSize: 11,
    color: '#CBD5E1',
    marginBottom: 10,
    fontStyle: 'italic',
  },

  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  snapshotCell: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  snapshotCellWarn: {
    backgroundColor: '#FEF2F2',
  },
  snapshotCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  snapshotCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  movBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  movBtnText: { fontSize: 12, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
});

export default styles;

export const inlineStyle_40_8 = (
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

export const inlineStyle_49_24 = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
};

export const inlineStyle_242_87 = {
  marginBottom: 8,
};

export const inlineStyle_269_89 = {
  marginRight: 6,
};

export const inlineStyle_57_14 = {
  padding: 16,
};


