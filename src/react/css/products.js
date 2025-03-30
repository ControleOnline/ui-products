import { StyleSheet } from 'react-native';
import { getStore } from '@store';
import globalStyles from '@controleonline/ui-shop/src/react/styles/global';

const css = () => {
  const { getters } = getStore('theme');
  const { colors } = getters;
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#F5F5F5',
    },
    scrollView: {
      flex: 1,
    },
    loadingText: {
      textAlign: 'center',
    },
    errorText: {
      textAlign: 'center',
      color: 'red',
    },
    noGroupText: {
      textAlign: 'center',
    },
    groupContainer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
    },
    text:{
      color: '#666',
    },
    optionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    optionButton: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
    },
    optionTextContainer: {
      flex: 0.6,
    },
    optionPriceContainer: {
      flex: 0.4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    customizeProduct: {
      Button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      },
      ButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
      },
    },
  });

  return { styles, globalStyles: globalStyles() };
};

export default css;
