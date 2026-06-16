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
  tableCustomizeButton: {
    alignItems: 'center',
    minWidth: 116,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  customizeButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 9,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: '0 6px 18px rgba(15,23,42,0.06)' },
    }),
  },
  tableImageCell: {
    width: 64,
    alignItems: 'center',
  },
  tableImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  tableImageEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  tableIdCell: {
    width: 108,
    justifyContent: 'center',
  },
  tableSkuText: {
    marginTop: 2,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tableProductCell: {
    flex: 2.2,
    minWidth: 168,
    justifyContent: 'center',
  },
  tableSyncCell: {
    width: 164,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 188,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCategoryChip: {
    alignSelf: 'center',
    minWidth: 0,
    maxWidth: 180,
  },
  tableTypeChip: {
    alignSelf: 'center',
  },
  tableTypeCell: {
    width: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableQueueCell: {
    width: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tablePriceCell: {
    width: 112,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tableActionCell: {
    width: 140,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  tableMutedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});

export default styles;
