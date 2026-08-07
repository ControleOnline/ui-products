import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { humanizeCategoryContext } from '@controleonline/ui-common/src/react/utils/categoryContexts';
import styles from './ManagerCategoriesPage.styles';
import { COLOR_PRESETS } from './managerCategoriesHelpers';

export default function ManagerCategoryFormModal({
  visible,
  onClose,
  editingCategory,
  formName,
  setFormName,
  formContext,
  setFormContext,
  isFormContextLocked,
  formColor,
  setFormColor,
  formIcon,
  setFormIcon,
  selectedParent,
  onOpenParentPicker,
  isSubmitting,
  onSave,
  palette,
}) {
  return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingCategory ? 'Editar categoria' : 'Nova categoria'}
                  </Text>
                  <TouchableOpacity onPress={onClose}>
                    <Icon name="x" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Nome *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="Nome da categoria"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Contexto *</Text>
                    {isFormContextLocked ? (
                      <View style={styles.lockedField}>
                        <Text style={styles.lockedFieldText}>
                          {humanizeCategoryContext(formContext) || formContext}
                        </Text>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.textInput}
                        value={formContext}
                        onChangeText={setFormContext}
                        placeholder="Ex: product, receiver..."
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                      />
                    )}
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Cor</Text>
                    <View style={styles.colorRow}>
                      {COLOR_PRESETS.map(color => (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setFormColor(color)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color },
                            formColor === color && styles.colorSwatchActive,
                          ]}>
                          {formColor === color ? (
                            <Icon name="check" size={12} color="#fff" />
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Ícone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formIcon}
                      onChangeText={setFormIcon}
                      placeholder="Ex: tag, shopping-cart"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Categoria pai</Text>
                    <TouchableOpacity
                      style={styles.textInput}
                      onPress={() => onOpenParentPicker()}>
                      <Text style={{ color: selectedParent ? '#0F172A' : '#94A3B8' }}>
                        {selectedParent?.name || 'Nenhuma'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btnSave,
                      { backgroundColor: palette.primary },
                      isSubmitting && { opacity: 0.6 },
                    ]}
                    onPress={onSave}
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.btnSaveText}>Salvar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

  );
}
