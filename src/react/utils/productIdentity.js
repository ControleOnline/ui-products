export const normalizeProductId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};
