import { StyleSheet, Platform } from 'react-native'

const skeletonStyles = StyleSheet.create({
  card: { width: '100%', borderRadius: 20, backgroundColor: '#E2E8F0' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  historyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FDF4', borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0',
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8,
  },
  historyBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyBannerText: { fontSize: 14, fontWeight: '700', color: '#6D28D9' },

  countLabel: {
    fontSize: 13, fontWeight: '600', color: '#94A3B8',
    marginBottom: 14, letterSpacing: 0.3,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },

  cardTouchable: { width: '100%' },
  card: {
    width: '100%', borderRadius: 20, backgroundColor: '#fff',
    padding: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  cardIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 13, fontWeight: '700', color: '#1E293B', textAlign: 'center', lineHeight: 17 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typeChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  editOverlay: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },

  /* card Sem Local */
  noInventoryCard: {
    width: '100%', borderRadius: 20,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  noInventoryName: {
    fontSize: 13, fontWeight: '700', color: '#94A3B8',
    textAlign: 'center', lineHeight: 18,
  },

  emptyContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomBarButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  bottomBarButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  headerCloseButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center',
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { padding: 24 },
  modalFooter: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center',
  },
  modalCancelButtonText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  modalSaveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalSaveButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export { skeletonStyles, styles }

export const inlineStyle_29_8 = (
  {
    width: width,
  },
) => ({
  width,
});

export const inlineStyle_98_14 = (
  {
    gap: gap,
    maxW: maxW,
  },
) => ({
  width: maxW,
  paddingHorizontal: gap / 2,
  paddingTop: 16,
});

export const inlineStyle_158_22 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_175_39 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_223_8 = {
  justifyContent: 'flex-end',
};

