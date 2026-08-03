import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import ProductSupplierRelationModal from '@controleonline/ui-products/src/react/components/ProductSupplierRelationModal';
import styles from './ProductSuppliersTab.styles';

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
  const themeStore = useStore('theme');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState(null);
  const themeColors = themeStore?.getters?.colors || {};

  const buttonPalette = useMemo(() => ({
    buttonBackground: themeColors.buttonBackground,
    buttonBorder: themeColors.buttonBorder,
    buttonText: themeColors.buttonText,
    buttonIcon: themeColors.buttonIcon || themeColors.buttonText,
    buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
    buttonBorderSecondary: themeColors.buttonBorderSecondary,
    buttonTextSecondary: themeColors.buttonTextSecondary,
    buttonIconSecondary: themeColors.buttonIconSecondary || themeColors.buttonTextSecondary,
    iconDanger: themeColors.iconDanger,
    textDanger: themeColors.textDanger,
    iconDisabled: themeColors.iconDisabled,
    cardIconBackground: themeColors.cardIconBackground,
  }), [
    themeColors.buttonBackground,
    themeColors.buttonBackgroundSecondary,
    themeColors.buttonBorder,
    themeColors.buttonBorderSecondary,
    themeColors.buttonIcon,
    themeColors.buttonIconSecondary,
    themeColors.buttonText,
    themeColors.buttonTextSecondary,
    themeColors.cardIconBackground,
    themeColors.iconDanger,
    themeColors.iconDisabled,
    themeColors.textDanger,
  ]);

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
        <ActivityIndicator color={buttonPalette.buttonIcon} />
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
              <Icon name="error-outline" size={22} color={buttonPalette.iconDisabled} />
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
              <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    backgroundColor: buttonPalette.buttonBackground,
                    borderColor: buttonPalette.buttonBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={openCreateModal}
                activeOpacity={0.85}
              >
                <Icon name="add" size={18} color={buttonPalette.buttonIcon} />
                <Text style={[styles.addButtonText, { color: buttonPalette.buttonText }]}>Vincular</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {relations.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="local-shipping" size={24} color={buttonPalette.iconDisabled} />
              <Text style={styles.emptyTitle}>Nenhum fornecedor vinculado</Text>
              <Text style={styles.emptySubtitle}>
                Use o botao acima para cadastrar quem fornece este produto e preencher custo,
                prazo e prioridade.
              </Text>

              {productId ? (
                <TouchableOpacity
                  style={[
                    styles.emptyActionButton,
                    {
                      backgroundColor: buttonPalette.buttonBackground,
                      borderColor: buttonPalette.buttonBorder,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={openCreateModal}
                  activeOpacity={0.85}>
                  <Icon name="add-business" size={18} color={buttonPalette.buttonIcon} />
                  <Text style={[styles.emptyActionButtonText, { color: buttonPalette.buttonText }]}>Cadastrar fornecedor</Text>
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
                    <View style={[styles.cardAvatar, { backgroundColor: buttonPalette.cardIconBackground }] }>
                      <Icon name="storefront" size={20} color={buttonPalette.buttonIconSecondary} />
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
                      style={[
                        styles.cardActionButton,
                        {
                          backgroundColor: buttonPalette.buttonBackgroundSecondary,
                          borderColor: buttonPalette.buttonBorderSecondary,
                        },
                      ]}
                      onPress={() => openSupplier(relation)}
                      activeOpacity={0.85}>
                      <Icon name="open-in-new" size={16} color={buttonPalette.buttonIconSecondary} />
                      <Text style={[styles.cardActionText, { color: buttonPalette.buttonTextSecondary }]}>Abrir fornecedor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cardActionButton,
                        {
                          backgroundColor: buttonPalette.buttonBackgroundSecondary,
                          borderColor: buttonPalette.buttonBorderSecondary,
                        },
                      ]}
                      onPress={() => openEditModal(relation)}
                      activeOpacity={0.85}>
                      <Icon name="edit" size={16} color={buttonPalette.buttonIconSecondary} />
                      <Text style={[styles.cardActionText, { color: buttonPalette.buttonTextSecondary }]}>Editar vinculo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cardActionButton,
                        styles.cardActionButtonDanger,
                        {
                          backgroundColor: buttonPalette.buttonBackgroundSecondary,
                          borderColor: buttonPalette.buttonBorderSecondary,
                        },
                      ]}
                      onPress={() => handleRemoveRelation(relation)}
                      activeOpacity={0.85}>
                      <Icon name="delete-outline" size={16} color={buttonPalette.iconDanger} />
                      <Text style={[styles.cardActionTextDanger, { color: buttonPalette.textDanger }]}>Remover</Text>
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

export default ProductSuppliersTab;
