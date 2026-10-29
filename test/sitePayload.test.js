const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../index.js'), 'utf8');
const context = vm.createContext({});
for (const name of ['parseBoolean', 'parseOptionalDate', 'convertExcelSerialDate', 'parseSpreadsheetDate', 'buildSitePayload']) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end), context);
}

test('site payload reads Indonesian dates and ISO dates as the same date', () => {
  const local = context.buildSitePayload({ tanggalTemuan: '01-10-2026' });
  const iso = context.buildSitePayload({ tanggalTemuan: '2026-10-01' });
  assert.equal(local.tanggalTemuan.getFullYear(), 2026);
  assert.equal(local.tanggalTemuan.getMonth(), 9);
  assert.equal(local.tanggalTemuan.getDate(), 1);
  assert.equal(iso.tanggalTemuan.toISOString().slice(0, 10), '2026-10-01');
});

test('site payload preserves omitted dates and allows explicitly clearing a date', () => {
  assert.equal(Object.hasOwn(context.buildSitePayload({}), 'tanggalTemuan'), false);
  assert.equal(context.buildSitePayload({ tanggalTemuan: null }).tanggalTemuan, null);
});
