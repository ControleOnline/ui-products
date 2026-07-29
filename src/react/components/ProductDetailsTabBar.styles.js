import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  content: {
    minWidth: '100%',
  },
  contentFixed: {
    flexGrow: 1,
  },
  indicator: {
    borderRadius: 2,
    bottom: 0,
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 96,
    paddingHorizontal: 16,
  },
  tabFixed: {
    flex: 1,
    minWidth: 0,
  },
});

export default styles;
