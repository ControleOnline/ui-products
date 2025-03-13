import {StyleSheet} from 'react-native';
import {useTheme} from '@controleonline/ui-layout/src/react/components/ThemeProvider';

const css = () => {
  const {colors} = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      backgroundColor: '#fff',
    },

    header: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#1B5587',
    },
    boxWrap: {
      flex: 1,
      backgroundColor: '#fff',
      marginBottom: 15,
      borderLeftColor: '#40b8af',
      borderLeftWidth: 7,
      elevation: 3,
    },

    boxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
    },
    boxContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderTopEndRadius: 7,
      borderTopLeftRadius: 7,
    },
    boxOrderText: {
      fontWeight: '700',
    },
    boxTextColor: {
      color: '#000000',
    },
    boxDateText: {
      color: '#000000',
      fontSize: 13,
      fontWeight: '700',
    },
    boxPrice: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
    boxStatusText: {
      padding: 7,
      borderRadius: 20,
      fontSize: 13,
      color: '#5bbf4b',
      fontWeight: '500',
    },
  });

  return styles;
};

export default css;
