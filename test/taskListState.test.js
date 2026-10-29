const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../static/js/task.js'), 'utf8');

function state() {
  let stored;
  const context = vm.createContext({
    taskListStateKey: 'task-list:user-A', currentPage: 4, taskDateSortDirection: 'asc',
    taskDateFilter: { value: '2026-10-29' }, picFilter: { value: 'Andi' }, taskSiteFilter: { value: 'example' },
    getTodayDateInputValue: () => '2026-10-29',
    window: { sessionStorage: { setItem: (_key, value) => { stored = value; }, getItem: () => stored } }
  });
  for (const name of ['saveTaskListState', 'restoreTaskListState']) {
    const start = source.indexOf(`  function ${name}(`);
    assert.notEqual(start, -1);
    const end = source.indexOf('\n  function ', start + 1);
    vm.runInContext(source.slice(start, end), context);
  }
  return context;
}

test('task list restores page, filters and sorting after navigation', () => {
  const context = state();
  context.saveTaskListState();
  context.currentPage = 1;
  context.taskSiteFilter.value = '';
  context.picFilter.value = '';
  context.taskDateSortDirection = 'desc';
  context.restoreTaskListState();
  assert.equal(context.currentPage, 4);
  assert.equal(context.taskSiteFilter.value, 'example');
  assert.equal(context.picFilter.value, 'Andi');
  assert.equal(context.taskDateSortDirection, 'asc');
});

test('next day keeps default list settings rather than restoring yesterday', () => {
  const context = state();
  context.saveTaskListState();
  context.getTodayDateInputValue = () => '2026-10-30';
  context.currentPage = 1;
  context.taskDateFilter.value = '2026-10-30';
  context.restoreTaskListState();
  assert.equal(context.currentPage, 1);
  assert.equal(context.taskDateFilter.value, '2026-10-30');
});
