import {StyleSheet} from 'react-native';
import {useStores} from '@store';
import globalStyles from '@controleonline/ui-layout/src/react/styles/global';

const css = () => {
  const themeStore = useStores(state => state.theme);
  const getters = themeStore.getters;
  const {colors} = getters;

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
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
    },
    text: {
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
    productItem: {
      cardContainer: {
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginHorizontal: 0,
      },
      rowContainer: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'flex-start',
      },
      infoContainer: {
        flex: 1,
        padding: 5,
      },
      columnContainer: {
        flexDirection: 'column',
      },
      productName: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
      },
      productDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
      },
      groupContainer: {
        marginTop: 5,
      },
      groupName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 4,
      },
      componentText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
      },
      imageContainer: {
        width: 100,
        height: 100,
        justifyContent: 'flex-start',
        alignItems: 'center',
      },
      priceRow: {
        flexDirection: 'row',
        padding: 10,
      },
      priceContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 5,
      },
      priceText: {
        color: '#666',
      },
      totalContainer: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
      },
      totalText: {
        fontSize: 16,
        color: '#000',
        fontWeight: 'bold',
        textAlign: 'center',
      },
      priceTotalText: {
        color: '#666',
        marginTop: 2,
      },
      actionContainer: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
      },
      customizeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: colors['primary'], 
        borderRadius: 5,
      },
      customizeButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    },
  });

  return {styles, globalStyles: globalStyles()};
};

export default css;
