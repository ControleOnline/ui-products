import {StyleSheet, Platform} from 'react-native'

export const categoryCardStyles = StyleSheet.create({
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
  cardImageMobile: {
    borderRadius: 8,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12 },
      android: { elevation: 5 },
      web: { boxShadow: '0 8px 20px rgba(15,23,42,0.16)' },
    }),
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
  cardOverlayMobile: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.50)',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(to top, rgba(15,23,42,0.90) 0%, rgba(15,23,42,0.78) 62%, rgba(15,23,42,0.16) 100%)',
      },
    }),
  },
  cardOverlayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 19,
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.4)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  cardOverlayNameCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardOverlayNameMobile: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
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
  noCategoryCardMobile: {
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 8px 18px rgba(15,23,42,0.10)' },
    }),
  },
  noCategoryCardCompact: {
    borderRadius: 16,
  },
  noCategoryIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  noCategoryNameMobile: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  noCategoryNameCompact: {
    fontSize: 12,
    lineHeight: 16,
  },



})
