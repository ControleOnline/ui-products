// OptionRow — extracted from CustomizeScreen.js for QA line-limit compliance.
// Renders a single selectable option within a customization group.

import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {nestedEditButtonStyle} from '../components/NestedCustomizationModal.styles';
import {
  customizeOptionBodyStyle,
  customizeOptionControlInnerStyle,
  customizeOptionControlStyle,
  customizeOptionImageStyle,
  customizeOptionImageWrapStyle,
  customizeOptionMetaStyle,
  customizeOptionNameStyle,
  customizeOptionNestedGroupStyle,
  customizeOptionNestedGroupTitleStyle,
  customizeOptionNestedItemNameStyle,
  customizeOptionNestedItemPriceStyle,
  customizeOptionNestedItemRowStyle,
  customizeOptionNestedSummaryStyle,
  customizeOptionNestedTotalStyle,
  customizeOptionPlaceholderTextStyle,
  customizeOptionPriceStackStyle,
  customizeOptionPriceStyle,
  customizeOptionTrailingStyle,
  customizeOptionTouchableStyle,
} from './CustomizeScreen.styles';
import {
  buildCoverUrl,
  formatOptionQuantity,
  normalizeEntityId,
  parseNumericValue,
  resolveProductInitial,
} from './customizeScreenHelpers';
import {
  calculateCustomizationTreePrice,
  summarizeCustomizationTree,
} from '../domain/customizationTree';

const NestedSummaryGroups = ({groups, optionId, palette, depth = 0}) =>
  groups.map(nestedGroup => (
    <View
      key={`${optionId}-${depth}-${nestedGroup.groupId}`}
      style={[
        customizeOptionNestedGroupStyle,
        depth > 0 ? {marginLeft: Math.min(depth, 3) * 8} : null,
      ]}>
      <Text
        style={customizeOptionNestedGroupTitleStyle({palette})}
        numberOfLines={1}>
        {nestedGroup.groupName}
      </Text>
      {nestedGroup.items.map(nestedItem => (
        <View key={`${nestedGroup.groupId}-${nestedItem.productId}`}>
          <View style={customizeOptionNestedItemRowStyle}>
            <Text
              style={customizeOptionNestedItemNameStyle({palette})}
              numberOfLines={1}>
              {nestedItem.productName}
            </Text>
            {nestedItem.price > 0 ? (
              <Text style={customizeOptionNestedItemPriceStyle({palette})}>
                +{Formatter.formatMoney(nestedItem.price, 'R$', 'pt-br')}
              </Text>
            ) : null}
          </View>
          <NestedSummaryGroups
            groups={nestedItem.groups}
            optionId={optionId}
            palette={palette}
            depth={depth + 1}
          />
        </View>
      ))}
    </View>
  ));

const OptionRow = ({
  group,
  option,
  index,
  palette,
  selectedItems,
  optionProductsById,
  onToggle,
  onInspectNested,
}) => {
  const groupId = String(normalizeEntityId(group?.id || group?.['@id']));
  const isOptionSelected =
    (selectedItems[groupId] || []).some(
      item => item['@id'] === option?.value?.['@id'] && item.selected,
    ) || false;

  const optionQuantityLabel = formatOptionQuantity(option.value?.quantity || 1);
  const baseOptionProduct = option.value?.productChild;
  const optionProductId = normalizeEntityId(
    baseOptionProduct?.id || baseOptionProduct?.['@id'],
  );
  const hydratedOptionProduct = optionProductId
    ? optionProductsById[optionProductId]
    : null;
  const optionProduct = hydratedOptionProduct
    ? {...baseOptionProduct, ...hydratedOptionProduct}
    : baseOptionProduct;
  const optionImageUrl = buildCoverUrl(optionProduct);
  const optionPrice = parseNumericValue(option.value?.price);
  const optionUnitLabel =
    optionProduct?.productUnit?.productUnit ||
    optionProduct?.productUnity?.productUnit ||
    optionProduct?.productUnit?.unit ||
    optionProduct?.productUnity?.unit ||
    '';
  const selectedOptionState = (selectedItems[groupId] || []).find(
    item => item?.['@id'] === option?.value?.['@id'],
  );
  const hasNestedCustomization =
    isOptionSelected && selectedOptionState?.hasNestedGroups;
  const nestedCustomizationPending =
    isOptionSelected &&
    ['checking', 'pending', 'invalid'].includes(selectedOptionState?.nestedState);
  const nestedSummaryGroups = isOptionSelected
    ? summarizeCustomizationTree(selectedOptionState?.sub_products)
    : [];
  const nestedAdditionalPrice = isOptionSelected
    ? calculateCustomizationTreePrice(selectedOptionState?.sub_products)
    : 0;

  return (
    <TouchableOpacity
      key={`${group.id}-${index}`}
      accessibilityLabel={`Selecionar ${option.label}`}
      onPress={() => onToggle(groupId, option)}
      style={customizeOptionTouchableStyle({
        palette,
        selected: isOptionSelected,
        disabled: option.disable,
      })}
      disabled={option.disable}
      activeOpacity={0.78}>
      <View
        style={customizeOptionControlStyle({
          palette,
          selected: isOptionSelected,
        })}>
        {isOptionSelected ? (
          <View style={customizeOptionControlInnerStyle({palette})} />
        ) : null}
      </View>
      <View style={customizeOptionImageWrapStyle({palette})}>
        {optionImageUrl ? (
          <Image
            source={{uri: optionImageUrl}}
            style={customizeOptionImageStyle}
            resizeMode="cover"
          />
        ) : (
          <Text style={customizeOptionPlaceholderTextStyle({palette})}>
            {resolveProductInitial(optionProduct)}
          </Text>
        )}
      </View>
      <View style={customizeOptionBodyStyle}>
        <Text style={customizeOptionNameStyle({palette})} numberOfLines={1}>
          {option.label}
        </Text>
        <Text style={customizeOptionMetaStyle({palette})} numberOfLines={1}>
          Adiciona {optionQuantityLabel}
          {optionUnitLabel ? ` ${optionUnitLabel}` : ''}
          {nestedCustomizationPending ? ' • personalizacao pendente' : ''}
          {hasNestedCustomization && !nestedCustomizationPending
            ? ' • personalizado'
            : ''}
        </Text>
        {nestedSummaryGroups.length > 0 ? (
          <View style={customizeOptionNestedSummaryStyle({palette})}>
            <NestedSummaryGroups
              groups={nestedSummaryGroups}
              optionId={option.value?.['@id']}
              palette={palette}
            />
          </View>
        ) : null}
      </View>
      <View style={customizeOptionTrailingStyle}>
        {hasNestedCustomization ? (
          <TouchableOpacity
            accessibilityLabel={`Personalizar ${option.label}`}
            onPress={() => onInspectNested(groupId, option)}
            style={nestedEditButtonStyle(palette)}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={palette.primary}
            />
          </TouchableOpacity>
        ) : null}
        <View style={customizeOptionPriceStackStyle}>
          <Text
            style={customizeOptionPriceStyle({
              palette,
              selected: isOptionSelected,
            })}>
            {optionPrice > 0 ? '+' : ''}
            {Formatter.formatMoney(optionPrice, 'R$', 'pt-br')}
          </Text>
          {nestedAdditionalPrice > 0 ? (
            <Text style={customizeOptionNestedTotalStyle({palette})}>
              +{Formatter.formatMoney(nestedAdditionalPrice, 'R$', 'pt-br')} adicionais
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default OptionRow;
