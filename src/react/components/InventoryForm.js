import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useStore } from '@store';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TYPE_OPTIONS = [
  { key: 'default',   label: 'Padrão',   icon: 'home-outline', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'warehouse', label: 'Depósito', icon: 'warehouse',     color: '#D97706', bg: '#FFFBEB' },
];

const InventoryForm = forwardRef(({ inventory, onSaved }, ref) => {
  const inventoriesStore = useStore('inventories');
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [name, setName] = useState(inventory?.inventory || '');
  const [type, setType] = useState(inventory?.type || 'default');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        inventory: name.trim(),
        type,
        people: `/people/${currentCompany.id}`,
      };
      if (inventory?.id) payload.id = inventory.id;
      const saved = await inventoriesStore.actions.save(payload);
      onSaved?.(saved);
    } catch (e) {
      const msg =
        e?.response?.data?.['hydra:description'] ||
        e?.message ||
        'Erro ao salvar';
      setErrors({ general: msg });
    }
  };

  useImperativeHandle(ref, () => ({ submit }));

  return (
    <View style={styles.container}>
      {!!errors.general && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errors.general}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>
          Nome do local <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, !!errors.name && styles.inputError]}
          value={name}
          onChangeText={v => {
            setName(v);
            setErrors(p => ({ ...p, name: undefined }));
          }}
          placeholder="Ex: Estoque Principal, Despensa..."
          placeholderTextColor="#94A3B8"
        />
        {!!errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          Tipo <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map(opt => {
            const active = type === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.typeChip,
                  active && { backgroundColor: opt.bg, borderColor: opt.color },
                ]}
                onPress={() => setType(opt.key)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={18}
                  color={active ? opt.color : '#94A3B8'}
                />
                <Text style={[styles.typeChipText, active && { color: opt.color }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 18 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', flex: 1 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  required: { color: '#EF4444' },

  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444' },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

export default InventoryForm;
