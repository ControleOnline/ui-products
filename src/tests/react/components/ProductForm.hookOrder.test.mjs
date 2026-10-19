import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../../../react/components/ProductForm.js', import.meta.url),
  'utf8',
);

// Regression for #1100: handleSave's argument object reads these setters during
// render, so their useState declarations must come first (TDZ blanked the screen).
test('ProductForm declares section state setters before handleSave', () => {
  const handleSaveIndex = source.indexOf('const handleSave = useCallback(');
  assert.ok(handleSaveIndex > -1);

  for (const setter of ['setOpenSections', 'setErrorSections']) {
    const declarationIndex = source.indexOf(`, ${setter}] = React.useState(`);
    assert.ok(declarationIndex > -1, `${setter} declaration not found`);
    assert.ok(
      declarationIndex < handleSaveIndex,
      `${setter} must be declared before handleSave`,
    );
  }
});

// Regression for #1100: SkeletonTab referenced inlineStyle_92_14 without importing it.
test('ProductFormFields imports every inlineStyle it uses', () => {
  const fields = readFileSync(
    new URL('../../../react/components/ProductFormFields.js', import.meta.url),
    'utf8',
  );
  const importBlock = fields.slice(0, fields.indexOf("} from './ProductForm.styles'"));
  const used = new Set(fields.match(/inlineStyle_\d+_\d+/g) || []);
  for (const name of used) {
    assert.ok(importBlock.includes(name), `${name} is used but not imported`);
  }
});
