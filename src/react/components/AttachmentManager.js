import React, {useMemo, useState} from 'react';
import {Platform, Text, TouchableOpacity, View, Image, ScrollView} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {useStore} from '@store';
import {env} from '@env';
import {uploadFileToApi, toFileIri} from '@controleonline/ui-products/src/react/services/fileUpload';

import {
  inlineStyle_133_10,
  inlineStyle_134_12,
  inlineStyle_135_14,
  inlineStyle_139_10,
  inlineStyle_145_16,
  inlineStyle_149_25,
  inlineStyle_150_24,
  inlineStyle_153_14,
  inlineStyle_154_16,
  inlineStyle_158_16,
  inlineStyle_164_18,
  inlineStyle_173_20,
  inlineStyle_181_54,
  inlineStyle_190_20,
  inlineStyle_197_22,
  inlineStyle_208_20,
  inlineStyle_209_26,
} from './AttachmentManager.styles';

const getFileId = file => {
  const val = file?.id || file?.['@id'] || file;
  const match = String(val || '').match(/(\d+)$/);
  return match ? match[1] : null;
};

const getRelationId = relation => {
  const val = relation?.id || relation?.['@id'] || relation;
  const match = String(val || '').match(/(\d+)$/);
  return match ? match[1] : null;
};

const buildImageUrl = file => {
  const fileId = getFileId(file);
  if (!fileId) return null;
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '');
  return `${env.API_ENTRYPOINT}/files/${fileId}/download?app-domain=${encodeURIComponent(host)}`;
};

const AttachmentManager = ({
  entityType,
  entityId,
  attachments = [],
  companyId,
  context = 'products',
  onChanged,
  coverRelationId,
  onCoverChanged,
}) => {
  const relationStoreName = entityType === 'category' ? 'category_file' : 'product_file';
  const relationField = entityType === 'category' ? 'category' : 'product';
  const relationResource = entityType === 'category' ? 'categories' : 'products';
  const relationStore = useStore(relationStoreName);
  const relationActions = relationStore.actions;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [coverId, setCoverId] = useState(coverRelationId || null);

  const sortedAttachments = useMemo(() => {
    if (!coverId) return attachments;
    const index = attachments.findIndex(item => String(item.id) === String(coverId));
    if (index < 0) return attachments;
    const copy = [...attachments];
    const [selected] = copy.splice(index, 1);
    copy.unshift(selected);
    return copy;
  }, [attachments, coverId]);

  React.useEffect(() => {
    setCoverId(coverRelationId || null);
  }, [coverRelationId]);

  const selectFile = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = event => resolve(event?.target?.files?.[0] || null);
        input.click();
      });
    }

    return DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    }).then(result => {
      if (result.canceled) return null;
      return result.assets?.[0] || null;
    });
  };

  const handleUpload = async () => {
    setError('');
    setStatus('');
    if (!entityId) {
      setError('Salve o registro antes de anexar imagens.');
      return;
    }

    const file = await selectFile();
    if (!file) return;

    try {
      setUploading(true);
      const uploadedFile = await uploadFileToApi({
        file,
        context,
        peopleId: companyId,
      });
      const fileIri = toFileIri(uploadedFile);
      if (!fileIri) throw new Error('Upload sem retorno de arquivo.');

      await relationActions.save({
        [relationField]: `/${relationResource}/${entityId}`,
        file: fileIri,
      });

      setStatus('Imagem anexada com sucesso.');
      if (onChanged) await onChanged();
    } catch (e) {
      setError(e?.message || 'Falha ao anexar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async relation => {
    try {
      setError('');
      setStatus('');
      const relationId = getRelationId(relation);
      if (!relationId) throw new Error('Anexo sem identificador para remocao.');
      await relationActions.remove(relationId);
      setStatus('Imagem removida.');
      if (onChanged) await onChanged();
    } catch (e) {
      setError(e?.message || 'Falha ao remover imagem.');
    }
  };

  return (
    <View style={inlineStyle_133_10}>
      <View style={inlineStyle_134_12}>
        <Text style={inlineStyle_135_14}>Imagens anexas</Text>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          style={inlineStyle_139_10}>
          <Text style={inlineStyle_145_16}>{uploading ? 'Enviando...' : '+ Anexar Imagem'}</Text>
        </TouchableOpacity>
      </View>
      {!!status && <Text style={inlineStyle_149_25}>{status}</Text>}
      {!!error && <Text style={inlineStyle_150_24}>{error}</Text>}
      {sortedAttachments.length === 0 ? (
        <View style={inlineStyle_153_14}>
          <Text style={inlineStyle_154_16}>Nenhuma imagem anexada.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={inlineStyle_158_16}>
            {sortedAttachments.map((row, idx) => {
              const imageUrl = buildImageUrl(row.file);
              return (
                <View
                  key={row.id || idx}
                  style={inlineStyle_164_18}>
                  <View
                    style={inlineStyle_173_20}>
                    {!!imageUrl && (
                      <Image source={{uri: imageUrl}} style={inlineStyle_181_54} resizeMode="cover" />
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      setCoverId(row.id);
                      if (onCoverChanged) await onCoverChanged(row);
                    }}
                    style={inlineStyle_190_20({
                      coverId: coverId,
                      row: row,
                    })}>
                    <Text
                      style={inlineStyle_197_22({
                        coverId: coverId,
                        row: row,
                      })}>
                      {String(coverId) === String(row.id) ? 'Capa selecionada ✓' : 'Definir como capa'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemove(row)}
                    style={inlineStyle_208_20}>
                    <Text style={inlineStyle_209_26}>Remover</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default AttachmentManager;
