import {StyleSheet} from 'react-native';
import {getStore} from '@store';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';

const css = () => {
  const {getters} = getStore('theme');
  const {colors} = getters;
  const styles = StyleSheet.create({
    /* ProductList */
    subHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: '#333',
    },
    btnAdd: {
      flex: 1,
      color: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors['primary'],
    },
    boxWrap: {
      backgroundColor: '#fff',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    boxTextColor: {
      color: '#000',
    },
    boxOrderText: {
      fontWeight: '700',
    },
    boxDateText: {
      fontSize: 13,
      marginTop: 5,
    },
    boxPrice: {
      fontSize: 14,
      fontWeight: '700',
    },
    boxStatusText: {
      fontSize: 13,
      color: '#000',
      marginTop: 5,
    },
    boxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    boxContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5,
    },

    /** Carousel */
    slidecontainer: {
      flex: 1,
    },
    slide: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      borderRadius: 10,
    },
  });

  return {styles, globalStyles};
};

export default css;
