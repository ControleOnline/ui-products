import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useStore } from '@store';
import ProductFeedStock from './ProductFeedStock';
import { emitProductEvent, PRODUCT_EVENTS } from '@controleonline/ui-products/src/react/domain/productEvents';

const COST_BUCKET_OPTIONS = [
  { value: '', label: 'Bucket custo' },
  { value: 'ingredient', label: 'Insumo' },
  { value: 'packaging', label: 'Embalagem' },
  { value: 'disposable', label: 'Descartável' },
];

const normalizeCostBucket = value => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['ingredient', 'packaging', 'disposable'].includes(normalized) ? normalized : '';
};

const ProductGroupProducts = ({ productGroup, ProductId }) => {
  const productGroupProductStore = useStore('product_group_product');
  const productsStore = useStore('products');
  const peopleStore = useStore('people');

  const store = productGroupProductStore;
  const productsActions = productsStore.actions;
  const { currentCompany } = peopleStore.getters;

  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [currentItems, setCurrentItems] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [newItem, setNewItem] = useState({
    productChild: '',
    price: '',
    quantity: '1',
    costBucket: '',
    incompatibleWith: '',
    substituteFor: '',
    channels: '',
    availableFrom: '',
    availableTo: '',
  });
  const [itemDrafts, setItemDrafts] = useState({});

  const extractItems = response => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
    return [];
  };
  const getItemKey = item => String(item?.id || item?.['@id'] || '');
  const getProductTypeById = productId => {
    const pid = String(productId || '').replace(/\D/g, '');
    if (!pid) return 'component';
    const found = (availableProducts || []).find(p => String(p?.id || '').replace(/\D/g, '') === pid);
    return String(found?.type || 'component');
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
  const productGroupIri = toProductGroupIri(productGroup);
  const productGroupId = String(productGroupIri || '').replace(/\D/g, '');

  const fetchItems = async () => {
    if (!productGroupIri) {
      setCurrentItems([]);
      return [];
    }
    const response = await store.actions.getItems({
      product: `/products/${ProductId}`,
      productGroup: productGroupIri,
    });
    const items = extractItems(response);
    setCurrentItems(items);
    return items;
  };

  useEffect(() => {
    let mounted = true;

    if (!ProductId) {
      // nothing to load yet
      setLoaded(false);
      return () => { mounted = false; };
    }

    setLoaded(false);

    // fetch items for this filter set using getItems
    fetchItems()
      .then(() => {
        if (mounted) setLoaded(true);
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });

    return () => { mounted = false; };
  }, [ProductId, productGroupIri]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    productsActions
      .getItems({
        active: 1,
        company: currentCompany.id,
        type: ['product', 'component', 'feedstock', 'manufactured'],
        'order[product]': 'ASC',
      })
      .then(data => setAvailableProducts(data || []))
      .catch(() => setAvailableProducts([]));
  }, [currentCompany?.id]);

  useEffect(() => {
    const next = {};
    currentItems.forEach(item => {
      const key = String(item.id || item['@id'] || '');
      next[key] = {
        price: String(item.price ?? ''),
        quantity: String(Number(item.quantity) > 0 ? item.quantity : 1),
        costBucket: normalizeCostBucket(item?.extraData?.costBucket),
        incompatibleWith: String(item?.extraData?.incompatibleWith || ''),
        substituteFor: String(item?.extraData?.substituteFor || ''),
        channels: String(item?.extraData?.channels || ''),
        availableFrom: String(item?.extraData?.availableFrom || ''),
        availableTo: String(item?.extraData?.availableTo || ''),
      };
    });
    setItemDrafts(next);
  }, [currentItems]);

  const reloadItems = async () => {
    setLoaded(false);
    await fetchItems();
    setLoaded(true);
  };

  const updateItem = async (item, patch) => {
    setStatus('');
    setError('');
    setIsSaving(true);
    try {
      const nextPrice = parseFloat(String(patch.price ?? item.price ?? 0).replace(',', '.'));
      const nextQty = parseFloat(String(patch.quantity ?? item.quantity ?? 1).replace(',', '.'));
      if (Number.isNaN(nextPrice) || nextPrice < 0) throw new Error('Preço inválido.');
      if (Number.isNaN(nextQty) || nextQty <= 0) throw new Error('Quantidade deve ser maior que zero.');
      const nextCostBucket = normalizeCostBucket(patch?.extraData?.costBucket);
    const payload = {
      ...item,
      ...patch,
      product: item.product || `/products/${ProductId}`,
      productGroup: item.productGroup || productGroupIri,
      productChild: toProductIri(patch.productChild || item.productChild),
      productType: item.productType || String(item?.productChild?.type || 'component'),
      price: nextPrice,
      quantity: nextQty,
      extraData: {
        ...(item.extraData || {}),
        ...(patch.extraData || {}),
        costBucket: nextCostBucket,
      },
    };
    await store.actions.save(payload);
    emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
        productId: ProductId,
        productGroupId,
        source: 'ProductGroupProducts.updateItem',
      });
    await reloadItems();
      setStatus('Componente salvo.');
    } catch (e) {
      setError(e?.message || 'Falha ao salvar componente.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeItem = async item => {
    setStatus('');
    setError('');
    setIsSaving(true);
    try {
    const id = String(item?.id || item?.['@id'] || '').replace(/\D/g, '');
    if (!id) return;
    await store.actions.remove(id);
    emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
      productId: ProductId,
      productGroupId,
      source: 'ProductGroupProducts.removeItem',
    });
    await reloadItems();
      setStatus('Componente removido.');
    } catch (e) {
      setError(e?.message || 'Falha ao remover componente.');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = async () => {
    setStatus('');
    setError('');
    if (!newItem.productChild) return;
    if (!productGroupIri) {
      setError('Grupo inválido para adicionar componente.');
      return;
    }
    const nextPrice = parseFloat(String(newItem.price || '0').replace(',', '.'));
    const nextQty = parseFloat(String(newItem.quantity || '1').replace(',', '.'));
    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      setError('Preço inválido para novo componente.');
      return;
    }
    if (Number.isNaN(nextQty) || nextQty <= 0) {
      setError('Quantidade deve ser maior que zero.');
      return;
    }
    setIsSaving(true);
    try {
    const nextCostBucket = normalizeCostBucket(newItem.costBucket);
    const payload = {
      product: `/products/${ProductId}`,
      productGroup: productGroupIri,
      productChild: `/products/${String(newItem.productChild).replace(/\D/g, '')}`,
      productType: getProductTypeById(newItem.productChild),
      price: nextPrice,
      quantity: nextQty,
      extraData: {
        costBucket: nextCostBucket,
        incompatibleWith: newItem.incompatibleWith || '',
        substituteFor: newItem.substituteFor || '',
        channels: newItem.channels || '',
        availableFrom: newItem.availableFrom || '',
        availableTo: newItem.availableTo || '',
      },
    };
    await store.actions.save(payload);
    emitProductEvent(PRODUCT_EVENTS.BOM_CHANGED, {
      productId: ProductId,
      productGroupId,
      source: 'ProductGroupProducts.addItem',
    });
    setNewItem({
      productChild: '',
      price: '',
      quantity: '1',
      costBucket: '',
      incompatibleWith: '',
      substituteFor: '',
      channels: '',
      availableFrom: '',
      availableTo: '',
    });
    await reloadItems();
      setStatus('Componente adicionado.');
    } catch (e) {
      setError(e?.message || 'Falha ao adicionar componente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!loaded) {
    return <Text style={{ color: '#666', marginTop: 8 }}>Carregando componentes...</Text>;
  }

  return (
    <ScrollView horizontal style={{ marginTop: 12 }}>
      <View style={{ minWidth: 800 }}>
        <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Adicionar Modificador / Componente</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 3, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
              <Picker
                selectedValue={newItem.productChild}
                onValueChange={val => setNewItem(prev => ({ ...prev, productChild: val }))}
              >
                <Picker.Item label="Selecione o produto" value="" />
                {availableProducts.map(p => (
                  <Picker.Item key={p.id} label={p.product || `#${p.id}`} value={String(p.id)} />
                ))}
              </Picker>
            </View>
            <TextInput
              value={String(newItem.price)}
              onChangeText={val => setNewItem(prev => ({ ...prev, price: val }))}
              placeholder="Preço"
              keyboardType="numeric"
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
            />
            <TextInput
              value={String(newItem.quantity)}
              onChangeText={val => setNewItem(prev => ({ ...prev, quantity: val }))}
              placeholder="Qtd"
              keyboardType="numeric"
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
            />
            <TextInput
              value={String(newItem.channels)}
              onChangeText={val => setNewItem(prev => ({ ...prev, channels: val }))}
              placeholder="Canais (csv)"
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
            />
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
              <Picker
                selectedValue={newItem.costBucket}
                onValueChange={val => setNewItem(prev => ({ ...prev, costBucket: val }))}
              >
                <Picker.Item label="Bucket custo" value="" />
                <Picker.Item label="Insumo" value="ingredient" />
                <Picker.Item label="Embalagem" value="packaging" />
                <Picker.Item label="Descartável" value="disposable" />
              </Picker>
            </View>
            <TouchableOpacity
              onPress={addItem}
              disabled={isSaving}
              style={{ backgroundColor: '#000', borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff' }}>{isSaving ? 'Salvando...' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#666', marginTop: 6 }}>
            Quantidade padrão: `1` = um item do modificador por seleção.
          </Text>
        </View>
        {!!status && <Text style={{ color: '#1b7f34', marginBottom: 8 }}>{status}</Text>}
        {!!error && <Text style={{ color: '#b00020', marginBottom: 8 }}>{error}</Text>}

        <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}>
          <Text style={{ flex: 1 }}>ID</Text>
          <Text style={{ flex: 2 }}>Produto</Text>
          <Text style={{ flex: 1 }}>Tipo</Text>
          <Text style={{ flex: 1 }}>Preço</Text>
          <Text style={{ flex: 1 }}>Qtd</Text>
          <Text style={{ width: 80, textAlign: 'center' }}>Ações</Text>
          <Text style={{ width: 90, textAlign: 'center' }}>Remover</Text>
        </View>

          {currentItems.map((item) => {
            const rowKey = getItemKey(item);
            return (
          <View key={rowKey} style={{ borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
            <View style={{ flexDirection: 'row', padding: 10 }}>
              <Text style={{ flex: 1 }}>{rowKey}</Text>
              <Text style={{ flex: 2 }}>
                {(
                  item.productChild?.name ||
                  item.productChild?.product ||
                  item.productChild?.title ||
                  item.productChild?.label ||
                  (item.productChild && (item.productChild.name || item.productChild.product)) ||
                  String(item.productChild?.id || item.productChild?.['@id'] || '')
                )}
              </Text>
              <Text style={{ flex: 1 }}>{item.productChild?.type}</Text>
              <TextInput
                value={itemDrafts[rowKey]?.price ?? String(item.price ?? '')}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      price: val,
                    },
                  }))
                }
                keyboardType="numeric"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, marginHorizontal: 6 }}
              />
              <TextInput
                value={itemDrafts[rowKey]?.quantity ?? String(item.quantity ?? 1)}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      quantity: val,
                    },
                  }))
                }
                keyboardType="numeric"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8, marginHorizontal: 6 }}
              />
              <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  disabled={isSaving}
                  onPress={() =>
                    updateItem(item, {
                      price: itemDrafts[rowKey]?.price ?? item.price,
                      quantity: itemDrafts[rowKey]?.quantity ?? item.quantity,
                      extraData: {
                        costBucket: itemDrafts[rowKey]?.costBucket || '',
                        incompatibleWith: itemDrafts[rowKey]?.incompatibleWith || '',
                        substituteFor: itemDrafts[rowKey]?.substituteFor || '',
                        channels: itemDrafts[rowKey]?.channels || '',
                        availableFrom: itemDrafts[rowKey]?.availableFrom || '',
                        availableTo: itemDrafts[rowKey]?.availableTo || '',
                      },
                    })
                  }
                  style={{ backgroundColor: '#000', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 6 }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>Salvar</Text>
                </TouchableOpacity>
                <ProductFeedStock row={item} componentProps={{ productGroup: productGroupId }} />
              </View>
              <View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  disabled={isSaving}
                  onPress={() => removeItem(item)}
                  style={{ backgroundColor: '#b00020', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10, paddingBottom: 10 }}>
              <View style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 }}>
                <Picker
                  selectedValue={itemDrafts[rowKey]?.costBucket ?? ''}
                  onValueChange={val =>
                    setItemDrafts(prev => ({
                      ...prev,
                      [rowKey]: {
                        ...(prev[rowKey] || {}),
                        costBucket: normalizeCostBucket(val),
                      },
                    }))
                  }
                >
                  {COST_BUCKET_OPTIONS.map(opt => (
                    <Picker.Item key={opt.value || 'none'} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
              <TextInput
                value={itemDrafts[rowKey]?.incompatibleWith ?? ''}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      incompatibleWith: val,
                    },
                  }))
                }
                placeholder="Incompatível com IDs (csv)"
                style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
              />
              <TextInput
                value={itemDrafts[rowKey]?.substituteFor ?? ''}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      substituteFor: val,
                    },
                  }))
                }
                placeholder="Substitui ID"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
              />
              <TextInput
                value={itemDrafts[rowKey]?.channels ?? ''}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      channels: val,
                    },
                  }))
                }
                placeholder="Canais (csv)"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
              />
              <TextInput
                value={itemDrafts[rowKey]?.availableFrom ?? ''}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      availableFrom: val,
                    },
                  }))
                }
                placeholder="De HH:mm"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
              />
              <TextInput
                value={itemDrafts[rowKey]?.availableTo ?? ''}
                onChangeText={val =>
                  setItemDrafts(prev => ({
                    ...prev,
                    [rowKey]: {
                      ...(prev[rowKey] || {}),
                      availableTo: val,
                    },
                  }))
                }
                placeholder="Até HH:mm"
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
              />
            </View>
          </View>
        );
          })}
      </View>
    </ScrollView>
  );
};

export default ProductGroupProducts;
