const test = require('node:test');
const assert = require('node:assert/strict');
const { planTaskFindings, duplicateKey } = require('../lib/taskFindings');

const task = { _id: 'task-A', url: 'https://a.example', title: 'Site A', username: 'user', password: 'pass', flagJudol: false, statusSite: true };
const item = { type: 'rekening', bankName: 'Bank A', identifierNo: '00123' };
const now = new Date('2026-10-29T09:00:00Z');
const plan = (body, original = task) => planTaskFindings(original, body, 'User A', now, (...parts) => parts.join('-'));

test('new replacement uses its own title for the new site and findings without changing original title', () => {
  const result = plan({ statusSite: false, replacementUrl: 'https://b.example', replacementTitle: 'Site B', items: [item] });
  assert.equal(result.newSite.title, 'Site B');
  assert.equal(result.docs[0].titleSite, 'Site B');
  assert.equal(result.taskUpdate.title, undefined);
  assert.equal(task.title, 'Site A');
  assert.throws(() => plan({ statusSite: false, replacementUrl: 'b.example', replacementTitle: ' ', items: [] }), /Title/);
});

test('replacement preserves original task URL and copies credentials to a separate active site', () => {
  const result = plan({ statusSite: false, replacementUrl: 'https://b.example', items: [item] });
  assert.equal(result.taskUpdate.url, undefined);
  assert.equal(result.taskUpdate.statusSite, false);
  assert.equal(result.newSite.judolSite, 'https://b.example');
  assert.equal(result.newSite.replacesUrl, task.url);
  assert.equal(result.newSite.password, task.password);
  assert.equal(result.newSite.username, task.username);
  assert.equal(result.newSite.title, task.title);
  assert.equal(result.newSite.flagJudol, true);
  assert.equal(result.newSite.status, true);
  assert.equal(result.newSite.lastCrawl, now);
  assert.equal(result.newSite.tanggalTemuan, now);
  assert.equal(result.docs[0].judolSite, 'https://b.example');
  assert.equal(result.docs[0].originalJudolSite, task.url);
  assert.equal(result.docs[0].taskId, task._id);
  assert.ok(result.docs[0].fileName.startsWith('https://b.example'));
});

test('reopening a replaced task reuses its linked site', () => {
  const result = plan({ statusSite: false, replacementUrl: 'https://b.example', items: [item] }, { ...task, statusSite: false, replacementSiteId: 'site-B', replacementUrl: 'https://b.example' });
  assert.equal(result.newSite, null);
  assert.equal(result.docs[0].judolSite, 'https://b.example');
  assert.throws(() => plan({ statusSite: false, replacementUrl: 'https://c.example', items: [item] }, { ...task, replacementSiteId: 'site-B', replacementUrl: 'https://b.example' }), /pengganti/);
});

test('inactive without findings allows status reporting, replacement without findings stays uncrawled', () => {
  assert.equal(plan({ statusSite: false, items: [] }).docs.length, 0);
  assert.equal(plan({ statusSite: false, replacementUrl: 'b.example', items: [] }).newSite.lastCrawl, null);
  assert.throws(() => plan({ statusSite: true, items: [] }), /temuan/);
});

test('invalid replacements and status values are rejected', () => {
  for (const replacementUrl of ['https://a.example', 'javascript:alert(1)', 'invalid url']) {
    assert.throws(() => plan({ statusSite: false, replacementUrl, items: [item] }));
  }
  assert.throws(() => plan({ statusSite: 'false', items: [item] }), /Status/);
  assert.throws(() => plan({ statusSite: true, replacementUrl: 'b.example', items: [item] }));
});

test('duplicate normalization ignores bank case and whitespace and preserves leading zeros', () => {
  assert.equal(duplicateKey(item), duplicateKey({ ...item, bankName: ' BANK   A ', type: 'REKENING' }));
  assert.notEqual(duplicateKey(item), duplicateKey({ ...item, identifierNo: '123' }));
});
