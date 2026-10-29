const test = require('node:test');
const assert = require('node:assert/strict');
const { attachTaskDiscoveryDates } = require('../lib/taskDates');

test('older tasks get discovery date from their original site, while snapshots are preserved', () => {
  const tasks = attachTaskDiscoveryDates([
    { url: 'A.EXAMPLE', replacementUrl: 'b.example' },
    { url: 'a.example', tanggalTemuan: '2026-10-01' },
    { url: 'unknown.example' }
  ], [
    { judolSite: 'a.example', tanggalTemuan: '2026-10-10' },
    { judolSite: 'b.example', tanggalTemuan: '2026-10-29' }
  ]);
  assert.equal(tasks[0].tanggalTemuan, '2026-10-10');
  assert.equal(tasks[1].tanggalTemuan, '2026-10-01');
  assert.equal(tasks[2].tanggalTemuan, null);
});
