import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from '../Products.styles';

const ProductsSupplyHeader = ({
  brandColors,
  context,
  onOpenTypeModal,
  selectedSupplyType,
}) => {
  if (context !== 'supplies') return null;

  return (
    <View style={styles.supplyHeader}>
      <View style={styles.supplyHeaderText}>
        <Text style={styles.supplyHeaderTitle}>Cadastro mestre de insumos</Text>
        <Text style={styles.supplyHeaderDescription}>
          Separe fontes de custo dos componentes operacionais antes de vincular fichas técnicas.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.supplyTypeSelector}
        onPress={onOpenTypeModal}
        activeOpacity={0.75}
      >
        <View style={styles.supplyTypeSelectorIcon}>
          <MaterialCommunityIcons
            name={selectedSupplyType.icon}
            size={16}
            color={brandColors.primary}
          />
        </View>
        <View style={styles.supplyTypeSelectorText}>
          <Text style={styles.supplyTypeSelectorLabel}>Visualização</Text>
          <Text style={styles.supplyTypeSelectorValue} numberOfLines={1}>
            {selectedSupplyType.label}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
};

export default ProductsSupplyHeader;
