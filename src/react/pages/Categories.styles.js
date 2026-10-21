import {categoryModelPickerStyles} from './CategoriesPage/categoryModelPickerStyles'
import {categoryEditorStyles} from './CategoriesPage/categoryEditorStyles'
import {categoryCardStyles} from './CategoriesPage/categoryCardStyles'
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
  tableContent: {
    flex: 1,
    minHeight: 0,
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
  pdvCategoryTabsShell: {
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    zIndex: 5,
  },
  pdvCategoryTabsContent: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  pdvCategoryTab: {
    minHeight: 38,
    maxWidth: 180,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCE7F3',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  pdvCategoryTabText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  pdvCategoryTabTextSelected: {
    color: '#FFFFFF',
  },
  pdvCategoryEmptyHint: {
    marginTop: 18,
    paddingHorizontal: 16,
    color: '#64748B',
    textAlign: 'center',
    fontSize: 13,
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
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchSuggestionItemCompact: {
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  searchSuggestionThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  searchSuggestionImage: {
    width: '100%',
    height: '100%',
  },
  searchSuggestionCopy: {
    flex: 1,
    minWidth: 0,
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
  searchSuggestionPrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
  },
  searchSuggestionPriceCompact: {
    fontSize: 13,
  },
  searchSuggestionQuantity: {
    flexShrink: 0,
    marginRight: -8,
  },
  searchSuggestionCustomizeButton: {
    flexShrink: 0,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#022736',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchSuggestionCustomizeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
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
  normalizedCatalogButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  normalizedCatalogButtonText: {
    color: '#9A3412',
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
  ...categoryModelPickerStyles,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  cardTouchable: {
    width: '100%',
  },
  ...categoryCardStyles,
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

  ...categoryEditorStyles,

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

