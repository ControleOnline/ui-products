import React, { useCallback, useState, useMemo, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import InventoryForm from '@controleonline/ui-products/src/react/components/InventoryForm';
import { skeletonStyles, styles } from './Inventories.styles'

import {
  inlineStyle_29_8,
  inlineStyle_98_14,
  inlineStyle_158_22,
  inlineStyle_175_39,
  inlineStyle_223_8,
} from './Inventories.styles';

/* Sentinel para produtos sem local de estoque */
export const NO_INVENTORY_SENTINEL = {
  id: '__no_inventory__',
  '@id': '__no_inventory__',
  inventory: 'Sem Local',
  type: null,
  _isNoInventory: true,
};

const TYPE_CONFIG = {
  default:   { label: 'Padrão',   icon: 'home-outline', color: '#3B82F6', bg: '#EFF6FF' },
  warehouse: { label: 'Depósito', icon: 'warehouse',     color: '#D97706', bg: '#FFFBEB' },
};

const resolveHistoryTitle = (value, fallback) => {
  const normalizedValue = String(value || '').replace(/^Tab\s+/i, '').trim();
  return normalizedValue || fallback;
};

const SkeletonCard = ({ width }) => (
  <View style={inlineStyle_29_8({
    width: width,
  })}>
    <View style={[skeletonStyles.card, { aspectRatio: 1 }]} />
  </View>
);

const InventoriesPage = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const transferHistoryTitle = useMemo(
    () => resolveHistoryTitle(global.t?.t('orders', 'label', 'tab_transfer'), 'Transferências'),
    [],
  );
  const lossHistoryTitle = useMemo(
    () => resolveHistoryTitle(global.t?.t('orders', 'label', 'tab_loss'), 'Perdas'),
    [],
  );

  const inventoriesStore = useStore('inventories');
  const { isLoading: storeLoading } = inventoriesStore.getters;
  const inventoryActions = inventoriesStore.actions;

  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const themeStore = useStore('theme');
  const { colors: themeColors } = themeStore.getters;
  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const [inventories, setInventories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const formRef = useRef(null);

  const loadInventories = useCallback(async () => {
    if (!currentCompany?.id) return;
    try {
      const data = await inventoryActions.getItems({
        people: currentCompany.id,
        'order[inventory]': 'ASC',
      });
      setInventories(data || []);
    } catch {
      setInventories([]);
    }
  }, [currentCompany?.id]);

  useFocusEffect(useCallback(() => { loadInventories(); }, [loadInventories]));

  const openCreate = () => { setSelectedInventory(null); setModalVisible(true); };
  const openEdit   = inv => { setSelectedInventory(inv); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedInventory(null); };
  const openOrderHistory = useCallback(
    (orderTypeFilter, historyTitle) => {
      navigation.navigate('OrderHistoryPage', {
        orderTypeFilter,
        historyTitle,
      });
    },
    [navigation],
  );

  const handleSaved = async () => {
    closeModal();
    await loadInventories();
  };

  const getColumns  = () => width < 640 ? 2 : width < 960 ? 3 : 4;
  const columns     = getColumns();
  const maxW        = Math.min(width, 1280);
  const gap         = 12;
  const cardWidth   = (maxW - (columns + 1) * gap) / columns;

  return (
    <SafeAreaView style={styles.container}>
      {!storeLoading && <StateStore store="inventories" />}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 84 }]}
      >
        <View style={inlineStyle_98_14({
          gap: gap,
          maxW: maxW,
        })}>

          {/* Banners de acesso rápido */}
          <TouchableOpacity
            style={styles.historyBanner}
            onPress={() => navigation.navigate('PurchaseSuggestionsPage')}
            activeOpacity={0.75}
          >
            <View style={styles.historyBannerLeft}>
              <MaterialCommunityIcons name="cart-arrow-down" size={18} color="#16A34A" />
              <Text style={[styles.historyBannerText, { color: '#166534' }]}>Sugestões de Compra</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyBanner, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', marginBottom: 16 }]}
            onPress={() => navigation.navigate('InventoryMovements')}
            activeOpacity={0.75}
          >
            <View style={styles.historyBannerLeft}>
              <MaterialCommunityIcons name="history" size={18} color="#7C3AED" />
              <Text style={styles.historyBannerText}>Histórico de Movimentações</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
            onPress={() => openOrderHistory('loss', lossHistoryTitle)}
            activeOpacity={0.75}
          >
            <View style={styles.historyBannerLeft}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={[styles.historyBannerText, { color: '#B91C1C' }]}>{lossHistoryTitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyBanner, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', marginBottom: 16 }]}
            onPress={() => openOrderHistory('transfer', transferHistoryTitle)}
            activeOpacity={0.75}
          >
            <View style={styles.historyBannerLeft}>
              <MaterialCommunityIcons name="swap-horizontal" size={18} color="#7C3AED" />
              <Text style={[styles.historyBannerText, { color: '#6D28D9' }]}>{transferHistoryTitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Skeleton */}
          {storeLoading && (
            <View style={[styles.grid, { gap }]}>
              {Array.from({ length: columns * 2 }).map((_, i) => (
                <SkeletonCard key={i} width={cardWidth} />
              ))}
            </View>
          )}

          {/* Empty */}
          {!storeLoading && inventories.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons name="warehouse" size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum local de estoque</Text>
              <Text style={styles.emptySubtitle}>
                Adicione o primeiro local para controlar o inventário
              </Text>
            </View>
          )}

          {/* Grid */}
          {!storeLoading && (
            <>
              {inventories.length > 0 && (
                <Text style={styles.countLabel}>
                  {inventories.length} {inventories.length === 1 ? 'local' : 'locais'}
                </Text>
              )}

              <View style={[styles.grid, { gap }]}>
                {/* Card fixo "Sem Local de Estoque" */}
                <View style={inlineStyle_158_22({
                  cardWidth: cardWidth,
                })}>
                  <TouchableOpacity
                    style={styles.cardTouchable}
                    onPress={() => navigation.navigate('InventoryDetail', { inventory: NO_INVENTORY_SENTINEL })}
                    activeOpacity={0.88}
                  >
                    <View style={[styles.noInventoryCard, { aspectRatio: 1 }]}>
                      <MaterialCommunityIcons name="archive-off-outline" size={28} color="#94A3B8" />
                      <Text style={styles.noInventoryName}>{'Sem\nLocal'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Cards dos locais */}
                {inventories.map(inv => {
                  const typeConf = TYPE_CONFIG[inv.type] || TYPE_CONFIG.default;
                  return (
                    <View key={inv.id} style={inlineStyle_175_39({
                      cardWidth: cardWidth,
                    })}>
                      <TouchableOpacity
                        style={styles.cardTouchable}
                        onPress={() => navigation.navigate('InventoryDetail', { inventory: inv })}
                        activeOpacity={0.88}
                      >
                        <View style={[styles.card, { aspectRatio: 1 }]}>
                          <View style={[styles.cardIconWrap, { backgroundColor: typeConf.bg }]}>
                            <MaterialCommunityIcons name={typeConf.icon} size={28} color={typeConf.color} />
                          </View>
                          <Text style={styles.cardName} numberOfLines={2}>{inv.inventory}</Text>
                          <View style={[styles.typeChip, { backgroundColor: typeConf.bg }]}>
                            <Text style={[styles.typeChipText, { color: typeConf.color }]}>
                              {typeConf.label}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => openEdit(inv)}
                            style={styles.editOverlay}
                            activeOpacity={0.75}
                          >
                            <MaterialCommunityIcons name="pencil" size={13} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBarButton, { backgroundColor: brandColors.primary }]}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.bottomBarButtonText}>Adicionar Local</Text>
        </TouchableOpacity>
      </View>
      <AnimatedModal
        visible={modalVisible}
        onRequestClose={closeModal}
        style={inlineStyle_223_8}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedInventory ? 'Editar Local' : 'Novo Local de Estoque'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.headerCloseButton}>
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              <InventoryForm ref={formRef} inventory={selectedInventory} onSaved={handleSaved} />
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={closeModal}>
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: brandColors.primary }]}
              onPress={() => formRef.current?.submit()}
            >
              <Text style={styles.modalSaveButtonText}>
                {selectedInventory ? 'Salvar' : 'Criar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </SafeAreaView>
  );
};

export default InventoriesPage;
