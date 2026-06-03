import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeRelationId = value => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') {
    return String(value?.id || value?.['@id'] || value?.fileId || value?.file_id || '');
  }
  return String(value);
};

export const buildCoverUrl = (relations, coverRelationId) => {
  const items = safeArray(relations);
  if (!items.length) return null;

  const normalizedCoverId = normalizeRelationId(coverRelationId);
  let selected = null;

  if (normalizedCoverId) {
    selected = items.find(item =>
      normalizeRelationId(item?.id) === normalizedCoverId && item?.file
    );
  }

  if (!selected) {
    selected = items.find(item => item?.file);
  }

  if (!selected) {
    return null;
  }

  return resolveFileImageUrl(selected.file) || null;
};

export const resolveProductCoverUrl = product =>
  buildCoverUrl(product?.productFiles, product?.extraData?.imageCoverRelationId);

export const resolveCategoryCoverUrl = category =>
  buildCoverUrl(category?.categoryFiles, category?.extraData?.imageCoverRelationId);

export const resolveEntityCoverUrl = entity =>
  resolveProductCoverUrl(entity) ||
  resolveCategoryCoverUrl(entity) ||
  buildCoverUrl(entity?.files, entity?.extraData?.imageCoverRelationId) ||
  null;
