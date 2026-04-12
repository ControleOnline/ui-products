import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { colors } from '@controleonline/../../src/styles/colors';
import ProductSupplierRelationModal from '@controleonline/ui-products/src/react/components/ProductSupplierRelationModal';

const ROLE_LABELS = {
  supplier: 'Fornecedor',
  manufacturer: 'Fabricante',
  distributor: 'Distribuidor',
};

const extractId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const match = value.match(/(\d+)$/);
    return match ? match[1] : value;
  }
  if (typeof value === 'object') {
    return extractId(value.id || value['@id'] || '');
  }
  return '';
};

const formatMoney = value => {
  if (value === null || value === undefined || value === '') return '';

  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  try {
    return parsed.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  } catch (error) {
    return `R$ ${parsed.toFixed(2)}`;
  }
};

const getSupplierName = supplier =>
  String(supplier?.alias || supplier?.name || `Pessoa #${supplier?.id || ''}`).trim();

const getSupplierSubtitle = supplier => {
  const parts = [];

  if (supplier?.name && supplier?.alias && supplier.name !== supplier.alias) {
    parts.push(String(supplier.name).trim());
  }

  if (supplier?.peopleType) {
    parts.push(supplier.peopleType === 'J' ? 'Pessoa juridica' : 'Pessoa fisica');
  }

  return parts.join(' | ');
};

const buildMeta = relation => {
  const items = [];

  if (relation?.supplierSku) {
    items.push({ label: 'Cod. fornecedor', value: relation.supplierSku });
  }

  if (relation?.costPrice) {
    items.push({ label: 'Custo', value: formatMoney(relation.costPrice) });
  }

  if (relation?.leadTimeDays || relation?.leadTimeDays === 0) {
    items.push({
      label: 'Prazo',
      value: `${relation.leadTimeDays} ${Number(relation.leadTimeDays) === 1 ? 'dia' : 'dias'}`,
    });
  }

  if (relation?.priority || relation?.priority === 0) {
    items.push({ label: 'Prioridade', value: String(relation.priority) });
  }

  return items;
};

const getBackendMessage = error => {
  if (Array.isArray(error?.message)) {
    return error.message.map(item => item?.message || item).join(', ');
  }

  return error?.message || '';
};

const ProductSuppliersTab = ({ product, isLoading = false, onRefresh }) => {
  const navigation = useNavigation();
  const { showDialog, showError, showSuccess } = useMessage();
  const productPeopleStore = useStore('product_people');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null);

  const productId = useMemo(
    () => extractId(product?.id || product?.['@id']),
    [product?.id, product?.['@id']],
  );

  const relations = useMemo(() => {
    const safeRelations = Array.isArray(product?.productPeople) ? [...product.productPeople] : [];

    return safeRelations.sort((left, right) => {
      const leftPriority = Number(left?.priority ?? 9999);
      const rightPriority = Number(right?.priority ?? 9999);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftName = getSupplierName(left?.people).toLowerCase();
      const rightName = getSupplierName(right?.people).toLowerCase();
      return leftName.localeCompare(rightName);
    });
  }, [product?.productPeople]);

  const openSupplier = relation => {
    const supplierId = extractId(relation?.people?.id || relation?.people?.['@id']);
    if (!supplierId) {
      return;
    }

    navigation.push('ClientDetails', {
      client: {
        ...(relation?.people || {}),
        id: supplierId,
      },
      context: {
        context: 'provider',
      },
    });
  };

  const openCreateModal = () => {
    setEditingRelation(null);
    setEditorVisible(true);
  };

  const openEditModal = relation => {
    setEditingRelation(relation || null);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingRelation(null);
  };

  const refreshRelations = async () => {
    await onRefresh?.();
  };

  const handleRemoveRelation = relation => {
    const relationId = extractId(relation?.id || relation?.['@id']);
    if (!relationId) {
      return;
    }

    if (!productPeopleStore?.actions?.remove) {
      showError('Servico de fornecedores do produto indisponivel no momento.');
      return;
    }

    const supplierName = getSupplierName(relation?.people);

    showDialog({
      title: 'Remover vinculo',
      message: `Deseja remover ${supplierName} deste produto?`,
      onConfirm: async () => {
        try {
          await productPeopleStore.actions.remove(relationId);
          showSuccess('Fornecedor removido do produto com sucesso!');
          await refreshRelations();
        } catch (removeError) {
          const backendMessage = getBackendMessage(removeError);
          showError(backendMessage || 'Falha ao remover o fornecedor do produto.');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Carregando fornecedores...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <Icon name="error-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Nao foi possivel carregar o produto</Text>
              <Text style={styles.emptySubtitle}>
                Tente abrir este cadastro novamente para visualizar os fornecedores vinculados.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Fornecedores vinculados</Text>
              <Text style={styles.sectionSubtitle}>
                {relations.length === 1
                  ? '1 relacionamento ativo com este produto'
                  : `${relations.length} relacionamentos ativos com este produto`}
              </Text>
            </View>

            {productId ? (
              <TouchableOpacity style={styles.addButton} onPress={openCreateModal} activeOpacity={0.85}>
                <Icon name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Vincular</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {relations.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="local-shipping" size={24} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Nenhum fornecedor vinculado</Text>
              <Text style={styles.emptySubtitle}>
                Use o botao acima para cadastrar quem fornece este produto e preencher custo,
                prazo e prioridade.
              </Text>

              {productId ? (
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={openCreateModal}
                  activeOpacity={0.85}>
                  <Icon name="add-business" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyActionButtonText}>Cadastrar fornecedor</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            relations.map(relation => {
              const supplier = relation?.people || {};
              const metadata = buildMeta(relation);

              return (
                <View
                  key={String(relation?.id || `${supplier?.id || 'supplier'}-${relation?.priority || 0}`)}
                  style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardAvatar}>
                      <Icon name="storefront" size={20} color={colors.primary} />
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {getSupplierName(supplier)}
                      </Text>

                      {getSupplierSubtitle(supplier) ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {getSupplierSubtitle(supplier)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.badgesRow}>
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>
                        {ROLE_LABELS[relation?.role] || relation?.role || 'Relacionamento'}
                      </Text>
                    </View>

                    {relation?.priority || relation?.priority === 0 ? (
                      <View style={styles.secondaryBadge}>
                        <Text style={styles.secondaryBadgeText}>Prioridade {relation.priority}</Text>
                      </View>
                    ) : null}
                  </View>

                  {metadata.length > 0 ? (
                    <View style={styles.metaWrap}>
                      {metadata.map(item => (
                        <View key={`${relation?.id}-${item.label}`} style={styles.metaPill}>
                          <Text style={styles.metaLabel}>{item.label}</Text>
                          <Text style={styles.metaValue}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => openSupplier(relation)}
                      activeOpacity={0.85}>
                      <Icon name="open-in-new" size={16} color={colors.primary} />
                      <Text style={styles.cardActionText}>Abrir fornecedor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => openEditModal(relation)}
                      activeOpacity={0.85}>
                      <Icon name="edit" size={16} color={colors.primary} />
                      <Text style={styles.cardActionText}>Editar vinculo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.cardActionButtonDanger]}
                      onPress={() => handleRemoveRelation(relation)}
                      activeOpacity={0.85}>
                      <Icon name="delete-outline" size={16} color="#B91C1C" />
                      <Text style={styles.cardActionTextDanger}>Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <ProductSupplierRelationModal
        visible={editorVisible}
        product={product}
        relation={editingRelation}
        relations={relations}
        onClose={closeEditor}
        onSaved={refreshRelations}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyActionButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyActionButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  primaryBadge: {
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  secondaryBadge: {
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  cardActionButtonDanger: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cardActionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cardActionTextDanger: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
});

export default ProductSuppliersTab;
