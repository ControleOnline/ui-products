import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useStore } from '@store';
import { SafeAreaView } from 'react-native-safe-area-context';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import InventoryForm from '@controleonline/ui-products/src/react/components/InventoryForm';

const TYPE_CONFIG = {
  default:   { label: 'Padrão',   icon: 'home-outline', color: '#3B82F6', bg: '#EFF6FF' },
  warehouse: { label: 'Depósito', icon: 'warehouse',     color: '#D97706', bg: '#FFFBEB' },
};

const SkeletonCard = ({ width }) => (
  <View style={{ width }}>
    <View style={[skeletonStyles.card, { aspectRatio: 1 }]} />
  </View>
);

const InventoriesPage = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

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

  const [loading, setLoading] = useState(true);
  const [inventories, setInventories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const formRef = useRef(null);

  const loadInventories = useCallback(async () => {
    if (!currentCompany?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await inventoryActions.getItems({
        people: currentCompany.id,
        'order[inventory]': 'ASC',
      });
      setInventories(data || []);
    } catch (_) {
      setInventories([]);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useFocusEffect(useCallback(() => { loadInventories(); }, [loadInventories]));

  const openCreate = () => { setSelectedInventory(null); setModalVisible(true); };
  const openEdit = inv => { setSelectedInventory(inv); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedInventory(null); };

  const handleSaved = async () => {
    closeModal();
    await loadInventories();
  };

  const getColumns = () => {
    if (width < 640) return 2;
    if (width < 960) return 3;
    return 4;
  };
  const columns = getColumns();
  const maxContentWidth = 1280;
  const containerWidth = Math.min(width, maxContentWidth);
  const gap = 12;
  const cardWidth = (containerWidth - (columns + 1) * gap) / columns;

  return (
    <SafeAreaView style={styles.container}>
      {!loading && !storeLoading && <StateStore store="inventories" />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 84 }]}
      >
        <View style={{ width: containerWidth, paddingHorizontal: gap / 2, paddingTop: 16 }}>

          {/* Skeleton */}
          {loading && (
            <View style={[styles.grid, { gap }]}>
              {Array.from({ length: columns * 2 }).map((_, i) => (
                <SkeletonCard key={i} width={cardWidth} />
              ))}
            </View>
          )}

          {/* Empty */}
          {!loading && inventories.length === 0 && (
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
          {!loading && inventories.length > 0 && (
            <>
              <Text style={styles.countLabel}>
                {inventories.length} {inventories.length === 1 ? 'local' : 'locais'}
              </Text>
              <View style={[styles.grid, { gap }]}>
                {inventories.map(inv => {
                  const typeConf = TYPE_CONFIG[inv.type] || TYPE_CONFIG.default;
                  return (
                    <View key={inv.id} style={{ width: cardWidth }}>
                      <TouchableOpacity
                        style={styles.cardTouchable}
                        onPress={() => navigation.navigate('InventoryDetail', { inventory: inv })}
                        activeOpacity={0.88}
                      >
                        <View style={[styles.card, { aspectRatio: 1 }]}>
                          <View style={[styles.cardIconWrap, { backgroundColor: typeConf.bg }]}>
                            <MaterialCommunityIcons
                              name={typeConf.icon}
                              size={28}
                              color={typeConf.color}
                            />
                          </View>

                          <Text style={styles.cardName} numberOfLines={2}>
                            {inv.inventory}
                          </Text>

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

      {/* Botão Adicionar */}
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

      {/* Modal criar/editar */}
      <AnimatedModal
        visible={modalVisible}
        onRequestClose={closeModal}
        style={{ justifyContent: 'flex-end' }}
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
              <InventoryForm
                ref={formRef}
                inventory={selectedInventory}
                onSaved={handleSaved}
              />
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

const skeletonStyles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },

  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  cardTouchable: { width: '100%' },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    }),
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 17,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    ...Platform.select({
      web: { boxShadow: '0 -2px 16px rgba(0,0,0,0.07)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { padding: 24 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default InventoriesPage;
