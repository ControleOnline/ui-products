// SummaryPanel — extracted from CustomizeScreen.js for QA line-limit compliance.
// Renders the price summary card plus the quantity stepper.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  customizeQuantityPillStyle,
  customizeQuantityPillTextStyle,
  customizeQuantityRowStyle,
  customizeQuantityStepperButtonStyle,
  customizeQuantityStepperStyle,
  customizeSummaryCardStyle,
  customizeSummaryGroupItemStyle,
  customizeSummaryGroupListStyle,
  customizeSummaryGroupNameStyle,
  customizeSummaryGroupStateStyle,
  customizeSummaryHeaderStyle,
  customizeSummaryKickerStyle,
  customizeSummaryLabelStyle,
  customizeSummaryLineStyle,
  customizeSummaryTitleStyle,
  customizeSummaryTotalStyle,
  customizeSummaryValueStyle,
} from './CustomizeScreen.styles';
import {formatOptionQuantity, resolvePositiveQuantity} from './customizeScreenHelpers';

const SummaryPanel = ({
  palette,
  compact,
  groupSummaries,
  selectedOptionsLabel,
  itemTotal,
  basePrice,
  complementsTotal,
  resolvedItemQuantity,
  isSingleItemCustomizationFlow,
  activeProduct,
  quantityTouchedRef,
  setItemQuantity,
}) => (
  <View style={customizeSummaryCardStyle({palette})}>
    <View style={customizeSummaryHeaderStyle}>
      <View>
        <Text style={customizeSummaryTitleStyle({palette})}>
          Resumo do item
        </Text>
        <Text style={customizeSummaryKickerStyle({palette})}>
          {selectedOptionsLabel}
        </Text>
      </View>
      <Text style={customizeSummaryKickerStyle({palette})}>total</Text>
    </View>
    <Text style={customizeSummaryTotalStyle({palette})}>
      {Formatter.formatMoney(itemTotal, 'R$', 'pt-br')}
    </Text>
    <View style={customizeSummaryLineStyle({palette})}>
      <Text style={customizeSummaryLabelStyle({palette})}>Preco base</Text>
      <Text style={customizeSummaryValueStyle({palette})}>
        {Formatter.formatMoney(basePrice, 'R$', 'pt-br')}
      </Text>
    </View>
    <View style={customizeSummaryLineStyle({palette})}>
      <Text style={customizeSummaryLabelStyle({palette})}>Complementos</Text>
      <Text style={customizeSummaryValueStyle({palette})}>
        {Formatter.formatMoney(complementsTotal, 'R$', 'pt-br')}
      </Text>
    </View>
    {!compact ? (
      <View style={customizeSummaryGroupListStyle}>
        {groupSummaries.map(summary => (
          <View
            key={summary.groupId}
            style={customizeSummaryGroupItemStyle({palette})}>
            <Text
              style={customizeSummaryGroupNameStyle({palette})}
              numberOfLines={1}>
              {summary.groupName}
            </Text>
            <Text
              style={customizeSummaryGroupStateStyle({
                palette,
                valid: summary.isValid,
              })}>
              {summary.isValid
                ? `${summary.selectedCount}/${summary.maximum || summary.minimum || '-'}`
                : 'pendente'}
            </Text>
          </View>
        ))}
      </View>
    ) : null}
    {!isSingleItemCustomizationFlow ? (
      <View style={customizeQuantityRowStyle}>
        <Text style={customizeSummaryLabelStyle({palette})}>Quantidade</Text>
        <View style={customizeQuantityStepperStyle}>
          <TouchableOpacity
            accessibilityLabel={`Diminuir quantidade de ${activeProduct?.product || 'produto personalizado'}`}
            onPress={() => {
              quantityTouchedRef.current = true;
              setItemQuantity(current =>
                Math.max(1, resolvePositiveQuantity(current) - 1),
              );
            }}
            disabled={resolvedItemQuantity <= 1}
            style={customizeQuantityStepperButtonStyle({
              palette,
              disabled: resolvedItemQuantity <= 1,
            })}
            activeOpacity={0.82}>
            <MaterialCommunityIcons
              name="minus"
              size={16}
              color={resolvedItemQuantity <= 1 ? palette.faint : palette.primary}
            />
          </TouchableOpacity>
          <View style={customizeQuantityPillStyle({palette})}>
            <Text style={customizeQuantityPillTextStyle({palette})}>
              {formatOptionQuantity(resolvedItemQuantity)} un
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={`Aumentar quantidade de ${activeProduct?.product || 'produto personalizado'}`}
            onPress={() => {
              quantityTouchedRef.current = true;
              setItemQuantity(current => resolvePositiveQuantity(current) + 1);
            }}
            style={customizeQuantityStepperButtonStyle({palette})}
            activeOpacity={0.82}>
            <MaterialCommunityIcons
              name="plus"
              size={16}
              color={palette.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
  </View>
);

export default SummaryPanel;
