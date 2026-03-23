import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
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

const ProductFiscalForm = ({ ProductId }) => {
  const productsStore = useStore('products');
  const { actions: productActions } = productsStore;
  const [product, setProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const brandColors = useMemo(() => resolveThemePalette(), []);

  const fiscal = useMemo(() => product?.extraData?.fiscal || {}, [product]);

  const fmtN = v => (v === '' || v === null || v === undefined) ? '' : String(v).replace('.', ',');

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
      <View style={styles.container}>
        <Text style={styles.disabledText}>
          Salve o produto para habilitar a aba Fiscal.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#64748B" />
            <Text style={styles.sectionTitle}>Fiscal (Brasil)</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>NCM</Text>
              <TextInput
                style={styles.input}
                value={String(fiscal.ncm || '')}
                onChangeText={v => updateFiscal('ncm', v)}
                placeholder="00000000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>CEST</Text>
              <TextInput
                style={styles.input}
                value={String(fiscal.cest || '')}
                onChangeText={v => updateFiscal('cest', v)}
                placeholder="0000000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={7}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>CFOP padrão</Text>
              <TextInput
                style={styles.input}
                value={String(fiscal.cfop || '')}
                onChangeText={v => updateFiscal('cfop', v)}
                placeholder="0000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>Origem (0-8)</Text>
              <TextInput
                style={styles.input}
                value={String(fiscal.origin || '')}
                onChangeText={v => updateFiscal('origin', v)}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>ICMS (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(fiscal.icms)}
                onChangeText={v => updateFiscal('icms', v)}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>PIS (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(fiscal.pis)}
                onChangeText={v => updateFiscal('pis', v)}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>COFINS (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(fiscal.cofins)}
                onChangeText={v => updateFiscal('cofins', v)}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>IPI (%)</Text>
              <TextInput
                style={styles.input}
                value={fmtN(fiscal.ipi)}
                onChangeText={v => updateFiscal('ipi', v)}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>
          </View>

          {!!status && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{status}</Text>
            </View>
          )}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={saveFiscal}
          disabled={saving}
          style={[
            styles.btnPrimary,
            { backgroundColor: brandColors?.primary || '#0F172A' },
            saving && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnText}>
            {saving ? 'Salvando...' : 'Salvar Fiscal'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  disabledText: {
    padding: 16,
    color: '#64748B',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
  },
  colSpacer: {
    width: 12,
  },
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
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  successText: {
    color: '#166534',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  errorText: {
    color: '#9e1b1b',
    fontSize: 14,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    backgroundColor: '#fff',
  },
  btnPrimary: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProductFiscalForm;
