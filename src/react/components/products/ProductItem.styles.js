import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    minHeight: 128,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },

  imageWrap: {
    width: 112,
    minHeight: 128,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: 106,
    height: 106,
  },

  body: {
    flex: 1,
    minHeight: 128,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'center',
    gap: 2,
  },
  bodyNoImage: {
    paddingHorizontal: 16,
  },

  cardTopRow: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardIdentity: {
    flex: 1,
    gap: 1,
    paddingRight: 4,
  },
  cardContent: {
    gap: 4,
  },

  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardTypeChip: {
    minWidth: 86,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    minHeight: 20,
  },
  metaGridRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaGridCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'stretch',
    minWidth: 86,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryChipPlaceholder: {
    opacity: 0.7,
  },
  categorySwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  categorySwatchPlaceholder: {
    opacity: 0.5,
  },
  categoryChipText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unitChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  queueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 16,
  },
  queueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  queueValueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  managerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skuLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    maxWidth: 90,
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    minHeight: 16,
  },
  descriptionPlaceholder: {
    opacity: 0,
  },
  placeholderText: {
    opacity: 0.62,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16A34A',
  },
  supplyPrice: {
    color: '#475569',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  priceTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 1,
  },

  actionWrap: {
    alignItems: 'flex-end',
  },

  customizeButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customizeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 5px rgba(15,23,42,0.05)' },
    }),
  },
  tableImageCell: {
    width: 48,
    alignItems: 'center',
  },
  tableImage: {
    width: 42,
    height: 42,
    borderRadius: 6,
  },
  tableImageEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  tableIdCell: {
    width: 84,
  },
  tableSkuText: {
    marginTop: 2,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tableProductCell: {
    flex: 2,
    minWidth: 160,
  },
  tableSyncCell: {
    width: 160,
    alignItems: 'flex-start',
    marginRight: 44,
  },
  tableNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tableName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
  },
  tableDescription: {
    marginTop: 2,
    fontSize: 11,
    color: '#94A3B8',
  },
  tableCategoryCell: {
    flex: 1.1,
    minWidth: 120,
    marginRight: 10,
    alignItems: 'flex-start',
  },
  tableCategoryChip: {
    alignSelf: 'flex-start',
    minWidth: 0,
    maxWidth: 180,
  },
  tableTypeCell: {
    width: 104,
    marginRight: 24,
  },
  tableQueueCell: {
    flex: 1,
    minWidth: 100,
    paddingLeft: 16,
  },
  tablePriceCell: {
    width: 92,
    alignItems: 'flex-end',
  },
  tableActionCell: {
    width: 92,
    alignItems: 'flex-end',
  },
  tableMutedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});

export default styles;
