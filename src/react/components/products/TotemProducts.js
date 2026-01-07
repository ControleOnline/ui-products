import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import api from "../../utils/axiosInstance";
import Icon from 'react-native-vector-icons/MaterialIcons';
import globalStyles from '../../styles/global';
import NotifyComponent from '../default/popup/notify';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TotemProducts = ({ route, navigation }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orderProductId, setOrderProductId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderTotal, setOrderTotal] = useState(0); // Estado para armazenar o total da ordem
    const [myCompany, setMyCompany] = useState(null);
    const [popupVisible, setPopupVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const { order = null } = route.params; // Parâmetros da rota

    const showErrorPopup = message => {
        setErrorMessage(message);
        setPopupVisible(true);
    };

    const onClosePopup = () => {
        setPopupVisible(false);
        returnToOrders();
    };

    const fetchOrder = async orderId => {
        try {
            const response = await api.get(`/orders/${orderId}`);
            if (response.data) {
                return response.data;
            }
            showErrorPopup(response);
        } catch (error) {
            showErrorPopup(error);
        }
    };
  useEffect(() => {
        const getMyCompany = async () => {
          try {
            const userDataString = await AsyncStorage.getItem('userData');
            if (userDataString) {
              const userData = JSON.parse(userDataString);
              setMyCompany(userData.mycompany);
            }
          } catch (error) {
            console.error('Erro ao verificar se o usuário está logado:', error);
          }
        };
    
        getMyCompany();
      }, []);
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            if (!myCompany) return;
            try {
                const response = await api.get('/products?company=/people/' + myCompany);
                if (response.data['member']) {
                    const products = response.data['member'];
                    setProducts(products);
                } else {
                    showErrorPopup(response.data);
                }
            } catch (error) {
                showErrorPopup(error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [myCompany]);

    useEffect(() => {
        setOrderTotal(order.price); // Atualiza o total da ordem sempre que a ordem for modificada
    }, [order]);

    useFocusEffect(
        useCallback(() => {
            if (products.length > 0 && order.orderProducts.length > 0) {
                const orderProduct = order.orderProducts[0].product;
                const selected = products.find(
                    product => product['@id'] === orderProduct['@id'],
                );

                setSelectedProduct(selected);
                setOrderProductId(order.orderProducts[0].id);
            }
        }, [products, order]),
    );

    const formatPrice = price => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price);
    };

    const selectProduct = async (product) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            setSelectedProduct(null);
            setOrderProductId(null);

            const updatedOrderResponse = await api.get(`/orders/${order.id}`);
            const updatedOrder = updatedOrderResponse.data;

            if (updatedOrder.status.status !== 'Pago') {
                if (orderProductId) {
                    await removeProductFromOrder(orderProductId);
                }

                await updateOrderTotal(order.id, product.price);
                
                const payload = {
                    order: `orders/${order.id}`,
                    product: `products/${product.id}`,
                    quantity: 1,
                    price: product.price,
                    total: product.price,
                };

                try {
                    const response = await api.post('/order_products', payload);
                    if (response.data) {
                        setSelectedProduct(product);
                        setOrderProductId(response.data.id);
                        setOrderTotal(product.price); // Atualiza o total com o preço do novo produto
                    } else {
                        await showErrorPopup('Erro ao adicionar produto');
                    }
                } catch (error) {
                    await showErrorPopup('Erro ao adicionar produto: ' + error.message);
                }
            } else {
                showErrorPopup('Este pedido já foi pago!');
            }
        } catch (error) {
            await showErrorPopup('Erro ao atualizar pedido: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const updateOrderTotal = async (orderId, newTotal) => {
        try {

            await api.put(`/orders/${orderId}`, {
                price: newTotal
            });
            setOrderTotal(newTotal); // Atualiza o estado do total da ordem
        } catch (error) {
            console.error('Erro ao atualizar o total da ordem:', error);
        }
    };

    const removeProductFromOrder = async orderProductId => {
        if (!orderProductId) return;
        try {

            const response = await api.delete(`/order_products/${orderProductId}`);
            if (response.status !== 204) {
                console.log('Error removing product');
            }
        } catch (error) {
            console.log(error);
        }
    };


    const clearOrderProducts = async () => {
        
        setIsProcessing(true);

        try {

            for (const orderProduct of order.orderProducts) {
                
                await removeProductFromOrder(orderProduct.id);

            }
            
            await updateOrderTotal(order.id, 0);
            setSelectedProduct(null);

            // ALEMAC // 16/10/25
            // manter comentado
            //setOrderProductId(null);

        } catch (error) {
            showErrorPopup('Erro ao limpar os produtos: ' + error.message);
            console.log('Erro', error.message);

        } finally {
            setIsProcessing(false);
        }
    };

    const returnToOrders = async () => {
        const updatedOrder = await fetchOrder(order.id);

        if (updatedOrder.status.status === 'Pago') {
            navigation.navigate('orders');
        } 
    };

    const handleCheckout = async () => {
        if (orderTotal <= 0) { // Bloqueia a navegação se o total for zero
            showErrorPopup('Não é possível prosseguir com pagamento de valor zero!');
            return;
        }

        const updatedOrder = await fetchOrder(order.id);

        if (updatedOrder.status.status !== 'Pago') {
            navigation.navigate('checkout', { order: updatedOrder });
        } else {
            showErrorPopup('Este pedido já foi pago!');
        }
    };

    if (loading) {
        return (
            <View style={globalStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#fece00" />
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            {/* Exibe o valor total da ordem */}
            <View style={styles.totalContainer}>
                <Text style={styles.totalText}>Total da Ordem: {formatPrice(orderTotal)}</Text>
            </View>

            <View style={styles.wrapPayment}>
                <ScrollView>
                    {products.map(product => (
                        <TouchableOpacity
                            key={product['@id']}
                            onPress={() => selectProduct(product)}
                            disabled={isProcessing}>
                            <View
                                style={[
                                    styles.boxPayment,
                                    selectedProduct?.['@id'] === product['@id'] &&
                                    styles.selectedBoxPayment,
                                ]}>
                                <View style={styles.paymentIcon}>
                                    {selectedProduct?.['@id'] === product['@id'] ? (
                                        <Icon name="check-box" size={24} color="black" />
                                    ) : (
                                        <Icon
                                            name="check-box-outline-blank"
                                            size={24}
                                            color="black"
                                        />
                                    )}
                                </View>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productText}>{product.product}</Text>
                                </View>
                                <View style={styles.priceInfo}>
                                    <Text style={styles.priceText}>
                                        {formatPrice(product.price)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.boxAction}>
                <TouchableOpacity
                    onPress={handleCheckout}
                    style={[globalStyles.button, globalStyles.primary]}>
                    <Text
                        style={[globalStyles.textSecundaryColor, globalStyles.textBold]} disabled={isProcessing}>
                        CONTINUAR PARA PAGAMENTO
                    </Text>
                </TouchableOpacity>

                {/* Botão para limpar produtos */}
                <TouchableOpacity
                    onPress={clearOrderProducts}
                    style={styles.clearButton}
                    disabled={isProcessing}>
                    <Text style={styles.clearButtonText}>Limpar Produtos</Text>
                </TouchableOpacity>
            </View>

            <NotifyComponent
                isVisible={popupVisible}
                onClose={onClosePopup}
                color={'#ee3e4f'}
                icon={'info'}
                label={'Mensagem do Sistema'}
                message={errorMessage}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    totalContainer: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
    wrapPayment: {
        flex: 5,
    },
    boxPayment: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderRadius: 7,
        elevation: 3,
    },
    selectedBoxPayment: {
        backgroundColor: '#fece00',
    },
    paymentIcon: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    productInfo: {
        flex: 1,
        marginRight: 10,
    },
    productText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#000',
    },
    descriptionText: {
        fontSize: 14,
        color: '#666',
    },
    priceInfo: {
        width: 100,
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    boxAction: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    clearButton: {
        backgroundColor: '#ff4d4d',
        padding: 10,
        margin: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default TotemProducts;
