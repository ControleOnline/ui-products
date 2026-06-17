import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useStore} from '@store';
import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';
import {resolveFileImageUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {uploadFileToApi, toFileIri} from '@controleonline/ui-products/src/react/services/fileUpload';

import {
  attachmentLibraryStyles as libraryStyles,
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

const DEFAULT_LIBRARY_CONTEXTS = ['products', 'products-category'];

const getRelationId = relation => {
  const val = relation?.id || relation?.['@id'] || relation;
  const match = String(val || '').match(/(\d+)$/);
  return match ? match[1] : null;
};

const normalizeCollection = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const getFileId = file => getRelationId(file);

const getRelationFileId = relation => getFileId(relation?.file);

const getPeopleIri = companyId => {
  const id = getRelationId(companyId);
  return id ? `/people/${id}` : null;
};

const getFileName = file => {
  const id = getFileId(file);
  return file?.fileName || file?.name || file?.originalName || (id ? `Arquivo ${id}` : 'Arquivo');
};

const getContextLabel = context => {
  if (context === 'products') return 'products';
  if (context === 'products-category') return 'products-category';
  return context || 'sem contexto';
};

const dedupeFiles = files => {
  const seen = new Set();
  return files.filter(file => {
    const id = getFileId(file);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const AttachmentManager = ({
  entityType,
  entityId,
  attachments = [],
  companyId,
  context = 'products',
  libraryContexts = DEFAULT_LIBRARY_CONTEXTS,
  onChanged,
  coverRelationId,
  onCoverChanged,
}) => {
  const relationStoreName = entityType === 'category' ? 'category_file' : 'product_file';
  const relationField = entityType === 'category' ? 'category' : 'product';
  const relationResource = entityType === 'category' ? 'categories' : 'products';
  const relationStore = useStore(relationStoreName);
  const fileStore = useStore('file');
  const relationActions = relationStore.actions;
  const fileActions = fileStore.actions;

  const attachmentRows = Array.isArray(attachments) ? attachments : [];
  const libraryContextKey = useMemo(() => libraryContexts.join('|'), [libraryContexts]);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [coverId, setCoverId] = useState(coverRelationId || null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [savingFileId, setSavingFileId] = useState(null);

  const sortedAttachments = useMemo(() => {
    if (!coverId) return attachmentRows;
    const index = attachmentRows.findIndex(item => String(item.id) === String(coverId));
    if (index < 0) return attachmentRows;
    const copy = [...attachmentRows];
    const [selected] = copy.splice(index, 1);
    copy.unshift(selected);
    return copy;
  }, [attachmentRows, coverId]);

  const attachedFileIds = useMemo(() => {
    return new Set(
      attachmentRows
        .map(getRelationFileId)
        .filter(Boolean)
        .map(String),
    );
  }, [attachmentRows]);

  const filteredLibraryFiles = useMemo(() => {
    const query = String(librarySearch || '').trim().toLowerCase();
    if (!query) return libraryFiles;

    return libraryFiles.filter(file => {
      const name = getFileName(file).toLowerCase();
      const fileContext = String(file?.context || '').toLowerCase();
      return name.includes(query) || fileContext.includes(query);
    });
  }, [libraryFiles, librarySearch]);

  useEffect(() => {
    setCoverId(coverRelationId || null);
  }, [coverRelationId]);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');

    const people = getPeopleIri(companyId);
    const contexts = libraryContextKey.split('|').filter(Boolean);

    try {
      const pageSize = 500;
      const maxPages = 10;
      const fetchContextFiles = async fileContext => {
        const contextFiles = [];

        for (let page = 1; page <= maxPages; page += 1) {
          const params = {
            context: fileContext,
            fileType: 'image',
            page,
            'order[fileName]': 'ASC',
          };
          if (people) params.people = people;

          const response = await fileActions.getItems(params);
          const pageItems = normalizeCollection(response);
          contextFiles.push(...pageItems);
          if (pageItems.length < pageSize) break;
        }

        return contextFiles;
      };

      const responses = await Promise.all(
        contexts.map(fileContext => fetchContextFiles(fileContext).catch(fetchError => ({fetchError}))),
      );

      const files = responses
        .filter(response => !response?.fetchError)
        .flatMap(normalizeCollection)
        .filter(file => !file?.fileType || String(file.fileType).toLowerCase() === 'image');

      const firstError = responses.find(response => response?.fetchError)?.fetchError;
      if (files.length === 0 && firstError) throw firstError;

      setLibraryFiles(dedupeFiles(files));
    } catch (e) {
      setLibraryFiles([]);
      setLibraryError(e?.message || 'Falha ao carregar imagens.');
    } finally {
      setLibraryLoading(false);
    }
  }, [companyId, libraryContextKey]);

  useEffect(() => {
    if (managerOpen) loadLibrary();
  }, [managerOpen]);

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

  const attachFileToEntity = useCallback(async (fileObj, options = {}) => {
    const {successMessage = 'Imagem anexada com sucesso.', closeManager = false} = options;
    setError('');
    setStatus('');

    if (!entityId) {
      setError('Salve o registro antes de anexar imagens.');
      return null;
    }

    const fileIri = toFileIri(fileObj);
    if (!fileIri) throw new Error('Arquivo sem identificador.');

    const fileId = getFileId(fileObj);
    if (fileId && attachedFileIds.has(String(fileId))) {
      setStatus('Imagem ja anexada.');
      return null;
    }

    try {
      const savedRelation = await relationActions.save({
        [relationField]: `/${relationResource}/${entityId}`,
        file: fileIri,
      });

      setStatus(successMessage);
      if (onChanged) await onChanged();
      if (closeManager) setManagerOpen(false);
      return savedRelation;
    } catch (e) {
      const message = String(e?.message || e?.response?.data?.detail || '');
      if (/unique|duplicate|duplic/i.test(message)) {
        setStatus('Imagem ja anexada.');
        if (onChanged) await onChanged();
        return null;
      }
      throw e;
    }
  }, [
    attachedFileIds,
    entityId,
    onChanged,
    relationActions,
    relationField,
    relationResource,
  ]);

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

      await attachFileToEntity(uploadedFile, {
        successMessage: 'Imagem enviada e anexada.',
      });
      await loadLibrary();
    } catch (e) {
      setError(e?.message || 'Falha ao anexar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachExisting = async file => {
    const fileId = getFileId(file) || getFileName(file);
    try {
      setSavingFileId(fileId);
      await attachFileToEntity(file, {
        successMessage: 'Imagem anexada com sucesso.',
        closeManager: true,
      });
    } catch (e) {
      setError(e?.message || 'Falha ao anexar imagem.');
    } finally {
      setSavingFileId(null);
    }
  };

  const handleRemove = async relation => {
    try {
      setError('');
      setStatus('');
      const relationId = getRelationId(relation);
      if (!relationId) throw new Error('Anexo sem identificador para remocao.');
      await relationActions.remove(relationId);
      if (String(coverId) === String(relationId)) setCoverId(null);
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
          onPress={() => setManagerOpen(true)}
          disabled={uploading}
          style={[inlineStyle_139_10, uploading && libraryStyles.disabledButton]}>
          <View style={libraryStyles.headerButtonContent}>
            <MaterialCommunityIcons name="folder-image" size={16} color="#fff" />
            <Text style={inlineStyle_145_16}>{uploading ? 'Enviando...' : 'Gerenciar imagens'}</Text>
          </View>
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
              const imageUrl = resolveFileImageUrl(row.file);
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
                      {String(coverId) === String(row.id) ? 'Capa selecionada' : 'Definir como capa'}
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

      <AnimatedModal visible={managerOpen} onRequestClose={() => setManagerOpen(false)}>
        <View style={libraryStyles.modalContainer}>
          <View style={libraryStyles.modalHeader}>
            <View>
              <Text style={libraryStyles.modalTitle}>Gerenciador de imagens</Text>
            </View>
            <TouchableOpacity onPress={() => setManagerOpen(false)} style={libraryStyles.iconButton}>
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={libraryStyles.toolbar}>
            <View style={libraryStyles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94A3B8" />
              <TextInput
                value={librarySearch}
                onChangeText={setLibrarySearch}
                placeholder="Buscar imagem"
                placeholderTextColor="#94A3B8"
                style={libraryStyles.searchInput}
              />
              {!!librarySearch && (
                <TouchableOpacity onPress={() => setLibrarySearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={[libraryStyles.uploadButton, uploading && libraryStyles.disabledButton]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#fff" />
              )}
              <Text style={libraryStyles.uploadButtonText}>
                {uploading ? 'Enviando' : 'Enviar nova'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadLibrary} disabled={libraryLoading} style={libraryStyles.refreshButton}>
              <MaterialCommunityIcons name="refresh" size={19} color="#334155" />
            </TouchableOpacity>
          </View>

          {!!libraryError && <Text style={libraryStyles.modalError}>{libraryError}</Text>}

          {libraryLoading ? (
            <View style={libraryStyles.loadingState}>
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={libraryStyles.loadingText}>Carregando imagens...</Text>
            </View>
          ) : filteredLibraryFiles.length === 0 ? (
            <View style={libraryStyles.emptyState}>
              <MaterialCommunityIcons name="image-off-outline" size={34} color="#CBD5E1" />
              <Text style={libraryStyles.emptyText}>Nenhuma imagem encontrada.</Text>
            </View>
          ) : (
            <ScrollView style={libraryStyles.modalList} showsVerticalScrollIndicator={false}>
              <View style={libraryStyles.libraryGrid}>
                {filteredLibraryFiles.map(file => {
                  const fileId = getFileId(file);
                  const imageUrl = resolveFileImageUrl(file);
                  const isAttached = fileId && attachedFileIds.has(String(fileId));
                  const isSaving = String(savingFileId || '') === String(fileId || getFileName(file));

                  return (
                    <TouchableOpacity
                      key={fileId || file?.['@id'] || getFileName(file)}
                      style={[libraryStyles.fileCard, isAttached && libraryStyles.fileCardAttached]}
                      activeOpacity={0.82}
                      disabled={isSaving || isAttached}
                      onPress={() => handleAttachExisting(file)}
                    >
                      <View style={libraryStyles.fileThumb}>
                        {!!imageUrl ? (
                          <Image source={{uri: imageUrl}} style={libraryStyles.fileImage} resizeMode="cover" />
                        ) : (
                          <MaterialCommunityIcons name="image-outline" size={28} color="#94A3B8" />
                        )}
                      </View>
                      <View style={libraryStyles.fileInfo}>
                        <Text style={libraryStyles.fileName} numberOfLines={2}>{getFileName(file)}</Text>
                        <View style={libraryStyles.fileMetaRow}>
                          <Text style={libraryStyles.contextBadge}>{getContextLabel(file?.context)}</Text>
                          {isAttached && <Text style={libraryStyles.attachedBadge}>Anexada</Text>}
                        </View>
                      </View>
                      <View style={libraryStyles.fileAction}>
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <MaterialCommunityIcons
                            name={isAttached ? 'check-circle' : 'plus-circle-outline'}
                            size={22}
                            color={isAttached ? '#15803D' : '#0F172A'}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </AnimatedModal>
    </View>
  );
};

export default AttachmentManager;
