import {Platform, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  card: {
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.08,
        shadowRadius: 9,
      },
      android: {elevation: 2},
      web: {},
    }),
  },
  cardSelected: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.12,
        shadowRadius: 11,
      },
      android: {elevation: 3},
      web: {},
    }),
  },
  cardWithMedia: {
    flexDirection: 'column',
  },
  cardWithMediaNarrow: {
    minHeight: 108,
    flexDirection: 'row',
  },
  cardCompact: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardCompactNarrow: {
    minHeight: 74,
  },
  media: {
    width: '100%',
    aspectRatio: 1.52,
    overflow: 'hidden',
  },
  mediaNarrow: {
    width: 112,
    minHeight: 108,
    aspectRatio: undefined,
    flexShrink: 0,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: 13,
  },
  contentWithMedia: {
    justifyContent: 'space-between',
  },
  compactContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  nameWithMedia: {
    minHeight: 38,
  },
  price: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  actionRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  radio: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMark: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default styles;
