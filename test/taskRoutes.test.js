const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../index.js'), 'utf8');
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('duplicate route finds mixed-case legacy types and collapsed bank whitespace', async () => {
  let handler;
  const records = [{ type: ' Rekening ', bankName: ' BANK   A ', identifierNo: '00123', judolSite: 'history.example' }];
  vm.runInNewContext(source.slice(source.indexOf("app.get('/api/tasks/temuan/duplicates',"), source.indexOf("app.post('/api/tasks/:id/temuan',")), {
    app: { get: (_path, callback) => { handler = callback; } }, escapeRegex,
    TemuanModel: {
      find: query => ({ limit: () => ({ lean: async () => records.filter(record =>
        record.identifierNo === query.identifierNo &&
        new RegExp(query.type.$regex, query.type.$options).test(record.type) &&
        new RegExp(query.bankName.$regex, query.bankName.$options).test(record.bankName)
      ) }) })
    }
  });
  const res = response();
  await handler({ query: { type: 'rekening', bankName: 'bank a', identifierNo: '00123' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.exists, true);
  assert.equal(res.body.domains[0], 'history.example');
});

test('ordinary task edit cannot reactivate or rename a replaced task', async () => {
  let handler;
  vm.runInNewContext(source.slice(source.indexOf("app.put('/api/tasks/:id',"), source.indexOf('// API: Get detail Task by ID')), {
    app: { put: (_path, callback) => { handler = callback; } },
    mongoose: { Types: { ObjectId: { isValid: () => true } } },
    buildTaskAccessFilter: () => ({ pic: 'Current user' }),
    TaskModel: { findOne: () => ({ lean: async () => ({ url: 'a.example', replacementSiteId: 'site-B' }) }) }
  });
  for (const body of [{ statusSite: true }, { url: 'c.example' }]) {
    const res = response();
    await handler({ params: { id: 'task-A' }, user: { name: 'Current user' }, body }, res);
    assert.equal(res.code, 400);
    assert.match(res.body.message, /mempertahankan URL asal/);
  }
});
