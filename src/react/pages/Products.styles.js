import { StyleSheet } from 'react-native'

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
  },
  imageBlock: {
    width: 100,
    height: 100,
    backgroundColor: '#E2E8F0',
  },
  body: {
    flex: 1,
    padding: 12,
  },
  line: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyWithHeader: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyHeaderWrap: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: '#fff',
  },
  bottomBarButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  bottomBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },

  supplyHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  supplyHeaderText: {
    gap: 3,
  },
  supplyHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  supplyHeaderDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  supplyTypeSelector: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8E5F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supplyTypeSelectorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplyTypeSelectorText: {
    flex: 1,
  },
  supplyTypeSelectorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  supplyTypeSelectorValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  supplyTypeModalWrap: {
    justifyContent: 'flex-end',
  },
  supplyTypeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  supplyTypeModalHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  supplyTypeModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  supplyTypeModalClose: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  supplyTypeOption: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supplyTypeOptionActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },
  supplyTypeOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplyTypeOptionText: {
    flex: 1,
  },
  supplyTypeOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  supplyTypeOptionDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
});

export { skeletonStyles, styles }

export const inlineStyle_413_16 = (
  {
    containerWidth: containerWidth,
  },
) => ({
  width: containerWidth,
  paddingHorizontal: 16,
});

export const inlineStyle_449_10 = {
  padding: 16,
};
