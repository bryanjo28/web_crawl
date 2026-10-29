const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../static/js/task.js'), 'utf8');

test('distribution summary subtracts only the queue for the selected date', () => {
  const fields = new Map();
  const get = id => { if (!fields.has(id)) fields.set(id, { value: '', textContent: '', disabled: false }); return fields.get(id); };
  get('distributeTaskDate').value = '2026-10-30';
  const context = vm.createContext({
    document: { getElementById: get }, availableDistributionCount: 3, distributionAvailabilityDate: '2026-10-30', distributionAdding: false, distributionSaving: false,
    distributionQueue: [{ taskDate: '2026-10-29', quantity: 3 }, { taskDate: '2026-10-30', quantity: 1 }]
  });
  const start = source.indexOf('  function updateDistributionSummary(');
  const end = source.indexOf('\n  function ', start + 1);
  vm.runInContext(source.slice(start, end), context);
  context.updateDistributionSummary();
  assert.equal(get('distributionRemainingCount').textContent, '2');
  get('distributeTaskDate').value = '';
  context.updateDistributionSummary();
  assert.equal(get('distributionAvailableCount').textContent, '-');
  assert.equal(get('addDistributionRowBtn').disabled, true);
  get('distributeTaskDate').value = '2026-10-30';
  context.distributionAdding = true;
  context.updateDistributionSummary();
  assert.equal(get('saveDistributionBtn').disabled, true);
  context.distributionAdding = false;
  context.distributionSaving = true;
  context.updateDistributionSummary();
  assert.equal(get('addDistributionRowBtn').disabled, true);
  assert.equal(get('distributeTaskDate').disabled, true);
});

test('pending Add cannot be omitted by Save, and Save blocks further queue changes', async () => {
  let finishAvailability, finishSave, sent;
  const fields = {
    distributeTaskDate: { value: '2026-10-30' }, distributePicSelect: { value: 'PIC A' },
    distributeQuantity: { value: '1' }, distributionAlert: {}, saveDistributionBtn: {}
  };
  const context = vm.createContext({
    document: { getElementById: id => fields[id] }, API: '/api/tasks',
    availableDistributionCount: 2, distributeUserOptions: ['PIC A'], distributionAdding: false, distributionSaving: false,
    distributionQueue: [{ taskDate: '2026-10-29', pic: 'PIC A', quantity: 1 }],
    loadDistributionAvailability: () => new Promise(resolve => { finishAvailability = resolve; }),
    showDistributionError: message => assert.fail(message), showAlert() {}, loadTasks: async () => {},
    resetDistributionFormFields() {}, renderDistributionQueue() {}, updateDistributionSummary() {},
    resetDistributionModal() {}, distributeModal: { hide() {} },
    window: { AppAuth: { authFetch: (_url, options) => {
      sent = JSON.parse(options.body);
      return new Promise(resolve => { finishSave = resolve; });
    } } }
  });
  for (const name of ['addDistributionRow', 'saveDistributedTasks']) {
    const start = source.indexOf(`  async function ${name}(`);
    const end = source.indexOf('\n  async function ', start + 1);
    vm.runInContext(source.slice(start, end), context);
  }
  const adding = context.addDistributionRow();
  await context.saveDistributedTasks();
  assert.equal(sent, undefined);
  finishAvailability(true);
  await adding;
  assert.equal(context.distributionQueue.length, 2);
  const saving = context.saveDistributedTasks();
  assert.equal(sent.items.length, 2);
  await context.addDistributionRow();
  assert.equal(context.distributionQueue.length, 2);
  finishSave({ ok: true, json: async () => ({ message: 'Saved' }) });
  await saving;
  assert.equal(context.distributionSaving, false);
});

test('late availability responses cannot overwrite a newer selected date', async () => {
  const field = { value: '2026-10-29' };
  const requests = [];
  const context = vm.createContext({
    document: { getElementById: () => field }, API: '/api/tasks',
    availableDistributionCount: 0, distributionAvailabilityDate: '', distributionAvailabilityVersion: 0,
    updateDistributionSummary() {},
    window: { AppAuth: { authFetch: url => new Promise(resolve => requests.push({ url, resolve })) } }
  });
  const start = source.indexOf('  async function loadDistributionAvailability(');
  const end = source.indexOf('\n  function ', start + 1);
  vm.runInContext(source.slice(start, end), context);
  const first = context.loadDistributionAvailability();
  field.value = '2026-10-30';
  const second = context.loadDistributionAvailability();
  requests[1].resolve({ ok: true, json: async () => ({ availableCount: 5 }) });
  assert.equal(await second, true);
  requests[0].resolve({ ok: true, json: async () => ({ availableCount: 1 }) });
  assert.equal(await first, false);
  assert.equal(context.availableDistributionCount, 5);
  assert.equal(context.distributionAvailabilityDate, '2026-10-30');
  assert.match(requests[1].url, /taskDate=2026-10-30/);
});

test('adding a queue row accepts another date but rejects an overbooked same date', async () => {
  const fields = {
    distributeTaskDate: { value: '2026-10-30' }, distributePicSelect: { value: 'PIC A' },
    distributeQuantity: { value: '1' }, distributionAlert: { hidden: false }
  };
  let error = '';
  const context = vm.createContext({
    document: { getElementById: id => fields[id] }, availableDistributionCount: 1,
    distributeUserOptions: ['PIC A'], distributionAdding: false, distributionSaving: false, distributionQueue: [{ taskDate: '2026-10-29', pic: 'PIC A', quantity: 1 }],
    loadDistributionAvailability: async () => true,
    showDistributionError: message => { error = message; }, resetDistributionFormFields() {}, renderDistributionQueue() {}, updateDistributionSummary() {}
  });
  const start = source.indexOf('  async function addDistributionRow(');
  const end = source.indexOf('\n  async function ', start + 1);
  vm.runInContext(source.slice(start, end), context);
  await context.addDistributionRow();
  assert.equal(context.distributionQueue.length, 2);
  assert.equal(error, '');
  await context.addDistributionRow();
  assert.equal(context.distributionQueue.length, 2);
  assert.match(error, /tidak mencukupi/);
});
