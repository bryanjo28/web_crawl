const test = require('node:test');
const assert = require('node:assert/strict');
const { Mongoose } = require('mongoose');
const { saveTaskFindings } = require('../lib/taskFindings');

test('MongoDB replacement persistence and recovery', { skip: !process.env.TASK_INTEGRATION_TESTS }, async (t) => {
  const mongoose = new Mongoose();
  const dbName = `codex_task_findings_test_${process.pid}_${Date.now()}`;
  await mongoose.connect(`mongodb://localhost:27017/${dbName}`, { serverSelectionTimeoutMS: 3000 });
  const TaskModel = mongoose.model('Task', require('../models/Task').schema);
  const SiteModel = mongoose.model('Site', require('../models/Site').schema);
  const TemuanModel = mongoose.model('Temuan', require('../models/Temuan').schema);
  const originalUrl = 'https://original.example';
  const item = { type: 'rekening', bankName: 'Bank A', identifierNo: '00123' };
  let originalTask;
  const save = (body, taskFilter = { _id: originalTask._id }, extra = {}) => saveTaskFindings({
    mongoose, TaskModel, SiteModel, TemuanModel, body, taskFilter,
    updatedBy: 'Test PIC', buildFileName: (...parts) => parts.join('-'), ...extra
  });
  try {
    const originalSite = await SiteModel.create({ judolSite: originalUrl, status: true, username: 'original-user' });
    originalTask = await TaskModel.create({ url: originalUrl, pic: 'Test PIC', statusSite: true, username: 'task-user', title: 'Original' });
    await t.test('caught failure rolls back sites, findings, and task', async () => {
      let failOnce = true;
      const brokenTasks = {
        findOne: (...args) => TaskModel.findOne(...args),
        updateOne: async (...args) => {
          if (failOnce) { failOnce = false; throw new Error('simulated failure'); }
          return TaskModel.updateOne(...args);
        }
      };
      await assert.rejects(save({ statusSite: false, replacementUrl: 'https://failed.example', items: [item] }, undefined, { TaskModel: brokenTasks }), /simulated failure/);
      assert.equal(await SiteModel.countDocuments(), 1);
      assert.equal(await TemuanModel.countDocuments(), 0);
      assert.equal((await SiteModel.findById(originalSite._id)).status, true);
      assert.equal((await TaskModel.findById(originalTask._id)).statusSite, true);
    });
    await t.test('saves B separately and preserves A and task URL', async () => {
      const result = await save({ statusSite: false, replacementUrl: 'https://replacement.example', items: [item] });
      assert.equal(result.createdCount, 1);
      const task = await TaskModel.findById(originalTask._id).lean();
      const source = await SiteModel.findById(originalSite._id).lean();
      const replacement = await SiteModel.findById(task.replacementSiteId).lean();
      const finding = await TemuanModel.findOne().lean();
      assert.equal(task.url, originalUrl);
      assert.equal(task.statusSite, false);
      assert.equal(source.status, false);
      assert.equal(source.judolSite, originalUrl);
      assert.equal(String(source.replacedBySiteId), String(replacement._id));
      assert.equal(String(replacement.replacesSiteId), String(source._id));
      assert.equal(replacement.username, 'task-user');
      assert.equal(replacement.status, true);
      assert.ok(replacement.lastCrawl);
      assert.ok(replacement.tanggalTemuan);
      assert.equal(finding.judolSite, replacement.judolSite);
      assert.equal(String(finding.taskId), String(task._id));
      assert.equal(String(finding.siteId), String(replacement._id));
      assert.equal(finding.identifierNo, '00123');
    });
    await t.test('reopening adds findings without creating more sites', async () => {
      await save({ statusSite: false, items: [item] });
      assert.equal(await SiteModel.countDocuments(), 2);
      assert.equal(await TemuanModel.countDocuments(), 2);
    });
    await t.test('task access filter denies other PIC without writes', async () => {
      await assert.rejects(save({ statusSite: false, items: [item] }, { _id: originalTask._id, pic: 'Other PIC' }), /tidak bisa diakses/);
      assert.equal(await TemuanModel.countDocuments(), 2);
    });
    await t.test('existing replacement URLs are rejected without overwriting', async () => {
      const task = await TaskModel.create({ url: 'https://another.example', statusSite: true });
      await assert.rejects(save({ statusSite: false, replacementUrl: 'https://replacement.example', items: [item] }, { _id: task._id }), /sudah terdaftar/);
      assert.equal(await SiteModel.countDocuments(), 2);
    });
  } finally {
    if (mongoose.connection.name !== dbName || !/^codex_task_findings_test_\d+_\d+$/.test(dbName)) throw new Error('Unsafe test database cleanup target');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
