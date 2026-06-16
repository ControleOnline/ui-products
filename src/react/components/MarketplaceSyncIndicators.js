import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getOrderChannelLogo } from '@assets/ppc/channels';
import styles from './MarketplaceSyncIndicators.styles';

const PLATFORM_LABELS = {
  '99food': '99Food',
  ifood: 'iFood',
};

const getPlatformKey = status =>
  status?.platform?.key || status?.platform?.platform || status?.platform || '';

const getPlatformLabel = status => {
  const key = getPlatformKey(status);
  return status?.platform?.label || PLATFORM_LABELS[key] || key;
};

const getStatusTone = status => {
  if (status?.synced) return '#16A34A';
  if (status?.dirty) return '#e67e22';
  return '#94A3B8';
};

const getStatusLabel = status => {
  if (status?.synced) return 'Sincronizado';
  if (status?.dirty) return 'Pendente de sincronizacao';
  if (status?.published) return 'Publicado, aguardando sincronizacao';
  return 'Nao sincronizado';
};

const buildDetailRows = status => [
  ['Status', getStatusLabel(status)],
  ['ID na plataforma', status?.remote_id || '-'],
  ['Ultima sincronizacao', status?.last_synced_at || '-'],
  ['Elegivel', status?.eligible ? 'Sim' : 'Nao'],
].filter(Boolean);

export default function MarketplaceSyncIndicators({
  entityLabel = '',
  entityType = 'product',
  onSync,
  size = 'default',
  statuses = [],
  syncingKey = '',
}) {
  const activeStatuses = useMemo(
    () => (Array.isArray(statuses) ? statuses : []).filter(status => getPlatformKey(status)),
    [statuses],
  );
  const [selectedStatus, setSelectedStatus] = useState(null);

  if (activeStatuses.length === 0) {
    return null;
  }

  const selectedKey = getPlatformKey(selectedStatus);
  const selectedLabel = selectedStatus ? getPlatformLabel(selectedStatus) : '';
  const selectedSyncKey = `${entityType}:${selectedKey}:${selectedStatus?.id || ''}`;
  const isSyncing = syncingKey === selectedSyncKey || syncingKey === 'all';
  const canSync = selectedStatus?.eligible !== false && typeof onSync === 'function';
  const isComfortable = size === 'comfortable';

  const handleSync = async () => {
    if (!selectedStatus || !canSync) return;
    try {
      await onSync(selectedKey, selectedStatus, selectedSyncKey);
      setSelectedStatus(null);
    } catch {
      // Parent handlers surface the error message to the user.
    }
  };

  return (
    <>
      <View style={styles.iconRow}>
        {activeStatuses.map(status => {
          const platformKey = getPlatformKey(status);
          const logo = getOrderChannelLogo({ app: platformKey });
          const tone = getStatusTone(status);

          return (
            <TouchableOpacity
              key={platformKey}
              activeOpacity={0.78}
              onPress={event => {
                event?.stopPropagation?.();
                setSelectedStatus(status);
              }}
              style={[
                styles.iconButton,
                isComfortable && styles.iconButtonComfortable,
                !status?.synced && styles.iconButtonMuted,
                { borderColor: `${tone}55` },
              ]}
            >
              {logo ? (
                <Image
                  source={logo}
                  style={[
                    styles.logo,
                    isComfortable && styles.logoComfortable,
                    !status?.synced && styles.logoMuted,
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <MaterialCommunityIcons name="cloud-sync-outline" size={isComfortable ? 16 : 14} color={tone} />
              )}
              <View
                style={[
                  styles.statusDot,
                  isComfortable && styles.statusDotComfortable,
                  { backgroundColor: tone },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={!!selectedStatus}
        onRequestClose={() => setSelectedStatus(null)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setSelectedStatus(null)}
            style={styles.modalOverlay}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>{selectedLabel}</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {entityLabel || (entityType === 'category' ? 'Categoria' : 'Produto')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedStatus(null)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusSummary}>
              <View style={[styles.summaryDot, { backgroundColor: getStatusTone(selectedStatus) }]} />
              <Text style={styles.summaryText}>{getStatusLabel(selectedStatus)}</Text>
            </View>

            <View style={styles.detailsList}>
              {buildDetailRows(selectedStatus).map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
                </View>
              ))}
              {Array.isArray(selectedStatus?.blockers) && selectedStatus.blockers.length > 0 && (
                <View style={styles.blockersBox}>
                  <Text style={styles.blockersTitle}>Pendencias</Text>
                  <Text style={styles.blockersText}>{selectedStatus.blockers.join('; ')}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSync || isSyncing}
              onPress={handleSync}
              style={[
                styles.syncButton,
                (!canSync || isSyncing) && styles.syncButtonDisabled,
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Sincronizando...' : 'Sincronizar este item'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
