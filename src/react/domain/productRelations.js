export const normalizeProductRelationId = value => {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const match = value.match(/(\d+)\/?$/)
    return match ? match[1] : value
  }

  if (typeof value === 'object') {
    const identifier = value.id ?? value['@id'] ?? value.value
    if (identifier !== undefined && identifier !== null && identifier !== '') {
      return normalizeProductRelationId(identifier)
    }

    return value.queue ?? value.name ?? ''
  }

  return value
}

export const resolveProductRelationOptionId = (
  value,
  options = [],
  labelKeys = ['queue', 'name'],
) => {
  const normalizedValue = normalizeProductRelationId(value)
  const comparableValue = String(normalizedValue || '').trim().toLocaleLowerCase('pt-BR')

  if (!comparableValue) return ''

  const matchedOption = options.find(option => {
    const optionId = normalizeProductRelationId(option)
    if (String(optionId) === String(normalizedValue)) return true

    return labelKeys.some(key =>
      String(option?.[key] || '').trim().toLocaleLowerCase('pt-BR') === comparableValue,
    )
  })

  return matchedOption
    ? normalizeProductRelationId(matchedOption)
    : normalizedValue
}
