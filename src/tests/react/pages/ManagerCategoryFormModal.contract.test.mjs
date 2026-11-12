import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = name => fs.readFileSync(new URL(`../../../react/pages/${name}`, import.meta.url), 'utf8');
const modal = read('ManagerCategoryFormModal.js');
const styles = read('ManagerCategoriesPage.styles.js');

test('every style used by the category form exists in the styles file (#1536)', () => {
  const used = [...modal.matchAll(/styles\.(\w+)/g)].map(match => match[1]);
  const defined = new Set([...styles.matchAll(/^ {2}(\w+): \{/gm)].map(match => match[1]));
  assert.deepEqual([...new Set(used)].filter(name => !defined.has(name)), []);
});

test('the icon is chosen with the shared Feather icon picker (#1536)', () => {
  assert.match(modal, /DefaultFeatherIconPicker/);
  assert.match(modal, /<DefaultFeatherIconPicker[^>]*value=\{formIcon\}[^>]*onChange=\{setFormIcon\}/s);
});

test('the form is narrow and Cancel/Save are real buttons (#1536)', () => {
  assert.match(styles, /formModalSheet: \{[^}]*maxWidth: 420/s);
  assert.equal((modal.match(/accessibilityRole="button"/g) || []).length >= 2, true);
  assert.match(styles, /colorRow: \{[^}]*flexDirection: 'row'[^}]*flexWrap: 'wrap'/s);
});
