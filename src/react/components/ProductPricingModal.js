import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import {
  fetchLatestPurchasesByProductIds,
  formatCurrency,
  normalizeEntityId,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import styles from './ProductPricingModal.styles';

const formatPurchaseDate = value => {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('pt-BR');
};

const buildPurchaseLabel = purchase => {
  if (!purchase) return 'Sem compra recente encontrada.';

  const date = formatPurchaseDate(purchase.orderDate);
  const supplier = String(purchase.supplierLabel || '').trim();
  const base = [
    date ? `Ultima compra em ${date}` : 'Ultima compra registrada',
    supplier || null,
    `${purchase.quantity || 0} x ${formatCurrency(purchase.unitPrice)}`,
  ].filter(Boolean).join(' · ');

  return base || 'Sem compra recente encontrada.';
};

const FeedstockCostRow = ({ feedstock, latestPurchase, navigation }) => {
  const productId = normalizeEntityId(feedstock?.productChild);
  const productName =
    feedstock?.productChild?.product ||
    feedstock?.productChild?.name ||
    `#${productId || ''}`;
  const quantity = feedstock?.quantity ?? 1;

  const openPurchaseHistory = () => {
    navigation.navigate('OrderHistoryPage', {
      orderTypeFilter: 'purchase',
      historyTitle: `Compras · ${productName}`,
    });
  };

  return (
    <View style={styles.feedstockRow}>
      <View style={styles.feedstockTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedstockName} numberOfLines={2}>{productName}</Text>
          <Text style={styles.feedstockMeta}>
            Qtd. usada: {quantity}
          </Text>
        </View>
        <Text style={styles.feedstockCost}>{formatCurrency(feedstock?.price)}</Text>
      </View>
      <View style={styles.purchaseRow}>
        <Text style={styles.purchaseText}>{buildPurchaseLabel(latestPurchase)}</Text>
        <TouchableOpacity style={styles.purchaseButton} onPress={openPurchaseHistory} activeOpacity={0.75}>
          <Text style={styles.purchaseButtonText}>Compras</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ProductPricingModal = ({
  visible,
  onClose,
  navigation,
  pricingBreakdown,
}) => {
  const ordersStore = useStore('orders');
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const [latestPurchases, setLatestPurchases] = useState({});

  const allFeedstocks = useMemo(() => {
    const directFeedstocks = Array.isArray(pricingBreakdown?.directFeedstocks)
      ? pricingBreakdown.directFeedstocks
      : [];
    const groupFeedstocks = Array.isArray(pricingBreakdown?.groups)
      ? pricingBreakdown.groups.flatMap(group => group?.cheapestOptionFeedstocks || [])
      : [];

    return [...directFeedstocks, ...groupFeedstocks];
  }, [pricingBreakdown?.directFeedstocks, pricingBreakdown?.groups]);

  useEffect(() => {
    if (!visible) return undefined;

    let cancelled = false;

    const loadLatestPurchases = async () => {
      const productIds = allFeedstocks
        .map(feedstock => normalizeEntityId(feedstock?.productChild))
        .filter(Boolean);

      try {
        const purchases = await fetchLatestPurchasesByProductIds({
          companyId: currentCompany?.id,
          ordersActions: ordersStore?.actions,
          productIds,
        });

        if (!cancelled) {
          setLatestPurchases(purchases);
        }
      } catch {
        if (!cancelled) {
          setLatestPurchases({});
        }
      }
    };

    loadLatestPurchases();

    return () => {
      cancelled = true;
    };
  }, [allFeedstocks, currentCompany?.id, ordersStore?.actions, visible]);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose}>
      <View style={styles.modalSurface}>
        <View style={styles.header}>
          <Text style={styles.title}>Detalhes da precificacao</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Custo total estimado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(pricingBreakdown?.totalCost)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insumos do produto principal</Text>
            {(pricingBreakdown?.directFeedstocks || []).length === 0 ? (
              <Text style={styles.emptyText}>Nenhum insumo direto cadastrado.</Text>
            ) : (
              <View style={styles.blockCard}>
                {pricingBreakdown.directFeedstocks.map(feedstock => {
                  const productId = normalizeEntityId(feedstock?.productChild);
                  return (
                    <FeedstockCostRow
                      key={`${productId}-${feedstock?.id || feedstock?.price}`}
                      feedstock={feedstock}
                      latestPurchase={latestPurchases?.[productId]?.[0]}
                      navigation={navigation}
                    />
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grupos obrigatorios</Text>
            {(pricingBreakdown?.groups || []).length === 0 ? (
              <Text style={styles.emptyText}>Nenhum grupo obrigatorio participa do custo.</Text>
            ) : (
              pricingBreakdown.groups.map(groupCost => {
                const optionName =
                  groupCost?.cheapestOption?.productChild?.product ||
                  groupCost?.cheapestOption?.productChild?.name ||
                  'Sem opcao com insumo';

                return (
                  <View key={normalizeEntityId(groupCost?.group)} style={styles.blockCard}>
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupName}>{groupCost?.group?.productGroup || 'Grupo'}</Text>
                        <Text style={styles.groupOption}>Menor custo: {optionName}</Text>
                      </View>
                      <Text style={styles.groupCost}>{formatCurrency(groupCost?.cost)}</Text>
                    </View>

                    {(groupCost?.cheapestOptionFeedstocks || []).length === 0 ? (
                      <Text style={styles.emptyText}>A opcao escolhida nao possui insumos cadastrados.</Text>
                    ) : (
                      groupCost.cheapestOptionFeedstocks.map(feedstock => {
                        const productId = normalizeEntityId(feedstock?.productChild);
                        return (
                          <FeedstockCostRow
                            key={`${normalizeEntityId(groupCost?.group)}-${productId}-${feedstock?.id || feedstock?.price}`}
                            feedstock={feedstock}
                            latestPurchase={latestPurchases?.[productId]?.[0]}
                            navigation={navigation}
                          />
                        );
                      })
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </AnimatedModal>
  );
};

export default ProductPricingModal;
