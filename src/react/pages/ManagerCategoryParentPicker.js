import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from './ManagerCategoriesPage.styles';
import { normalizeEntityId } from './managerCategoriesHelpers';

export default function ManagerCategoryParentPicker({
  visible,
  onClose,
  categories,
  selectedParentId,
  onSelect,
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const filteredCategories = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    return (Array.isArray(categories) ? categories : []).filter(category => {
      if (!term) return true;
      return String(category?.name || '')
        .toLowerCase()
        .includes(term);
    });
  }, [categories, search]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Categoria pai</Text>
                <TouchableOpacity onPress={onClose}>
                  <Icon name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.searchBar}>
                <Icon name="search" size={16} color="#94A3B8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholder="Buscar categoria pai..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <ScrollView style={styles.parentList} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={styles.parentItem}
                  onPress={() => onSelect(null)}>
                  <Text style={styles.parentItemText}>Nenhuma</Text>
                </TouchableOpacity>
                {filteredCategories.map(category => {
                  const categoryId = normalizeEntityId(category?.id || category?.['@id']);
                  const selected = categoryId === normalizeEntityId(selectedParentId);
                  return (
                    <TouchableOpacity
                      key={categoryId || category?.name}
                      style={[styles.parentItem, selected && styles.parentItemSelected]}
                      onPress={() => onSelect(categoryId)}>
                      <Text style={styles.parentItemText}>{category?.name}</Text>
                      {selected ? <Icon name="check" size={16} color="#0EA5E9" /> : null}
                    </TouchableOpacity>
                  );
                })}
                {filteredCategories.length === 0 ? (
                  <Text style={styles.emptyInline}>Nenhuma categoria encontrada.</Text>
                ) : null}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
