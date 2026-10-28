const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual route without starting the server or connecting to MongoDB.
const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
const route = source.slice(
  source.indexOf("app.post('/api/tasks/distribute',"),
  source.indexOf("app.post('/api/tasks/:id/temuan',")
);

async function distribute(existingTasks, items) {
  let handler;
  let inserted = [];
  const normalize = (value) => String(value || '').trim().toLowerCase();
  vm.runInNewContext(route, {
    app: { post: (_url, _auth, callback) => { handler = callback; } },
    requireAdmin: () => {},
    UserModel: { find: () => ({ lean: async () => [{ fullName: 'PIC A' }, { fullName: 'PIC B' }] }) },
    TaskModel: {
      find: () => ({ lean: async () => existingTasks }),
      insertMany: async (docs) => { inserted = docs; return docs; }
    },
    getAvailableSitesForDistribution: async () => [{ judolSite: 'site.example', status: true }],
    normalizeJudolSiteValue: normalize,
    normalizePicValue: normalize,
    normalizeTaskDateValue: (value) => new Date(`${value}T00:00:00Z`),
    getTaskDateKey: (value) => new Date(value).toISOString().slice(0, 10)
  });
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler({ body: { items } }, res);
  return { res, inserted };
}

test('same PIC can receive an unfinished site again on the next task date', async () => {
  const { res, inserted } = await distribute([
    { url: 'site.example', pic: 'PIC A', taskDate: '2026-10-27', lastUpdateDate: null }
  ], [{ taskDate: '2026-10-28', pic: 'PIC A', quantity: 1 }]);
  assert.equal(res.statusCode, 201);
  assert.equal(inserted.length, 1);
});

test('same-day URL duplication is blocked even for a different PIC', async () => {
  const { res, inserted } = await distribute([
    { url: 'SITE.EXAMPLE ', pic: 'PIC B', taskDate: '2026-10-28' }
  ], [{ taskDate: '2026-10-28', pic: 'PIC A', quantity: 1 }]);
  assert.equal(res.statusCode, 400);
  assert.equal(inserted.length, 0);
});

test('one request allows consecutive task dates but blocks duplicate dates', async () => {
  const consecutive = await distribute([], [
    { taskDate: '2026-10-28', pic: 'PIC A', quantity: 1 },
    { taskDate: '2026-10-29', pic: 'PIC A', quantity: 1 }
  ]);
  assert.equal(consecutive.res.statusCode, 201);
  assert.equal(consecutive.inserted.length, 2);

  const duplicate = await distribute([], [
    { taskDate: '2026-10-28', pic: 'PIC A', quantity: 1 },
    { taskDate: '2026-10-28', pic: 'PIC B', quantity: 1 }
  ]);
  assert.equal(duplicate.res.statusCode, 400);
  assert.equal(duplicate.inserted.length, 0);
});
