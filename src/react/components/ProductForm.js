import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Carousel from '@controleonline/ui-products/src/react/components/products/Carousel'
import { useNavigation } from '@react-navigation/native';

const ProductForm = ({ route, ProductId: propProductId }) => {
  const navigation = useNavigation();
  const { ProductId: routeProductId } = route.params || {};
  const ProductId = propProductId || routeProductId;
  const { width } = useWindowDimensions();

  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const productUnitStore = useStore('product_unit');
  const queuesStore = useStore('queues');
  const inventoriesStore = useStore('inventories');
  const { actions: productActions } = productsStore;
  const { getters: peopleGetters } = peopleStore;
  const { getters: productUnitGetters } = productUnitStore;
  const { getters: queuesGetters } = queuesStore;
  const { getters: inventoriesGetters } = inventoriesStore;

  const { currentCompany } = peopleGetters;

  const [product, setProduct] = useState(null);

  const isDesktop = width >= 768;

  const carouselConfigs = useMemo(
    () => ({
      store: 'product_file',
      isAdmin: true,
      context: 'products',
      zoom: false,
    }),
    [],
  );

  const getData = useCallback(() => {
    if (ProductId) {
      productActions.get(ProductId).then(data => {
        // normalize relational fields to ids for form controls
        const normalize = v => {
          if (!v && v !== 0) return '';
          if (typeof v === 'number') return v;
          if (typeof v === 'string') {
            const m = String(v).match(/(\d+)$/);
            return m ? m[1] : v;
          }
          if (typeof v === 'object') return v.id || v['@id'] || '';
          return v;
        };

        const normalized = { ...data };
        normalized.productUnit = normalize(data.productUnit);
        normalized.queue = normalize(data.queue);
        normalized.company = normalize(data.company);
        normalized.defaultOutInventory = normalize(data.defaultOutInventory);
        normalized.defaultInInventory = normalize(data.defaultInInventory);
        setProduct(normalized);
      });
    } else {
      // initialize a new product when creating
      setProduct(prev => {
        if (prev) return prev;
        return {
          sku: '',
          product: '',
          description: '',
          productUnit: '',
          type: 'product',
          productCondition: '',
          price: 0,
          // initialize company as id to match Picker options
          company: currentCompany?.id || '',
          active: true,
        };
      });
    }
  }, [ProductId, currentCompany]);

  useEffect(() => {
    getData();
  }, [getData]);
  
  // load related lists from backend when form loads (respect currentCompany)
  const [listsRequested, setListsRequested] = useState({ units: false, queues: false, inventories: false });
  useEffect(() => {
    const companyId = currentCompany?.id;

    // product units
    if (
      productUnitStore &&
      productUnitStore.actions &&
      (!productUnitGetters.items || productUnitGetters.items.length === 0) &&
      !listsRequested.units
    ) {
      setListsRequested(prev => ({ ...prev, units: true }));
      productUnitStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    // queues
    if (
      queuesStore &&
      queuesStore.actions &&
      (!queuesGetters.items || queuesGetters.items.length === 0) &&
      !listsRequested.queues
    ) {
      setListsRequested(prev => ({ ...prev, queues: true }));
      queuesStore.actions.getItems({ company: companyId }).catch(() => {});
    }

    // inventories
    if (
      inventoriesStore &&
      inventoriesStore.actions &&
      (!inventoriesGetters.items || inventoriesGetters.items.length === 0) &&
      !listsRequested.inventories
    ) {
      setListsRequested(prev => ({ ...prev, inventories: true }));
      inventoriesStore.actions.getItems({ company: companyId }).catch(() => {});
    }
    // only re-run when company changes or getters change
  }, [currentCompany?.id]);
  // rely on stores' default actions/getters; no local fetching needed

  const handleChange = (field, value) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  };
  const handleSave = () => {
    if (!product) return;

    // Prepare payload converting list fields to uri format expected by API
    const payload = { ...product };

    const listFieldMap = {
      productUnit: 'product_unities',
      queue: 'queues',
    };

    Object.keys(listFieldMap).forEach(field => {
      if (payload[field]) {
        const val = String(payload[field]);
        if (!val.startsWith('/')) {
          payload[field] = `/${listFieldMap[field]}/${val}`;
        }
      }
    });

    // ensure company is sent as IRI (string) if user/consumer set an id
    if (payload.company && typeof payload.company === 'number') {
      payload.company = `/people/${payload.company}`;
    } else if (payload.company && typeof payload.company === 'string' && !payload.company.startsWith('/')) {
      // if company contains just an id string, convert to IRI
      const maybeId = payload.company.replace(/[^0-9]/g, '');
      if (maybeId) payload.company = `/people/${maybeId}`;
    }

    // ensure active is boolean
    if (payload.active !== undefined) {
      if (typeof payload.active === 'boolean') {
        // ok
      } else if (typeof payload.active === 'number') {
        payload.active = payload.active === 1;
      } else if (typeof payload.active === 'string') {
        payload.active = payload.active === '1' || payload.active.toLowerCase() === 'true';
      } else {
        payload.active = Boolean(payload.active);
      }
    }

    // ensure numeric fields have correct types
    if (payload.price !== undefined) {
      const raw = String(payload.price).replace(',', '.');
      const f = parseFloat(raw);
      payload.price = Number.isNaN(f) ? 0 : f;
    }

    productActions.save(payload).then(data => {
      if (data) {
        setProduct(data);
        // if we created a new product, notify parent route so tabs receive ProductId
        if (!propProductId) {
          const newId = data.id || (data['@id'] && String(data['@id']).split('/').pop());
          if (newId) {
            const parent = navigation.getParent();
            if (parent && parent.setParams) parent.setParams({ ProductId: newId });
          }
        }
      }
    });
  };

  if (!product) return null;

  // Campos estáticos: TextInput para textos e Picker para listas

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StateStore store="products" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 16,
          }}
        >
          {product?.id && (
            <View
              style={{
                width: isDesktop ? '20%' : '100%',
              }}
            >
              <Carousel
                images={product.productFiles || []}
                style={{ flex: 1 }}
              />
            </View>
          )}

          <View
            style={{
              width: product?.id
                ? isDesktop
                  ? '80%'
                  : '100%'
                : '100%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {/* Explicit form fields (do not read columns from store) */}
            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>sku</Text>
              <TextInput
                value={String(product.sku || '')}
                onChangeText={val => handleChange('sku', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>product</Text>
              <TextInput
                value={String(product.product || '')}
                onChangeText={val => handleChange('product', val)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '100%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>description</Text>
              <TextInput
                value={String(product.description || '')}
                onChangeText={val => handleChange('description', val)}
                multiline
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12, minHeight: 80 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>price</Text>
              <TextInput
                value={String(product.price || '')}
                onChangeText={val => handleChange('price', val)}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}
              />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>productUnit</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.productUnit || ''} onValueChange={val => handleChange('productUnit', val)}>
                  <Picker.Item label="" value="" />
                  {(productUnitGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.productUnit || opt.name || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>queue</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.queue || ''} onValueChange={val => handleChange('queue', val)}>
                  <Picker.Item label="" value="" />
                  {(queuesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.queue || opt.name || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>type</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.type || 'product'} onValueChange={val => handleChange('type', val)}>
                  <Picker.Item label="Produto" value="product" />
                  <Picker.Item label="Serviço" value="service" />
                  <Picker.Item label="Componente" value="component" />
                  <Picker.Item label="Matéria Prima" value="feedstock" />
                  <Picker.Item label="Embalagem" value="package" />
                  <Picker.Item label="Custom" value="custom" />
                  <Picker.Item label="Manufactured" value="manufactured" />
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>productCondition</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.productCondition || 'new'} onValueChange={val => handleChange('productCondition', val)}>
                  <Picker.Item label="Novo" value="new" />
                  <Picker.Item label="Usado" value="used" />
                  <Picker.Item label="Recondicionado" value="recondicioned" />
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ flex: 1 }}>featured</Text>
              <Switch value={Boolean(product.featured)} onValueChange={val => handleChange('featured', val)} />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ flex: 1 }}>active</Text>
              <Switch value={Boolean(product.active)} onValueChange={val => handleChange('active', val)} />
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>company</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <Text>{currentCompany?.name || (product.company ? String(product.company) : '')}</Text>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>defaultOutInventory</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.defaultOutInventory || ''} onValueChange={val => handleChange('defaultOutInventory', val)}>
                  <Picker.Item label="" value="" />
                  {(inventoriesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.inventory || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: isDesktop ? '33%' : '100%' }}>
              <Text style={{ marginBottom: 4 }}>defaultInInventory</Text>
              <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginBottom: 12 }}>
                <Picker selectedValue={product.defaultInInventory || ''} onValueChange={val => handleChange('defaultInInventory', val)}>
                  <Picker.Item label="" value="" />
                  {(inventoriesGetters.items || []).map(opt => (
                    <Picker.Item key={opt.id} label={opt.inventory || String(opt)} value={opt.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* extraData removed as requested */}
            <View style={{ width: isDesktop ? '33%' : '100%', marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  backgroundColor: '#000',
                  padding: 12,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProductForm;