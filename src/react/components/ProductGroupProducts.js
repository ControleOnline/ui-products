import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import ProductFeedStock from './ProductFeedStock';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';

/*
 * Hierarquia de dados (confirmada via banco):
 *
 * product_group_product.product_type  →  enum: 'feedstock' | 'component' | 'package'
 *
 * O campo "productType" aqui é diferente do "type" do produto filho:
 *  - product.type = 'product' | 'component' | 'feedstock' | 'manufactured' | 'custom' | 'service' | 'package'
 *  - product_group_product.product_type = 'feedstock' | 'component' | 'package'
 *
 * Mapeamento:
 *  product.type 'feedstock'           → productGroupProduct.productType 'feedstock'
 *  product.type 'package'             → productGroupProduct.productType 'package'
 *  qualquer outro (product/component/manufactured/etc) → productGroupProduct.productType 'component'
 */
/* Extrai sigla da unidade de medida do produto */
const extractUnit = p => {
  if (!p) return '';
  // API retorna productUnit.productUnit (campo homônimo dentro do objeto ProductUnity)
  const u = p?.productUnit?.productUnit || p?.productUnit?.unit || p?.productUnity?.productUnit || p?.productUnity?.unit || p?.unit;
  return u ? String(u).toUpperCase() : '';
};

const toGroupProductType = productType => {
  if (productType === 'feedstock') return 'feedstock';
  if (productType === 'package') return 'package';
  return 'component';
};

const TYPE_LABELS = {
  product: 'Produto',
  component: 'Componente',
  feedstock: 'Insumo',
  manufactured: 'Fabricado',
  package: 'Embalagem',
  custom: 'Personalizado',
  service: 'Serviço',
};

const toProductIri = value => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value.startsWith('/products/')) return value;
    const id = String(value).replace(/\D/g, '');
    return id ? `/products/${id}` : null;
  }
  const id = value?.id || String(value?.['@id'] || '').replace(/\D/g, '');
  return id ? `/products/${id}` : null;
};

const toProductGroupIri = value => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value.startsWith('/product_groups/')) return value;
    const id = String(value).replace(/\D/g, '');
    return id ? `/product_groups/${id}` : null;
  }
  const id = value?.id || String(value?.['@id'] || '').replace(/\D/g, '');
  return id ? `/product_groups/${id}` : null;
};

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

/* ─── Skeleton ─── */
const SkeletonLine = ({ width = '100%', height = 14, mb = 8 }) => (
  <View style={{ width, height, borderRadius: 7, backgroundColor: '#E2E8F0', marginBottom: mb }} />
);

/* ─── Modal de busca de produto ─── */
const ProductSearchModal = ({ visible, onClose, onSelect, products, brandColors, title, excludeId }) => {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => {
    /* anti-loop: exclui o próprio produto da lista */
    if (excludeId && String(p.id) === String(excludeId)) return false;
    const name = String(p.product || p.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });
  const handleClose = () => { setSearch(''); onClose(); };
  return (
    <AnimatedModal visible={visible} onRequestClose={handleClose}>
      <View style={styles.searchModal}>
        <View style={styles.searchModalHeader}>
          <Text style={styles.searchModalTitle}>{title || 'Selecionar produto'}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.searchModalClose}>
            <MaterialCommunityIcons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar produto..."
            placeholderTextColor="#CBD5E1"
            style={styles.searchInput}
            autoFocus={visible}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <View style={styles.searchEmpty}>
              <MaterialCommunityIcons name="package-variant-remove" size={36} color="#CBD5E1" />
              <Text style={styles.searchEmptyText}>Nenhum produto encontrado</Text>
            </View>
          )}
          {filtered.map(p => {
            const typeLabel = TYPE_LABELS[p.type] || p.type || '';
            return (
              <TouchableOpacity
                key={String(p.id)}
                style={styles.searchResultItem}
                onPress={() => { setSearch(''); onSelect(p); }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {p.product || p.name || `#${p.id}`}
                  </Text>
                  {!!typeLabel && <Text style={styles.searchResultType}>{typeLabel}</Text>}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </AnimatedModal>
  );
};

/* ─── Modal de formulário add/editar item ─── */
const ItemFormModal = ({
  visible, title, draft, onClose, onSave, saving, error,
  fieldErrors, onChangeDraft, brandColors,
}) => {
  if (!draft) return null;

  const inputStyle = field => [
    styles.input,
    fieldErrors?.[field] && styles.inputError,
  ];

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={{ justifyContent: 'flex-end' }}>
      <View style={styles.formModal}>
        <View style={styles.formModalHeader}>
          <Text style={styles.formModalTitle} numberOfLines={1}>{title || 'Modificador'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.formModalClose}>
            <MaterialCommunityIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formModalBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#9e1b1b" style={{ marginRight: 6 }} />
                <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
              </View>
            )}

            {!!draft.productName && (
              <View style={[styles.fieldWrap, { marginBottom: 16 }]}>
                <Text style={styles.fieldLabel}>Produto</Text>
                <View style={styles.productReadonly}>
                  <MaterialCommunityIcons name="package-variant-closed" size={16} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={styles.productReadonlyText} numberOfLines={2}>{draft.productName}</Text>
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>
                  Preço (R$) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={String(draft.price)}
                  onChangeText={v => onChangeDraft('price', v)}
                  keyboardType="numeric"
                  style={inputStyle('price')}
                  placeholder="0,00"
                  placeholderTextColor="#CBD5E1"
                />
                {!!fieldErrors?.price && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.price}</Text>
                )}
              </View>
              <View style={[styles.halfField, { marginBottom: 14 }]}>
                <Text style={styles.fieldLabel}>
                  Qtd{draft.productUnit ? ` (${draft.productUnit})` : ''} <Text style={styles.required}>*</Text>
                </Text>
                <View style={[inputStyle('quantity'), styles.quantityRow]}>
                  <TextInput
                    value={String(draft.quantity)}
                    onChangeText={v => onChangeDraft('quantity', v)}
                    keyboardType="numeric"
                    style={styles.quantityInput}
                    placeholder="1"
                    placeholderTextColor="#CBD5E1"
                  />
                  {!!draft.productUnit && (
                    <Text style={styles.unitInline}>{draft.productUnit}</Text>
                  )}
                </View>
                {!!fieldErrors?.quantity && (
                  <Text style={styles.fieldErrorText}>{fieldErrors.quantity}</Text>
                )}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.productReadonly}>
                <MaterialCommunityIcons name="tag-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                <Text style={styles.productReadonlyText}>
                  {TYPE_LABELS[draft.productType] || draft.productType || 'Componente'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.formModalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: brandColors?.primary || '#3B82F6' }, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

/* ─── Card de item do grupo ─── */
const ItemCard = ({ item, onEdit, onRemove, brandColors, productGroupIri }) => {
  const name =
    item.productChild?.name ||
    item.productChild?.product ||
    item.productChild?.title ||
    String(item.productChild?.id || item.productChild?.['@id'] || '');
  const type = item.productChild?.type || item.productType || '';
  const typeLabel = TYPE_LABELS[type] || type;
  const price = parseFloat(item.price ?? 0)
    .toFixed(2)
    .replace('.', ',');
  const qty = item.quantity ?? 1;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemCardRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.itemCardName} numberOfLines={2}>{name}</Text>
          {!!typeLabel && (
            <View style={styles.itemCardBadges}>
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{typeLabel}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.itemCardRight}>
          <View style={styles.itemPriceWrap}>
            <Text style={styles.itemPrice}>R$ {price}</Text>
            <Text style={styles.itemQty}>× {qty}</Text>
          </View>
          <View style={styles.itemCardActions}>
            <TouchableOpacity
              style={styles.itemActionBtn}
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.itemActionBtn, { backgroundColor: '#FFF1F1' }]}
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Insumos do componente (feedstock) */}
      <ProductFeedStock
        row={item}
        productGroupIri={productGroupIri}
        brandColors={brandColors}
      />
    </View>
  );
};

/* ─── Componente principal ─── */
const ProductGroupProducts = ({ productGroup, ProductId, brandColors }) => {
  const productGroupProductStore = useStore('product_group_product');
  const productsStore = useStore('products');
  const peopleStore = useStore('people');

  const { currentCompany } = peopleStore.getters;

  const productGroupIri = toProductGroupIri(productGroup);
  const productGroupId = String(productGroupIri || '').replace(/\D/g, '');

  const [loaded, setLoaded] = useState(false);
  const [currentItems, setCurrentItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  /* modais */
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formDraft, setFormDraft] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!productGroupIri) { setCurrentItems([]); return []; }
    const response = await productGroupProductStore.actions.getItems({
      product: `/products/${ProductId}`,
      productGroup: productGroupIri,
    });
    const items = extractItems(response);
    setCurrentItems(items);
    return items;
  }, [productGroupIri, ProductId]);

  useEffect(() => {
    if (!ProductId) { setLoaded(false); return; }
    setLoaded(false);
    fetchItems()
      .then(() => setLoaded(true))
      .catch(() => setLoaded(true));
  }, [ProductId, productGroupIri]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    productsStore.actions
      .getItems({
        active: 1,
        company: currentCompany.id,
        'order[product]': 'ASC',
      })
      .then(data => setAvailableProducts(data || []))
      .catch(() => setAvailableProducts([]));
  }, [currentCompany?.id]);

  const reloadItems = async () => {
    setLoaded(false);
    await fetchItems();
    setLoaded(true);
  };

  /* ── Produto selecionado na busca → busca completo para obter productUnit aninhado ── */
  const handleProductSelected = async product => {
    setSearchModalVisible(false);

    /* segurança: feedstock não pode ser modificador de nível 1 */
    if (product.type === 'feedstock') {
      setFormError('Insumos não podem ser adicionados como modificadores. Adicione-os na seção de insumos do componente.');
      setFormModalVisible(true);
      setFormDraft(null);
      return;
    }

    let full = product;
    try {
      const data = await productsStore.actions.get(product.id);
      if (data) full = data;
    } catch { /* usa dados parciais se falhar */ }

    setEditingItem(null);
    setFormDraft({
      productChild: String(full.id),
      productName: full.product || full.name || `#${full.id}`,
      productType: toGroupProductType(full.type),
      productUnit: extractUnit(full),
      price: '0',
      quantity: '1',
    });
    setFormError('');
    setFieldErrors({});
    setFormModalVisible(true);
  };

  /* ── Editar item existente ── */
  const openEditItemModal = item => {
    const name =
      item.productChild?.name ||
      item.productChild?.product ||
      item.productChild?.title ||
      String(item.productChild?.id || '');
    setEditingItem(item);
    setFormDraft({
      productChild: String(item.productChild?.id || ''),
      productName: name,
      productType: item.productType || toGroupProductType(item.productChild?.type),
      productUnit: extractUnit(item.productChild),
      price: String(item.price ?? '0'),
      quantity: String(Number(item.quantity) > 0 ? item.quantity : 1),
    });
    setFormError('');
    setFieldErrors({});
    setFormModalVisible(true);
  };

  const closeFormModal = () => {
    setFormModalVisible(false);
    setEditingItem(null);
    setFormDraft(null);
    setFormError('');
    setFieldErrors({});
  };

  const handleChangeDraft = (field, value) => {
    setFormDraft(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  /* ── Validação por campo ── */
  const validateForm = draft => {
    const errs = {};
    const price = parseFloat(String(draft.price ?? '').replace(',', '.'));
    const qty = parseFloat(String(draft.quantity ?? '').replace(',', '.'));

    if (String(draft.price ?? '').trim() === '') {
      errs.price = 'Obrigatório. Use 0 para gratuito.';
    } else if (Number.isNaN(price) || price < 0) {
      errs.price = 'Valor inválido.';
    }

    if (String(draft.quantity ?? '').trim() === '') {
      errs.quantity = 'Obrigatória.';
    } else if (Number.isNaN(qty) || qty <= 0) {
      errs.quantity = 'Deve ser maior que zero.';
    }

    return errs;
  };

  /* ── Salvar (add ou edit) ── */
  const handleSaveForm = async () => {
    if (!formDraft) return;
    setFormError('');

    const errs = validateForm(formDraft);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    const nextPrice = parseFloat(String(formDraft.price).replace(',', '.'));
    const nextQty = parseFloat(String(formDraft.quantity).replace(',', '.'));

    setFormSaving(true);
    try {
      let payload;
      if (editingItem) {
        /*
         * PUT: incluir id para que o store use o método PUT.
         * Não incluir extraData (não existe na tabela product_group_product).
         */
        payload = {
          id: editingItem.id,
          product: toProductIri(editingItem.product) || `/products/${ProductId}`,
          productGroup: toProductGroupIri(editingItem.productGroup) || productGroupIri,
          productChild: toProductIri(editingItem.productChild),
          productType: editingItem.productType || toGroupProductType(editingItem.productChild?.type),
          price: nextPrice,
          quantity: nextQty,
          active: editingItem.active ?? true,
        };
      } else {
        /*
         * POST: campos obrigatórios conforme entidade PHP.
         * product_type enum: 'feedstock' | 'component' | 'package'
         */
        payload = {
          product: `/products/${ProductId}`,
          productGroup: productGroupIri,
          productChild: `/products/${String(formDraft.productChild).replace(/\D/g, '')}`,
          productType: formDraft.productType,
          price: nextPrice,
          quantity: nextQty,
        };
      }

      await productGroupProductStore.actions.save(payload);
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: editingItem
          ? 'ProductGroupProducts.updateItem'
          : 'ProductGroupProducts.addItem',
      });
      await reloadItems();
      closeFormModal();
    } catch (e) {
      const raw =
        e?.response?.data?.['hydra:description'] ||
        e?.response?.data?.detail ||
        e?.message || '';

      /* trata erro de duplicata (constraint único no banco) */
      if (raw.toLowerCase().includes('duplicate') || raw.toLowerCase().includes('unique')) {
        setFormError('Este produto já foi adicionado a este grupo.');
      } else {
        setFormError(raw || 'Falha ao salvar. Verifique os dados e tente novamente.');
      }
    } finally {
      setFormSaving(false);
    }
  };

  /* ── Remover item ── */
  const handleConfirmRemove = async () => {
    if (!confirmDeleteItem) return;
    const id = String(
      confirmDeleteItem?.id || confirmDeleteItem?.['@id'] || '',
    ).replace(/\D/g, '');
    if (!id) { setConfirmDeleteItem(null); return; }
    setRemoving(true);
    try {
      await productGroupProductStore.actions.remove(id);
      emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: 'ProductGroupProducts.removeItem',
      });
      await reloadItems();
    } catch {
      /* silent */
    } finally {
      setRemoving(false);
      setConfirmDeleteItem(null);
    }
  };

  /* ── Render ── */
  if (!loaded) {
    return (
      <View style={{ padding: 16 }}>
        <SkeletonLine width="50%" height={12} mb={10} />
        <SkeletonLine height={60} mb={6} />
        <SkeletonLine height={60} mb={0} />
      </View>
    );
  }

  const deleteItemName =
    confirmDeleteItem?.productChild?.product ||
    confirmDeleteItem?.productChild?.name ||
    confirmDeleteItem?.productChild?.title ||
    'este item';

  return (
    <View style={styles.container}>
      {/* Lista de itens como cards */}
      {currentItems.length === 0 && (
        <View style={styles.emptyItems}>
          <MaterialCommunityIcons name="food-variant-off" size={26} color="#CBD5E1" />
          <Text style={styles.emptyItemsText}>Nenhum modificador adicionado</Text>
        </View>
      )}

      {currentItems.map((item, index) => {
        const key = String(item?.id || item?.['@id'] || index);
        return (
          <ItemCard
            key={key}
            item={item}
            onEdit={() => openEditItemModal(item)}
            onRemove={() => setConfirmDeleteItem(item)}
            brandColors={brandColors}
            productGroupIri={productGroupIri}
          />
        );
      })}

      {/* Botão adicionar */}
      <TouchableOpacity
        style={[styles.addItemBtn, { borderColor: brandColors?.primary || '#64748B' }]}
        onPress={() => setSearchModalVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={18}
          color={brandColors?.primary || '#64748B'}
        />
        <Text style={[styles.addItemBtnText, { color: brandColors?.primary || '#64748B' }]}>
          Adicionar modificador / componente
        </Text>
      </TouchableOpacity>

      {/* Modal: busca de produto */}
      <ProductSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSelect={handleProductSelected}
        products={availableProducts}
        brandColors={brandColors}
        excludeId={ProductId}
      />

      {/* Modal: formulário add/editar */}
      <ItemFormModal
        visible={formModalVisible}
        title={
          editingItem
            ? 'Editar modificador'
            : `Adicionar: ${formDraft?.productName || ''}`
        }
        draft={formDraft}
        onClose={closeFormModal}
        onSave={handleSaveForm}
        saving={formSaving}
        error={formError}
        fieldErrors={fieldErrors}
        onChangeDraft={handleChangeDraft}
        brandColors={brandColors}
      />

      {/* Modal: confirmar exclusão */}
      <AnimatedModal
        visible={!!confirmDeleteItem}
        onRequestClose={() => setConfirmDeleteItem(null)}
        style={{ justifyContent: 'flex-end' }}
      >
        <View style={styles.confirmModal}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={36}
            color="#EF4444"
            style={{ alignSelf: 'center', marginBottom: 10 }}
          />
          <Text style={styles.confirmTitle}>Remover modificador?</Text>
          <Text style={styles.confirmSubtitle}>
            <Text style={{ fontWeight: '700' }}>{deleteItemName}</Text> será removido do grupo.
            Esta ação não pode ser desfeita.
          </Text>
          <View style={styles.confirmFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDeleteItem(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, removing && { opacity: 0.6 }]}
              onPress={handleConfirmRemove}
              disabled={removing}
            >
              <Text style={styles.deleteBtnText}>{removing ? 'Removendo...' : 'Remover'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  /* ─── item card ─── */
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemCardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  itemBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  itemCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemPriceWrap: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 11,
    color: '#94A3B8',
  },
  itemCardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  itemActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── botão adicionar ─── */
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* ─── vazio ─── */
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  /* ─── modal busca ─── */
  searchModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: 12,
    color: '#94A3B8',
  },

  /* ─── modal formulário ─── */
  formModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  formModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formModalBody: {
    padding: 24,
  },
  formModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* ─── produto readonly ─── */
  productReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  productReadonlyText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },

  /* ─── fields ─── */
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfField: { flex: 1 },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  quantityInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  unitInline: { fontSize: 13, fontWeight: '700', color: '#94A3B8', paddingLeft: 6 },

  /* ─── botões ─── */
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* ─── erro ─── */
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: { color: '#9e1b1b', fontSize: 14 },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  required: {
    color: '#EF4444',
    fontSize: 11,
  },

  /* ─── confirmar exclusão ─── */
  confirmModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmFooter: { flexDirection: 'row', gap: 12 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ProductGroupProducts;
