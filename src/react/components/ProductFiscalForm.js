import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';

const normalizeDigits = value => String(value || '').replace(/\D/g, '');
const toNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const validateFiscalPayload = fiscal => {
  const errors = [];
  const ncm = normalizeDigits(fiscal?.ncm);
  const cest = normalizeDigits(fiscal?.cest);
  const cfop = normalizeDigits(fiscal?.cfop);
  const origin = String(fiscal?.origin ?? '').trim();

  if (ncm && ncm.length !== 8) errors.push('NCM deve conter 8 dígitos.');
  if (cest && cest.length !== 7) errors.push('CEST deve conter 7 dígitos.');
  if (cfop && cfop.length !== 4) errors.push('CFOP deve conter 4 dígitos.');
  if (origin && !['0', '1', '2', '3', '4', '5', '6', '7', '8'].includes(origin)) {
    errors.push('Origem fiscal deve estar entre 0 e 8.');
  }
  ['icms', 'pis', 'cofins', 'ipi'].forEach(field => {
    const val = toNumber(fiscal?.[field]);
    if (val !== null && (val < 0 || val > 100)) {
      errors.push(`${field.toUpperCase()} deve estar entre 0 e 100.`);
    }
  });
  return errors;
};

const ProductFiscalForm = ({ProductId}) => {
  const productsStore = useStore('products');
  const {actions: productActions} = productsStore;
  const [product, setProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const fiscal = useMemo(() => product?.extraData?.fiscal || {}, [product]);

  useEffect(() => {
    if (!ProductId) return;
    productActions.get(ProductId).then(data => setProduct(data));
  }, [ProductId, productActions]);

  const updateFiscal = (field, value) => {
    setProduct(prev => ({
      ...(prev || {}),
      extraData: {
        ...(prev?.extraData || {}),
        fiscal: {
          ...(prev?.extraData?.fiscal || {}),
          [field]: value,
        },
      },
    }));
  };

  const saveFiscal = async () => {
    if (!ProductId || !product) return;
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const fiscalPayload = {
        ...(product.extraData?.fiscal || {}),
      };
      const validationErrors = validateFiscalPayload(fiscalPayload);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      const payload = {
        id: ProductId,
        extraData: {
          ...(product.extraData || {}),
          fiscal: fiscalPayload,
        },
      };
      await productActions.save(payload);
      setStatus('Dados fiscais salvos.');
    } catch (e) {
      setError(e?.message || 'Falha ao salvar dados fiscais.');
    } finally {
      setSaving(false);
    }
  };

  if (!ProductId) {
    return (
      <View style={{padding: 16}}>
        <Text>Salve o produto para habilitar a aba Fiscal.</Text>
      </View>
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  };

  return (
    <View style={{flex: 1}}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={{padding: 16}}>
        <Text style={{marginBottom: 8, fontWeight: '600'}}>Fiscal (Brasil)</Text>

        <Text>NCM</Text>
        <TextInput style={inputStyle} value={String(fiscal.ncm || '')} onChangeText={v => updateFiscal('ncm', v)} />

        <Text>CEST</Text>
        <TextInput style={inputStyle} value={String(fiscal.cest || '')} onChangeText={v => updateFiscal('cest', v)} />

        <Text>Origem (0-8)</Text>
        <TextInput style={inputStyle} value={String(fiscal.origin || '')} onChangeText={v => updateFiscal('origin', v)} />

        <Text>CFOP padrão</Text>
        <TextInput style={inputStyle} value={String(fiscal.cfop || '')} onChangeText={v => updateFiscal('cfop', v)} />

        <Text>ICMS (%)</Text>
        <TextInput style={inputStyle} value={String(fiscal.icms || '')} onChangeText={v => updateFiscal('icms', v)} keyboardType="numeric" />

        <Text>PIS (%)</Text>
        <TextInput style={inputStyle} value={String(fiscal.pis || '')} onChangeText={v => updateFiscal('pis', v)} keyboardType="numeric" />

        <Text>COFINS (%)</Text>
        <TextInput style={inputStyle} value={String(fiscal.cofins || '')} onChangeText={v => updateFiscal('cofins', v)} keyboardType="numeric" />

        <Text>IPI (%)</Text>
        <TextInput style={inputStyle} value={String(fiscal.ipi || '')} onChangeText={v => updateFiscal('ipi', v)} keyboardType="numeric" />

        {!!status && <Text style={{color: '#1b7f34', marginBottom: 8}}>{status}</Text>}
        {!!error && <Text style={{color: '#b00020', marginBottom: 8}}>{error}</Text>}

        <TouchableOpacity
          onPress={saveFiscal}
          disabled={saving}
          style={{
            backgroundColor: '#000',
            padding: 12,
            borderRadius: 6,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff'}}>{saving ? 'Salvando...' : 'Salvar Fiscal'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ProductFiscalForm;
