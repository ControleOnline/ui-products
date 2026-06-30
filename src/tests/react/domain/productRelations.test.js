const {
  normalizeProductRelationId,
  resolveProductRelationOptionId,
} = require('../../../react/domain/productRelations')

const { describe, expect, it } = global

describe('productRelations', () => {
  it('normalizes embedded relation objects and IRIs to selectable ids', () => {
    expect(normalizeProductRelationId({ id: 12 })).toBe(12)
    expect(normalizeProductRelationId({ '@id': '/queues/34' })).toBe('34')
    expect(normalizeProductRelationId('/queues/56')).toBe('56')
    expect(normalizeProductRelationId({ queue: 'Preparação' })).toBe('Preparação')
  })

  it('preserves empty and already normalized values', () => {
    expect(normalizeProductRelationId(null)).toBe('')
    expect(normalizeProductRelationId('')).toBe('')
    expect(normalizeProductRelationId(78)).toBe(78)
  })

  it('resolves reduced embedded relations by their displayed label', () => {
    const queues = [
      { id: 10, queue: 'Preparação' },
      { '@id': '/queues/11', queue: 'Teste API Queue' },
    ]

    expect(resolveProductRelationOptionId({ queue: 'Teste API Queue' }, queues)).toBe('11')
    expect(resolveProductRelationOptionId('Preparação', queues)).toBe(10)
  })
})
