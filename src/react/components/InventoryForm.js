import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useStore } from '@store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './InventoryForm.styles';

const TYPE_OPTIONS = [
  { key: 'sales',        label: 'Vendas',        icon: 'cart-outline',       color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'internal',     label: 'Interno',        icon: 'home-outline',       color: '#6366F1', bg: '#EEF2FF' },
  { key: 'consignment',  label: 'Consignação',    icon: 'swap-horizontal',    color: '#D97706', bg: '#FFFBEB' },
  { key: 'damaged',      label: 'Avariado',       icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEF2F2' },
];

const InventoryForm = forwardRef(({ inventory, onSaved }, ref) => {
  const inventoriesStore = useStore('inventories');
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;

  const [name, setName] = useState(inventory?.inventory || '');
  const [type, setType] = useState(inventory?.type || 'sales');
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

export default InventoryForm;
