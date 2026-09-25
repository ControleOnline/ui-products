// GroupCard — extracted from CustomizeScreen.js for QA line-limit compliance.
// Renders a single customization group (header + options list).

import React from 'react';
import {Text, View} from 'react-native';
import {
  customizeGroupCardStyle,
  customizeGroupErrorStyle,
  customizeGroupHeaderStyle,
  customizeGroupMetaStyle,
  customizeGroupRuleStyle,
  customizeGroupTitleRowStyle,
  customizeGroupTitleStyle,
  customizeOptionsStackStyle,
} from './CustomizeScreen.styles';
import {
  normalizeEntityId,
  resolveCompactGroupStateLabel,
  resolveCompactSelectionRuleLabel,
} from './customizeScreenHelpers';
import OptionRow from './OptionRow';

const GroupCard = ({
  group,
  summary,
  processedOptions,
  palette,
  selectedItems,
  optionProductsById,
  onToggleOption,
  onInspectNested,
}) => {
  const compactSummaryParts = [
    summary?.isRequired ? 'Obrigatorio' : 'Opcional',
    resolveCompactSelectionRuleLabel(
      summary?.minimum || 0,
      summary?.maximum ?? null,
    ),
    `preco: ${summary?.priceCalculationLabel || 'soma'}`,
  ];

  return (
    <View
      style={customizeGroupCardStyle({
        palette,
        isInvalid: !summary?.isValid,
      })}>
      <View style={customizeGroupHeaderStyle({palette})}>
        <View style={customizeGroupTitleRowStyle}>
          <Text style={customizeGroupTitleStyle({palette})} numberOfLines={2}>
            {group.productGroup}
          </Text>
          <Text style={customizeGroupRuleStyle({palette})}>
            {compactSummaryParts.join(' • ')}
          </Text>
        </View>
        <Text style={customizeGroupMetaStyle({palette})}>
          {resolveCompactGroupStateLabel(summary)}
        </Text>
        {!summary?.isValid ? (
          <Text style={customizeGroupErrorStyle({palette})}>
            {summary.validationMessage}
          </Text>
        ) : null}
      </View>
      <View style={customizeOptionsStackStyle}>
        {processedOptions.map((item, index) => (
          <OptionRow
            key={`${normalizeEntityId(group?.id || group?.['@id'])}-${index}`}
            group={group}
            option={item}
            index={index}
            palette={palette}
            selectedItems={selectedItems}
            optionProductsById={optionProductsById}
            onToggle={onToggleOption}
            onInspectNested={onInspectNested}
          />
        ))}
      </View>
    </View>
  );
};

export default GroupCard;
