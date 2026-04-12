import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { colors } from '@controleonline/../../src/styles/colors';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'manufacturer', label: 'Fabricante' },
  { value: 'distributor', label: 'Distribuidor' },
];

const extractId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const match = value.match(/(\d+)$/);
    return match ? match[1] : value;
  }
  if (typeof value === 'object') {
    return extractId(value.id || value['@id'] || '');
  }
  return '';
};

const normalizeProvider = provider => {
  const id = extractId(provider?.id || provider?.['@id']);
  const atId = String(provider?.['@id'] || (id ? `/people/${id}` : '')).trim();

  return {
    id,
    '@id': atId,
    alias: String(provider?.alias || '').trim(),
    name: String(provider?.name || '').trim(),
    peopleType: provider?.peopleType || '',
  };
};

const getProviderTitle = provider =>
  String(provider?.alias || provider?.name || `Pessoa #${provider?.id || ''}`).trim();

const getProviderSubtitle = provider => {
  const parts = [];

  if (provider?.name && provider?.alias && provider.name !== provider.alias) {
    parts.push(String(provider.name).trim());
  }

  if (provider?.peopleType) {
    parts.push(provider.peopleType === 'J' ? 'Pessoa juridica' : 'Pessoa fisica');
  }

  return parts.join(' | ');
};

const normalizeDraft = relation => ({
  people: relation?.people ? normalizeProvider(relation.people) : null,
  role: String(relation?.role || 'supplier'),
  supplierSku: String(relation?.supplierSku || ''),
  costPrice:
    relation?.costPrice === 0 || relation?.costPrice
      ? String(relation.costPrice).replace('.', ',')
      : '',
  leadTimeDays:
    relation?.leadTimeDays === 0 || relation?.leadTimeDays
      ? String(relation.leadTimeDays)
      : '',
  priority:
    relation?.priority === 0 || relation?.priority
      ? String(relation.priority)
      : '1',
});

const sanitizeIntegerInput = value => String(value || '').replace(/\D/g, '');

const parseOptionalInteger = value => {
  const normalized = sanitizeIntegerInput(value);
  if (!normalized) {
    return null;
  }

  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDecimalForPayload = value => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const separatorIndex = Math.max(lastComma, lastDot);

  let integerPart = separatorIndex >= 0 ? cleaned.slice(0, separatorIndex) : cleaned;
  let decimalPart = separatorIndex >= 0 ? cleaned.slice(separatorIndex + 1) : '';

  const isNegative = integerPart.startsWith('-');
  integerPart = integerPart.replace(/[^\d]/g, '');
  decimalPart = decimalPart.replace(/\D/g, '').slice(0, 2);

  if (!integerPart && !decimalPart) {
    return null;
  }

  const normalized = `${isNegative ? '-' : ''}${integerPart || '0'}${
    decimalPart ? `.${decimalPart}` : ''
  }`;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(decimalPart ? decimalPart.length : 2);
};

const getBackendMessage = error => {
  if (Array.isArray(error?.message)) {
    return error.message.map(item => item?.message || item).join(', ');
  }

  return error?.message || '';
};

const mergeProviders = (current, incoming) => {
  const map = new Map();

  [...current, ...incoming].forEach(item => {
    const normalized = normalizeProvider(item);
    if (normalized.id) {
      map.set(normalized.id, normalized);
    }
  });

  return Array.from(map.values());
};

const ProductSupplierRelationModal = ({
  visible,
  product,
  relation,
  relations = [],
  onClose,
  onSaved,
}) => {
  const navigation = useNavigation();
  const { showError, showSuccess } = useMessage();
  const peopleStore = useStore('people');
  const productPeopleStore = useStore('product_people');
  const [draft, setDraft] = useState(() => normalizeDraft(relation));
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const productId = useMemo(
    () => extractId(product?.id || product?.['@id']),
    [product?.id, product?.['@id']],
  );

  const companyId = useMemo(
    () =>
      extractId(
        product?.company?.id ||
          product?.company?.['@id'] ||
          peopleStore?.getters?.currentCompany?.id ||
          peopleStore?.getters?.currentCompany?.['@id'],
      ),
    [
      product?.company?.id,
      product?.company?.['@id'],
      peopleStore?.getters?.currentCompany?.id,
      peopleStore?.getters?.currentCompany?.['@id'],
    ],
  );

  const editingRelationId = useMemo(
    () => extractId(relation?.id || relation?.['@id']),
    [relation?.id, relation?.['@id']],
  );

  const fetchProviders = useCallback(
    async (searchValue, targetPage) => {
      if (!peopleStore?.actions?.getItems) {
        setProviders([]);
        setHasMore(false);
        return;
      }

      const requestId = ++requestRef.current;
      setIsLoadingProviders(true);

      try {
        const params = {
          'link.linkType': 'provider',
          itemsPerPage: PAGE_SIZE,
          page: targetPage,
        };

        if (companyId) {
          params['link.company'] = `/people/${companyId}`;
        }

        if (String(searchValue || '').trim()) {
          params.name = String(searchValue).trim();
        }

        const response = await peopleStore.actions.getItems(params).catch(() => []);
        if (requestId !== requestRef.current) {
          return;
        }

        const items = Array.isArray(response)
          ? response.map(normalizeProvider).filter(item => item.id)
          : [];

        setProviders(prev => (targetPage === 1 ? items : mergeProviders(prev, items)));
        setHasMore(items.length === PAGE_SIZE);
      } finally {
        if (requestId === requestRef.current) {
          setIsLoadingProviders(false);
        }
      }
    },
    [companyId, peopleStore?.actions],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(normalizeDraft(relation));
    setProviders([]);
    setQuery('');
    setPage(1);
    setHasMore(false);
    setError('');
  }, [visible, relation]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => {
      setPage(1);
      fetchProviders(query, 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchProviders, query, visible]);

  const loadMoreProviders = useCallback(() => {
    if (isLoadingProviders || !hasMore) {
      return;
    }

    const nextPage = page + 1;
    setPage(nextPage);
    fetchProviders(query, nextPage);
  }, [fetchProviders, hasMore, isLoadingProviders, page, query]);

  const handleChange = useCallback((field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const handleSelectProvider = useCallback(provider => {
    setDraft(prev => ({ ...prev, people: normalizeProvider(provider) }));
    setError('');
  }, []);

  const handleClearProvider = useCallback(() => {
    setDraft(prev => ({ ...prev, people: null }));
    setError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!productId) {
      showError('Nao foi possivel identificar o produto para vincular o fornecedor.');
      return;
    }

    if (!productPeopleStore?.actions?.save) {
      showError('Servico de fornecedores do produto indisponivel no momento.');
      return;
    }

    const providerId = extractId(draft?.people?.id || draft?.people?.['@id']);
    if (!providerId) {
      showError('Selecione um fornecedor para continuar.');
      return;
    }

    const duplicate = relations.some(item => {
      const currentId = extractId(item?.id || item?.['@id']);
      const currentPeopleId = extractId(item?.people?.id || item?.people?.['@id']);
      const currentRole = String(item?.role || 'supplier');

      return (
        currentId !== editingRelationId &&
        currentPeopleId === providerId &&
        currentRole === String(draft?.role || 'supplier')
      );
    });

    if (duplicate) {
      showError('Este fornecedor ja esta vinculado com esse papel neste produto.');
      return;
    }

    const leadTimeDays = parseOptionalInteger(draft?.leadTimeDays);
    const priority = parseOptionalInteger(draft?.priority);
    const costPrice = normalizeDecimalForPayload(draft?.costPrice);

    if (draft?.costPrice && costPrice === null) {
      showError('Informe um custo valido.');
      return;
    }

    if (draft?.priority && priority === null) {
      showError('Informe uma prioridade valida.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const payload = {
        product: `/products/${productId}`,
        people: `/people/${providerId}`,
        role: String(draft?.role || 'supplier'),
        costPrice,
        leadTimeDays,
        supplierSku: String(draft?.supplierSku || '').trim() || null,
        priority: priority ?? 1,
      };

      if (editingRelationId) {
        payload.id = editingRelationId;
      }

      const saved = await productPeopleStore.actions.save(payload);

      showSuccess(
        editingRelationId
          ? 'Fornecedor do produto atualizado com sucesso!'
          : 'Fornecedor vinculado com sucesso!',
      );

      try {
        await onSaved?.(saved);
      } catch (refreshError) {
        // O vinculo ja foi salvo; mantemos a tela utilizavel mesmo se o refresh falhar.
      }
    } catch (saveError) {
      const backendMessage = getBackendMessage(saveError);
      const message = backendMessage || 'Falha ao salvar o fornecedor do produto.';
      setError(message);
      showError(message);
      return;
    } finally {
      setIsSaving(false);
    }

    onClose?.();
  }, [
    draft,
    editingRelationId,
    onClose,
    onSaved,
    productId,
    productPeopleStore?.actions,
    relations,
    showError,
    showSuccess,
  ]);

  const openProvidersIndex = useCallback(() => {
    onClose?.();
    navigation.navigate('ProvidersIndex');
  }, [navigation, onClose]);

  const title = editingRelationId ? 'Editar fornecedor' : 'Vincular fornecedor';
  const selectedProviderId = extractId(draft?.people?.id || draft?.people?.['@id']);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} style={{ justifyContent: 'flex-end' }}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>
              Defina o fornecedor e os dados comerciais do vinculo.
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton} activeOpacity={0.7}>
            <Icon name="close" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="error-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Fornecedor *</Text>

            {draft?.people ? (
              <View style={styles.selectedCard}>
                <View style={styles.selectedCardIcon}>
                  <Icon name="storefront" size={18} color={colors.primary} />
                </View>

                <View style={styles.selectedCardBody}>
                  <Text style={styles.selectedCardTitle} numberOfLines={1}>
                    {getProviderTitle(draft.people)}
                  </Text>
                  {getProviderSubtitle(draft.people) ? (
                    <Text style={styles.selectedCardSubtitle} numberOfLines={1}>
                      {getProviderSubtitle(draft.people)}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={handleClearProvider}
                  style={styles.clearProviderButton}
                  activeOpacity={0.7}>
                  <Icon name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.helperText}>
                Selecione um fornecedor cadastrado para vincular ao produto.
              </Text>
            )}

            <View style={styles.searchWrap}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar fornecedor"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                  <Icon name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.providersList}>
              {isLoadingProviders ? (
                <View style={styles.providersLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.providersLoadingText}>Buscando fornecedores...</Text>
                </View>
              ) : providers.length === 0 ? (
                <View style={styles.providersEmpty}>
                  <Text style={styles.providersEmptyTitle}>Nenhum fornecedor encontrado</Text>
                  <Text style={styles.providersEmptyText}>
                    Cadastre fornecedores em Pessoas antes de criar o vinculo.
                  </Text>

                  <TouchableOpacity
                    style={styles.providersEmptyButton}
                    onPress={openProvidersIndex}
                    activeOpacity={0.8}>
                    <Icon name="open-in-new" size={16} color={colors.primary} />
                    <Text style={styles.providersEmptyButtonText}>Abrir fornecedores</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {providers.map(provider => {
                    const providerId = extractId(provider?.id || provider?.['@id']);
                    const isSelected = providerId === selectedProviderId;

                    return (
                      <TouchableOpacity
                        key={providerId}
                        style={[styles.providerItem, isSelected && styles.providerItemSelected]}
                        onPress={() => handleSelectProvider(provider)}
                        activeOpacity={0.8}>
                        <View style={styles.providerItemIcon}>
                          <Icon
                            name={isSelected ? 'check-circle' : 'storefront'}
                            size={18}
                            color={isSelected ? '#15803D' : colors.primary}
                          />
                        </View>

                        <View style={styles.providerItemBody}>
                          <Text style={styles.providerItemTitle} numberOfLines={1}>
                            {getProviderTitle(provider)}
                          </Text>
                          {getProviderSubtitle(provider) ? (
                            <Text style={styles.providerItemSubtitle} numberOfLines={1}>
                              {getProviderSubtitle(provider)}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {hasMore ? (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMoreProviders}
                      activeOpacity={0.8}>
                      <Text style={styles.loadMoreButtonText}>Carregar mais fornecedores</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Papel</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map(option => {
                const isActive = option.value === draft?.role;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.roleButton, isActive && styles.roleButtonActive]}
                    onPress={() => handleChange('role', option.value)}
                    activeOpacity={0.8}>
                    <Text style={[styles.roleButtonText, isActive && styles.roleButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Codigo do fornecedor</Text>
              <TextInput
                value={draft?.supplierSku}
                onChangeText={value => handleChange('supplierSku', value)}
                placeholder="Ex: SUP-001"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Custo</Text>
              <TextInput
                value={draft?.costPrice}
                onChangeText={value => handleChange('costPrice', value)}
                placeholder="0,00"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Prazo em dias</Text>
              <TextInput
                value={draft?.leadTimeDays}
                onChangeText={value => handleChange('leadTimeDays', sanitizeIntegerInput(value))}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Prioridade</Text>
              <TextInput
                value={draft?.priority}
                onChangeText={value => handleChange('priority', sanitizeIntegerInput(value))}
                placeholder="1"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            activeOpacity={0.8}
            disabled={isSaving}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {editingRelationId ? 'Salvar alteracoes' : 'Vincular fornecedor'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginLeft: 12,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  helperText: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  selectedCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedCardBody: {
    flex: 1,
    minWidth: 0,
  },
  selectedCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedCardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  clearProviderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
  },
  providersList: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  providersLoading: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  providersLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  providersEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  providersEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  providersEmptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  providersEmptyButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  providersEmptyButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  providerItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  providerItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  providerItemBody: {
    flex: 1,
    minWidth: 0,
  },
  providerItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  providerItemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
  },
  loadMoreButton: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadMoreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  roleButtonTextActive: {
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  halfField: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 18,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default ProductSupplierRelationModal;
