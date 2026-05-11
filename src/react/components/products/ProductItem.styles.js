import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },

  imageWrap: {
    width: 100,
    height: 100,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
    overflow: 'hidden',
  },
  imageWrapEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },

  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  bodyNoImage: {
    paddingHorizontal: 16,
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
    gap: 6,
    marginBottom: 5,
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
    marginBottom: 5,
  },
  queueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
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
    marginBottom: 8,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
});

export default styles;
