/* global jest */
jest.mock('@controleonline/ui-common/src/react/utils/fileUrl', () => ({
  resolveFileImageUrl: file => `file:${file?.id}`,
}));

const assert = require('node:assert/strict');
const { describe, it } = global;

const {
  buildCoverUrl,
  resolveCategoryCoverUrl,
  resolveEntityCoverUrl,
  resolveProductCoverUrl,
} = require('../../../react/domain/productMedia');

describe('productMedia', () => {
  it('prefers the explicit cover relation and falls back to the first file', () => {
    const files = [
      { id: 10, file: { id: 110 } },
      { id: 11, file: { id: 111 } },
    ];

    assert.equal(buildCoverUrl(files, 11), 'file:111');
    assert.equal(buildCoverUrl(files, 999), 'file:110');
    assert.equal(buildCoverUrl([], 11), null);
  });

  it('resolves product, category and generic entity covers from db relations', () => {
    assert.equal(
      resolveProductCoverUrl({
        productFiles: [{ id: 7, file: { id: 707 } }],
        extraData: { imageCoverRelationId: 7 },
      }),
      'file:707',
    );

    assert.equal(
      resolveCategoryCoverUrl({
        categoryFiles: [{ id: 5, file: { id: 505 } }],
        extraData: { imageCoverRelationId: 5 },
      }),
      'file:505',
    );

    assert.equal(
      resolveEntityCoverUrl({
        files: [{ id: 8, file: { id: 808 } }],
        extraData: { imageCoverRelationId: 8 },
      }),
      'file:808',
    );
  });
});
