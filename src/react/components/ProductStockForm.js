import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/*
 * Tabela product_inventory (campos reais):
 *   id, inventory_id, product_id, available, sales, ordered, transit, minimum, maximum
 */

const fmtN = v => {
  const n = parseFloat(String(v ?? 0).replace(',', '.'));
  return isNaN(n) ? '0' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const StockSkeletonLine = ({ width = '100%', height = 14, mb = 10 }) => (
  <View style={{ width, height, borderRadius: 7, backgroundColor: '#E2E8F0', marginBottom: mb }} />
);

const StockTabSkeleton = () => (
  <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
    {[1, 2].map(i => (
      <View key={i} style={{
        backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
      }}>
        <StockSkeletonLine width="40%" height={13} mb={14} />
        {[1, 2, 3].map(j => (
          <View key={j} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <StockSkeletonLine width="50%" height={13} mb={0} />
            <StockSkeletonLine width="25%" height={13} mb={0} />
          </View>
        ))}
      </View>
    ))}
  </ScrollView>
);

const ProductStockForm = ({ ProductId }) => {
  const productsStore = useStore('products');
  const peopleStore = useStore('people');
  const { actions: productActions } = productsStore;
  const { currentCompany } = peopleStore.getters;

  const [inventoryRows, setInventoryRows] = useState(null);

  useEffect(() => {
    if (!currentCompany?.id || !ProductId) return;
    productActions
      .getInventory({ company: currentCompany.id })
      .then(data => {
        const pid = String(ProductId).replace(/\D/g, '');
        const filtered = (data || []).filter(row => String(row.product_id) === pid);
        setInventoryRows(filtered);
      })
      .catch(() => setInventoryRows([]));
  }, [currentCompany?.id, ProductId]);

  if (!ProductId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Salve o produto para visualizar o estoque.</Text>
      </View>
    );
  }

  if (inventoryRows === null) {
    return (
      <View style={styles.container}>
        <StockTabSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StateStore store="products" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Estoque por Depósito</Text>

          {inventoryRows.length === 0 ? (
            <View style={styles.emptyBlock}>
              <MaterialCommunityIcons name="archive-outline" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyCardText}>Nenhum registro de estoque para este produto.</Text>
            </View>
          ) : (
            inventoryRows.map((row, idx) => (
              <View key={`${row.inventory_id}-${idx}`} style={styles.snapshotCard}>
                <View style={styles.snapshotCardHeader}>
                  <MaterialCommunityIcons name="warehouse" size={16} color="#166534" style={{ marginRight: 6 }} />
                  <Text style={styles.snapshotCardTitle}>{row.inventory_name || `Depósito ${row.inventory_id}`}</Text>
                </View>

                <View style={styles.snapshotGrid}>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Disponível</Text>
                    <Text style={[styles.snapshotCellValue, { color: '#166534' }]}>{fmtN(row.available)}</Text>
                  </View>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Vendas</Text>
                    <Text style={styles.snapshotCellValue}>{fmtN(row.sales)}</Text>
                  </View>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Pedidos</Text>
                    <Text style={styles.snapshotCellValue}>{fmtN(row.ordered)}</Text>
                  </View>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Trânsito</Text>
                    <Text style={styles.snapshotCellValue}>{fmtN(row.transit)}</Text>
                  </View>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Mínimo</Text>
                    <Text style={styles.snapshotCellValue}>{fmtN(row.minimum)}</Text>
                  </View>
                  <View style={styles.snapshotCell}>
                    <Text style={styles.snapshotCellLabel}>Máximo</Text>
                    <Text style={styles.snapshotCellValue}>{fmtN(row.maximum)}</Text>
                  </View>
                </View>

                {row.company_name && (
                  <Text style={styles.snapshotCompany}>{row.company_name}</Text>
                )}
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { padding: 16 },
  emptyText: { fontSize: 14, color: '#64748B' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  emptyBlock: { alignItems: 'center', paddingVertical: 24 },
  emptyCardText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  snapshotCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  snapshotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  snapshotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    flex: 1,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  snapshotCell: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  snapshotCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  snapshotCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  snapshotCompany: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'right',
  },
});

export default ProductStockForm;
