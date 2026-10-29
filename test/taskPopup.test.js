const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../static/js/task.js'), 'utf8');

function popup() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: false, innerHTML: '', textContent: '', readOnly: false, disabled: false });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: {
      getElementById: element,
      createElement: () => ({ innerHTML: '' }),
      querySelectorAll: () => []
    },
    currentTemuanTask: { _id: 'task-A', url: 'https://a.example', statusSite: true },
    temuanQueue: [], duplicateCheckVersion: 0,
    API: '/api/tasks', URLSearchParams, clearTimeout() {}, duplicateCheckTimer: null,
    window: { AppAuth: { authFetch: async () => ({ ok: true, json: async () => ({ exists: true, domains: ['https://history.example'] }) }) } },
    allTasks: [], taskDateFilter: { value: '' }, picFilter: { value: '' }, taskSiteFilter: { value: '' }, taskDateSortDirection: 'desc',
    temuanModal: { show() {} }
  });
  for (const name of ['escapeHtml', 'normalizeFilePart', 'buildTemuanFileName', 'getEffectiveTemuanTask', 'updateTemuanTitleSitePreview', 'getDuplicateKey', 'checkTemuanDuplicate', 'renderTemuanQueue', 'updateReplacementFields', 'resetTemuanFormFields', 'openTemuanModal', 'getFilteredTasks', 'toDateInputValue', 'formatShortDate']) {
    const match = new RegExp(`  (?:async )?function ${name}\\(`).exec(source);
    if (!match) throw new Error('Missing function ' + name);
    const after = source.slice(match.index + 1);
    const next = /\n  (?:async )?function /.exec(after);
    vm.runInContext(source.slice(match.index, next ? match.index + 1 + next.index : source.length - 4), context);
  }
  element('temuanQueueBody').appendChild = () => {};
  return { context, element };
}

test('inactive reveals replacement field and updates queued filenames to the effective domain', () => {
  const { context, element } = popup();
  context.temuanQueue.push({ type: 'rekening', bankName: 'Bank A', identifierNo: '00123' });
  element('temuanTaskStatus').value = 'false';
  element('temuanReplacementUrl').value = 'https://b.example';
  context.updateReplacementFields();
  assert.equal(element('temuanReplacementGroup').hidden, false);
  assert.ok(context.temuanQueue[0].fileName.includes('b.example'));
  element('temuanTaskStatus').value = 'true';
  context.updateReplacementFields();
  assert.equal(element('temuanReplacementGroup').hidden, true);
  assert.ok(context.temuanQueue[0].fileName.includes('a.example'));
});

test('filename preview stays empty until all finding fields are complete', () => {
  const { context, element } = popup();
  element('temuanTaskStatus').value = 'false';
  element('temuanReplacementUrl').value = 'https://b.example';
  context.updateTemuanTitleSitePreview();
  assert.equal(element('temuanTitleSite').value, '');
  element('temuanType').value = 'rekening';
  element('temuanBankName').value = 'Bank A';
  context.updateTemuanTitleSitePreview();
  assert.equal(element('temuanTitleSite').value, '');
  element('temuanIdentifierNo').value = '00123';
  context.updateTemuanTitleSitePreview();
  assert.equal(element('temuanTitleSite').value, 'rekening - Bank A - b.example');
  element('temuanReplacementTitle').value = 'Web Baru';
  context.updateTemuanTitleSitePreview();
  assert.equal(element('temuanTitleSite').value, 'rekening - Bank A - Web Baru');
});

test('reopening popup shows original and stored replacement without allowing overwrite', () => {
  const { context, element } = popup();
  context.allTasks.push({ _id: 'task-A', url: 'https://a.example', statusSite: false, replacementUrl: 'https://b.example', replacementSiteId: 'site-B' });
  context.openTemuanModal('task-A');
  assert.equal(element('temuanTaskJudolSite').value, 'https://a.example');
  assert.equal(element('temuanReplacementUrl').value, 'https://b.example');
  assert.equal(element('temuanReplacementUrl').readOnly, true);
  assert.equal(element('temuanTaskStatus').disabled, true);
});

test('duplicate popup warns for normalized queue and historical matches without removing entries', async () => {
  const { context, element } = popup();
  context.temuanQueue.push({ type: 'rekening', bankName: 'BANK   A', identifierNo: '00123' });
  await context.checkTemuanDuplicate({ type: 'rekening', bankName: 'bank a', identifierNo: '00123' });
  assert.equal(element('temuanDuplicateAlert').hidden, false);
  assert.match(element('temuanDuplicateAlert').textContent, /antrean/);
  assert.match(element('temuanDuplicateAlert').textContent, /history.example/);
  assert.match(element('temuanDuplicateAlert').textContent, /tetap boleh disimpan/);
  assert.equal(context.temuanQueue.length, 1);
});

test('task URL search matches original and replacement case-insensitively and respects PIC', () => {
  const { context } = popup();
  context.allTasks.push(
    { _id: 'a', url: 'https://A.example', pic: 'Andi', replacementUrl: 'https://NEW.example' },
    { _id: 'b', url: 'https://new.example', pic: 'Budi' }
  );
  context.taskSiteFilter.value = 'NEW.EXAMPLE';
  context.picFilter.value = 'andi';
  assert.equal(context.getFilteredTasks().length, 1);
  assert.equal(context.getFilteredTasks()[0]._id, 'a');
});
