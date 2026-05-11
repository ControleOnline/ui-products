import {Platform} from 'react-native';
import {APP_ENV} from '@controleonline/../../config/env.js';

const extractId = value => {
  if (!value && value !== 0) return null;
  if (typeof value === 'number') return value;
  const raw = typeof value === 'string' ? value : value?.id || value?.['@id'];
  if (!raw) return null;
  const match = String(raw).match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export const uploadFileToApi = async ({file, context = 'products', peopleId}) => {
  const session = JSON.parse(localStorage.getItem('session') || '{}');
  const token = session?.api_key || session?.token;
  if (!token) throw new Error('Sessao invalida para upload.');

  const apiEntryPoint = String(APP_ENV?.API_ENTRYPOINT || '').replace(/\/$/, '');
  const host = APP_ENV?.DOMAIN || (typeof location !== 'undefined' ? location.host : '');
  if (!apiEntryPoint) throw new Error('API_ENTRYPOINT nao configurado.');

  const formData = new FormData();

  if (Platform.OS === 'web') {
    formData.append('file', file);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'imagem.jpg',
      type: file.mimeType || 'image/jpeg',
    });
  }

  formData.append('context', context);
  if (peopleId) formData.append('people', String(extractId(peopleId)));

  const response = await fetch(`${apiEntryPoint}/files/upload`, {
    method: 'POST',
    headers: {
      'API-TOKEN': token,
      'App-Domain': host,
      Accept: 'application/json',
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.['@type'] === 'Error') {
    throw new Error(result?.description || result?.message || 'Falha no upload do arquivo.');
  }
  return result;
};

export const toFileIri = fileObj => {
  const iri = fileObj?.['@id'];
  if (iri) return iri;
  const id = extractId(fileObj?.id || fileObj);
  return id ? `/files/${id}` : null;
};

