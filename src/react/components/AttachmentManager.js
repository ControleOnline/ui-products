import React, {useMemo, useState} from 'react';
import {Platform, Text, TouchableOpacity, View, Image, ScrollView} from 'react-native';
import {useStore} from '@store';
import {env} from '@env';
import {uploadFileToApi, toFileIri} from '@controleonline/ui-products/src/react/services/fileUpload';

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

  const selectFileOnWeb = () =>
    new Promise(resolve => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') {
        resolve(null);
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = event => resolve(event?.target?.files?.[0] || null);
      input.click();
    });

  const handleUpload = async () => {
    setError('');
    setStatus('');
    if (!entityId) {
      setError('Salve o registro antes de anexar imagens.');
      return;
    }

    const file = await selectFileOnWeb();
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
    <View style={{width: '100%', marginTop: 8}}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
        <Text style={{flex: 1, fontWeight: '600'}}>Imagens anexas</Text>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading}
          style={{
            backgroundColor: '#000',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
          }}>
          <Text style={{color: '#fff'}}>{uploading ? 'Enviando...' : '+ Anexar Imagem'}</Text>
        </TouchableOpacity>
      </View>

      {!!status && <Text style={{color: '#1b7f34', marginBottom: 6}}>{status}</Text>}
      {!!error && <Text style={{color: '#b00020', marginBottom: 6}}>{error}</Text>}

      {sortedAttachments.length === 0 ? (
        <View style={{borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10}}>
          <Text style={{color: '#666'}}>Nenhuma imagem anexada.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{flexDirection: 'row', gap: 10}}>
            {sortedAttachments.map((row, idx) => {
              const imageUrl = buildImageUrl(row.file);
              return (
                <View
                  key={row.id || idx}
                  style={{
                    width: 170,
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: '#fff',
                  }}>
                  <View
                    style={{
                      height: 120,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 6,
                      overflow: 'hidden',
                      marginBottom: 8,
                    }}>
                    {!!imageUrl && (
                      <Image source={{uri: imageUrl}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={async () => {
                      setCoverId(row.id);
                      if (onCoverChanged) await onCoverChanged(row);
                    }}
                    style={{
                      backgroundColor: String(coverId) === String(row.id) ? '#00695c' : '#efefef',
                      paddingVertical: 6,
                      borderRadius: 4,
                      marginBottom: 6,
                    }}>
                    <Text
                      style={{
                        textAlign: 'center',
                        color: String(coverId) === String(row.id) ? '#fff' : '#111',
                        fontSize: 12,
                      }}>
                      {String(coverId) === String(row.id) ? 'Capa selecionada' : 'Definir capa (local)'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRemove(row)}
                    style={{backgroundColor: '#b00020', paddingVertical: 6, borderRadius: 4}}>
                    <Text style={{textAlign: 'center', color: '#fff', fontSize: 12}}>Remover</Text>
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
