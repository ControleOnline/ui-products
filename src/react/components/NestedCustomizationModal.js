import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

import {
  buildUnitCustomizationTree,
  findUnitTreeNode,
  normalizeCustomizationId,
  parseCustomizationNumber,
  resolveGroupMaximum,
  resolveGroupMinimum,
  summarizeCustomizationGroups,
} from '../domain/customizationTree';
import {
  nestedBackdropStyle,
  nestedBackButtonStyle,
  nestedButtonTextStyle,
  nestedControlInnerStyle,
  nestedControlStyle,
  nestedEditButtonStyle,
  nestedEyebrowStyle,
  nestedFooterStyle,
  nestedGroupHeaderStyle,
  nestedGroupMetaStyle,
  nestedGroupStyle,
  nestedGroupTitleStyle,
  nestedHeaderCopyStyle,
  nestedHeaderStyle,
  nestedOptionCopyStyle,
  nestedOptionMetaStyle,
  nestedOptionNameStyle,
  nestedOptionPriceStyle,
  nestedOptionStyle,
  nestedPanelStyle,
  nestedPrimaryButtonStyle,
  nestedScrollContentStyle,
  nestedSecondaryButtonStyle,
  nestedStateStyle,
  nestedStateTextStyle,
  nestedTitleStyle,
} from './NestedCustomizationModal.styles';

const productName = product => product?.product || product?.name || 'Produto';
const EMPTY_TREE = [];

const groupStatusLabel = summary => {
  if (summary.hasInvalidDescendant) {
    return 'Conclua a personalizacao da opcao selecionada';
  }
  if (!summary.isValid) {
    return summary.minimum > 0
      ? `Selecione pelo menos ${summary.minimum}`
      : 'Revise as selecoes';
  }

  return `${summary.selectedCount} selecionado${summary.selectedCount === 1 ? '' : 's'}`;
};

const NestedCustomizationModal = ({
  initialTree = EMPTY_TREE,
  onCancel,
  onSave,
  palette,
  preloadedGroups = null,
  product,
  productGroupActions,
  productGroupProductActions,
  visible,
}) => {
  const {width} = useWindowDimensions();
  const compact = width < 720;
  const productId = normalizeCustomizationId(product?.id || product?.['@id']);
  const [groups, setGroups] = useState([]);
  const [optionsByGroup, setOptionsByGroup] = useState({});
  const [selectionsByGroup, setSelectionsByGroup] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [childEditor, setChildEditor] = useState(null);

  useEffect(() => {
    if (!visible || !productId) {
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    const groupsPromise = Array.isArray(preloadedGroups)
      ? Promise.resolve(preloadedGroups)
      : productGroupActions.getItems({
          product: productId,
          'product.productType': 'component',
        });

    groupsPromise
      .then(async loadedGroups => {
        const nextGroups = Array.isArray(loadedGroups) ? loadedGroups : [];
        const entries = await Promise.all(
          nextGroups.map(async group => {
            const groupId = normalizeCustomizationId(group?.id || group?.['@id']);
            const options = await productGroupProductActions.getItems({
              productGroup: `/product_groups/${groupId}`,
              productType: 'component',
            });
            return [groupId, Array.isArray(options) ? options : []];
          }),
        );
        if (!active) {
          return;
        }

        const nextOptions = Object.fromEntries(entries);
        const nextSelections = Object.fromEntries(
          nextGroups.map(group => {
            const groupId = normalizeCustomizationId(group?.id || group?.['@id']);
            return [groupId, (nextOptions[groupId] || []).map(option => {
              const childId = normalizeCustomizationId(
                option?.productChild?.id || option?.productChild?.['@id'],
              );
              const existing = findUnitTreeNode(initialTree, groupId, childId);
              return {
                ...option,
                selected: !!existing,
                quantity: existing?.quantity || option?.quantity || 1,
                sub_products: existing?.sub_products || [],
                hasNestedGroups: existing?.sub_products?.length > 0 || undefined,
                nestedState: existing?.sub_products?.length > 0 ? 'valid' : undefined,
              };
            })];
          }),
        );

        setGroups(nextGroups);
        setOptionsByGroup(nextOptions);
        setSelectionsByGroup(nextSelections);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('Nao foi possivel carregar as opcoes deste produto.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    initialTree,
    preloadedGroups,
    productGroupActions,
    productGroupProductActions,
    productId,
    visible,
  ]);

  const summaries = useMemo(
    () => summarizeCustomizationGroups(groups, selectionsByGroup),
    [groups, selectionsByGroup],
  );
  const summariesById = useMemo(
    () => Object.fromEntries(summaries.map(summary => [summary.groupId, summary])),
    [summaries],
  );
  const canSave = !loading && !error && summaries.every(summary => summary.isValid);

  const updateOption = useCallback((groupId, optionId, updater) => {
    setSelectionsByGroup(current => ({
      ...current,
      [groupId]: (current[groupId] || []).map(item =>
        item['@id'] === optionId ? updater(item) : item,
      ),
    }));
  }, []);

  const inspectNestedGroups = useCallback(async (groupId, option) => {
    const optionId = option?.['@id'];
    const child = option?.productChild;
    const childId = normalizeCustomizationId(child?.id || child?.['@id']);
    if (!childId) {
      return;
    }

    updateOption(groupId, optionId, item => ({...item, nestedState: 'checking'}));
    try {
      const nestedGroups = await productGroupActions.getItems({
        product: childId,
        'product.productType': 'component',
      });
      if (!Array.isArray(nestedGroups) || nestedGroups.length === 0) {
        updateOption(groupId, optionId, item => ({
          ...item,
          hasNestedGroups: false,
          nestedState: 'valid',
        }));
        return;
      }

      const requiresSelection = nestedGroups.some(
        group => resolveGroupMinimum(group) > 0,
      );
      updateOption(groupId, optionId, item => ({
        ...item,
        hasNestedGroups: true,
        nestedState: requiresSelection && item.sub_products.length === 0
          ? 'pending'
          : 'valid',
      }));
      setChildEditor({groupId, optionId, option, groups: nestedGroups});
    } catch {
      updateOption(groupId, optionId, item => ({
        ...item,
        hasNestedGroups: true,
        nestedState: 'invalid',
      }));
    }
  }, [productGroupActions, updateOption]);

  const selectOption = useCallback((group, option) => {
    const groupId = normalizeCustomizationId(group?.id || group?.['@id']);
    const optionId = option?.['@id'];
    const selected = !!option?.selected;
    const maximum = resolveGroupMaximum(group);

    setSelectionsByGroup(current => {
      const currentItems = current[groupId] || [];
      const selectedCount = currentItems.filter(item => item.selected).length;
      if (!selected && maximum !== 1 && maximum !== null && selectedCount >= maximum) {
        return current;
      }

      return {
        ...current,
        [groupId]: currentItems.map(item => {
          if (maximum === 1 && !selected) {
            return {...item, selected: item['@id'] === optionId};
          }
          return item['@id'] === optionId ? {...item, selected: !selected} : item;
        }),
      };
    });

    if (!selected) {
      inspectNestedGroups(groupId, option);
    }
  }, [inspectNestedGroups]);

  const openExistingEditor = useCallback((groupId, option) => {
    if (option?.hasNestedGroups) {
      inspectNestedGroups(groupId, option);
    }
  }, [inspectNestedGroups]);

  const saveChild = useCallback(unitTree => {
    if (!childEditor) {
      return;
    }
    updateOption(childEditor.groupId, childEditor.optionId, item => ({
      ...item,
      sub_products: unitTree,
      hasNestedGroups: true,
      nestedState: 'valid',
    }));
    setChildEditor(null);
  }, [childEditor, updateOption]);

  const save = useCallback(() => {
    if (canSave) {
      onSave(buildUnitCustomizationTree(selectionsByGroup, groups));
    }
  }, [canSave, groups, onSave, selectionsByGroup]);

  return (
    <Modal
      animationType={compact ? 'slide' : 'fade'}
      onRequestClose={onCancel}
      transparent
      visible={visible}>
      <View style={nestedBackdropStyle(palette, compact)}>
        <View style={nestedPanelStyle(palette, compact)}>
          <View style={nestedHeaderStyle(palette)}>
            <TouchableOpacity
              accessibilityLabel="Voltar para a personalizacao anterior"
              onPress={onCancel}
              style={nestedBackButtonStyle(palette)}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={22}
                color={palette.text}
              />
            </TouchableOpacity>
            <View style={nestedHeaderCopyStyle}>
              <Text style={nestedEyebrowStyle(palette)}>Personalize sua escolha</Text>
              <Text style={nestedTitleStyle(palette)} numberOfLines={2}>
                {productName(product)}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={nestedStateStyle(palette)}>
              <ActivityIndicator color={palette.primary} size="large" />
              <Text style={nestedStateTextStyle(palette)}>Carregando opcoes...</Text>
            </View>
          ) : error ? (
            <View style={nestedStateStyle(palette)}>
              <Text style={nestedStateTextStyle(palette)}>{error}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={nestedScrollContentStyle}>
              {groups.map(group => {
                const groupId = normalizeCustomizationId(group?.id || group?.['@id']);
                const summary = summariesById[groupId];
                return (
                  <View key={groupId} style={nestedGroupStyle(palette, !summary?.isValid)}>
                    <View style={nestedGroupHeaderStyle(palette)}>
                      <Text style={nestedGroupTitleStyle(palette)}>
                        {group?.productGroup || 'Escolha uma opcao'}
                      </Text>
                      <Text style={nestedGroupMetaStyle(palette, !summary?.isValid)}>
                        {groupStatusLabel(summary)}
                      </Text>
                    </View>
                    {(selectionsByGroup[groupId] || optionsByGroup[groupId] || []).map(option => {
                      const selected = !!option.selected;
                      const nestedInvalid = selected && ['checking', 'pending', 'invalid'].includes(option.nestedState);
                      return (
                        <TouchableOpacity
                          accessibilityLabel={`Selecionar ${productName(option.productChild)}`}
                          key={option['@id'] || option.id}
                          onPress={() => selectOption(group, option)}
                          style={nestedOptionStyle(palette, selected, false)}>
                          <View style={nestedControlStyle(palette, selected)}>
                            {selected ? <View style={nestedControlInnerStyle(palette)} /> : null}
                          </View>
                          <View style={nestedOptionCopyStyle}>
                            <Text style={nestedOptionNameStyle(palette)}>
                              {productName(option.productChild)}
                            </Text>
                            <Text style={nestedOptionMetaStyle(palette, nestedInvalid)}>
                              {option.nestedState === 'checking'
                                ? 'Verificando opcoes...'
                                : nestedInvalid
                                  ? 'Personalizacao pendente'
                                  : option.hasNestedGroups
                                    ? 'Personalizado'
                                    : 'Toque para selecionar'}
                            </Text>
                          </View>
                          <Text style={nestedOptionPriceStyle(palette)}>
                            {parseCustomizationNumber(option?.price) > 0 ? '+' : ''}
                            {Formatter.formatMoney(
                              parseCustomizationNumber(option?.price),
                              'R$',
                              'pt-br',
                            )}
                          </Text>
                          {selected && option.hasNestedGroups ? (
                            <TouchableOpacity
                              accessibilityLabel={`Editar ${productName(option.productChild)}`}
                              onPress={() => openExistingEditor(groupId, option)}
                              style={nestedEditButtonStyle(palette)}>
                              <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color={palette.primary}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={nestedFooterStyle(palette)}>
            <TouchableOpacity onPress={onCancel} style={nestedSecondaryButtonStyle(palette)}>
              <Text style={nestedButtonTextStyle(palette, false)}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Confirmar personalizacao de ${productName(product)}`}
              disabled={!canSave}
              onPress={save}
              style={nestedPrimaryButtonStyle(palette, !canSave)}>
              <Text style={nestedButtonTextStyle(palette, true)}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {childEditor ? (
        <NestedCustomizationModal
          initialTree={childEditor.option?.sub_products || []}
          onCancel={() => setChildEditor(null)}
          onSave={saveChild}
          palette={palette}
          preloadedGroups={childEditor.groups}
          product={childEditor.option?.productChild}
          productGroupActions={productGroupActions}
          productGroupProductActions={productGroupProductActions}
          visible
        />
      ) : null}
    </Modal>
  );
};

export default NestedCustomizationModal;
