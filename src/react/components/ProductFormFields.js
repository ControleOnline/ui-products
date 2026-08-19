import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import styles, {
  inlineStyle_71_8,
  inlineStyle_76_10,
  inlineStyle_78_20,
  inlineStyle_84_14,
  inlineStyle_85_16,
  inlineStyle_144_12,
  inlineStyle_150_12,
} from './ProductForm.styles';

const SkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={inlineStyle_71_8({
    height: height,
    mb: mb,
    width: width,
  })} />
);

const SkeletonTab = () => (
  <ScrollView contentContainerStyle={inlineStyle_92_14} showsVerticalScrollIndicator={false}>
    <View style={inlineStyle_76_10} />
    {[1, 2, 3, 4].map(i => (
      <View key={i} style={inlineStyle_78_20}>
        <View style={inlineStyle_84_14}>
          <View style={inlineStyle_85_16} />
          <SkeletonLine width="35%" height={13} mb={0} />
        </View>
        <SkeletonLine height={40} mb={8} />
        {i < 3 && <SkeletonLine height={40} mb={0} />}
      </View>
    ))}
  </ScrollView>
);

/* ─── SelectField fora do componente pai para evitar remount a cada render ─── */
const SelectField = ({ label, value, options, onChange, placeholder = 'Selecionar...', brandColors }) => {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(o => String(o.value) === String(value));
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={selectedOption ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>
      <AnimatedModal visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.pickerModalClose}>
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerModalList} showsVerticalScrollIndicator={false}>
            {options.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && { color: brandColors.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedModal>
    </View>
  );
};

const CategoryMultiSelectField = ({ label, values = [], options, onChange, brandColors }) => {
  const [open, setOpen] = React.useState(false);
  const selectedValues = useMemo(() => new Set(uniqueCategoryIds(values)), [values]);
  const selectedOptions = options.filter(opt => selectedValues.has(String(opt.value)));

  const toggleValue = value => {
    const id = extractCategoryIdValue(value);
    if (!id) return;

    const next = new Set(selectedValues);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.multiSelectButton} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.multiSelectSummary}>
          {selectedOptions.length === 0 ? (
            <Text style={styles.selectPlaceholder}>Sem categoria</Text>
          ) : (
            <>
              {selectedOptions.slice(0, 3).map(option => (
                <View key={String(option.value)} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText} numberOfLines={1}>{option.label}</Text>
                </View>
              ))}
              {selectedOptions.length > 3 && (
                <View style={styles.categoryChipOverflow}>
                  <Text style={styles.categoryChipText}>+{selectedOptions.length - 3}</Text>
                </View>
              )}
            </>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>
      <AnimatedModal visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.pickerModalClose}>
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerModalList} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.pickerOption, selectedValues.size === 0 && styles.pickerOptionActive]}
              onPress={() => onChange([])}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerOptionText, selectedValues.size === 0 && { color: brandColors.primary, fontWeight: '700' }]}>
                Sem categoria
              </Text>
              {selectedValues.size === 0 && <MaterialCommunityIcons name="check-circle" size={20} color={brandColors.primary} />}
            </TouchableOpacity>
            {options.map(opt => {
              const isSelected = selectedValues.has(String(opt.value));
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => toggleValue(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && { color: brandColors.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                    size={20}
                    color={isSelected ? brandColors.primary : '#CBD5E1'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedModal>
    </View>
  );
};

/* ─── SectionCard fora do componente pai para evitar remount a cada render ─── */
const SectionCard = ({ title, icon, isOpen, onToggle, hasError, children }) => (
  <View style={[styles.sectionCard, hasError && styles.sectionCardError]}>
    <TouchableOpacity style={styles.sectionCardHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={inlineStyle_144_12}>
        {icon && (
          <MaterialCommunityIcons
            name={hasError ? 'alert-circle' : icon}
            size={16}
            color={hasError ? '#c10015' : '#94A3B8'}
            style={inlineStyle_150_12}
          />
        )}
        <Text style={[styles.sectionCardTitle, hasError && styles.sectionCardTitleError]}>{title}</Text>
      </View>
      <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={hasError ? '#c10015' : '#94A3B8'} />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionCardBody}>{children}</View>}
  </View>
);


export {
  SkeletonLine,
  SkeletonTab,
  SelectField,
  CategoryMultiSelectField,
  SectionCard,
};
