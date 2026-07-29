import { resolveFileImageUrl } from '@controleonline/ui-common/src/react/utils/fileUrl'

export const buildCoverUrl = (files, coverRelationId) => {
  const categoryFiles = files || []
  let cover = null

  if (coverRelationId) {
    cover = categoryFiles.find(
      item => String(item?.id) === String(coverRelationId) && item?.file?.id,
    )
  }

  if (!cover) {
    cover = categoryFiles.find(item => item?.file?.id)
  }

  return cover?.file?.id ? resolveFileImageUrl(cover.file) : null
}

export const normalizeEntityId = value => {
  if (!value && value !== 0) return ''

  const raw = typeof value === 'object'
    ? value?.['@id'] || value?.id || value?.value || ''
    : value

  return String(raw || '').replace(/\D+/g, '').trim()
}

export const normalizeCatalogContext = value =>
  String(value || 'products').trim().toLowerCase() === 'supplies'
    ? 'supplies'
    : 'products'

export const slugifyFileName = value => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'catalogo'
}

export const withHexAlpha = (value, alpha, fallback = 'rgba(15,23,42,0.06)') => {
  const color = String(value || '').trim()

  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : fallback
}
