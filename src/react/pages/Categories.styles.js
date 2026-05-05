import { StyleSheet, Platform } from 'react-native'

const skeletonStyles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  searchStickyShell: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    zIndex: 6,
  },
  searchStickyShellCompact: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchSection: {
    width: '100%',
    marginBottom: 18,
  },
  searchSectionCompact: {
    marginBottom: 0,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F3',
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(15,23,42,0.06)' },
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 12,
  },
  searchInputWrapCompact: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInputCompact: {
    fontSize: 14,
    paddingVertical: 10,
  },
  searchHelperText: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 12,
    color: '#64748B',
  },
  searchHelperTextCompact: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
  },
  searchSuggestionList: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  searchSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchSuggestionItemCompact: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchSuggestionCopy: {
    flex: 1,
  },
  searchSuggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchSuggestionTitleCompact: {
    fontSize: 13,
  },
  searchSuggestionMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  searchSuggestionMetaCompact: {
    fontSize: 11,
  },

  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  countLabelCompact: {
    fontSize: 12,
    marginBottom: 10,
  },

  topActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 180,
  },
  actionButtonText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  importButton: {
    backgroundColor: '#fff',
    borderColor: '#BBF7D0',
  },
  importButtonText: {
    color: '#166534',
  },
  modelButton: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    justifyContent: 'flex-start',
  },
  modelButtonCopy: {
    flex: 1,
  },
  modelButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modelButtonValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C1D95',
  },
  integrationButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  integrationButtonText: {
    color: '#0369A1',
  },
  syncEligibleButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  syncEligibleButtonText: {
    color: '#047857',
  },
  catalogButton: {
    borderColor: '#0F172A',
  },
  catalogButtonText: {
    color: '#fff',
  },
  disabledActionButton: {
    opacity: 0.6,
  },
  syncOverlay: {
    position: 'absolute',
    left: 8,
    top: 8,
    zIndex: 3,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: 240,
    paddingBottom: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    paddingRight: 12,
  },
  pickerModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerModalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  pickerStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  modelOptionSelected: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  modelOptionCopy: {
    flex: 1,
  },
  modelOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modelOptionTitleSelected: {
    color: '#5B21B6',
  },
  modelOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  cardTouchable: {
    width: '100%',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
    }),
  },
  cardImageCompact: {
    borderRadius: 16,
  },

  cardCoverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 48,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
      },
      default: {
        backgroundColor: 'rgba(0,0,0,0.45)',
      },
    }),
  },
  cardOverlayCompact: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 36,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cardOverlayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardOverlayNameCompact: {
    fontSize: 12,
    lineHeight: 16,
  },

  editOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── card sem categoria ─── */
  noCategoryCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noCategoryCardCompact: {
    borderRadius: 16,
  },
  noCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  noCategoryNameCompact: {
    fontSize: 12,
    lineHeight: 16,
  },


  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalBody: {
    padding: 24,
  },
  attachmentSection: {
    marginTop: 18,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})

export { skeletonStyles, styles }

export const inlineStyle_104_8 = (
  {
    width: width,
  },
) => ({
  width,
});

export const inlineStyle_424_14 = (
  {
    containerWidth: containerWidth,
    gap: gap,
  },
) => ({
  width: containerWidth,
  paddingHorizontal: gap / 2,
  paddingTop: 16,
  paddingBottom: 0,
});

export const inlineStyle_617_22 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_631_42 = (
  {
    cardWidth: cardWidth,
  },
) => ({
  width: cardWidth,
});

export const inlineStyle_692_8 = {
  justifyContent: 'flex-end',
};

