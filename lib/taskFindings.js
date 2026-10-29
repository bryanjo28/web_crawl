function normalizeUrl(value) {
  return String(value || '').trim().toLowerCase().replace(/\/$/, '');
}

function validateReplacement(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let parsed;
  try { parsed = new URL(raw.includes('://') ? raw : `https://${raw}`); } catch { throw new Error('Judol site pengganti tidak valid.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.') || /\s/.test(raw) || parsed.username || parsed.password) {
    throw new Error('Judol site pengganti tidak valid.');
  }
  return raw;
}

function duplicateKey(item) {
  return JSON.stringify([
    String(item.type || '').trim().toLowerCase(),
    String(item.bankName || '').trim().replace(/\s+/g, ' ').toLowerCase(),
    String(item.identifierNo || '').trim()
  ]);
}

function planTaskFindings(task, body, updatedBy, now, buildFileName) {
  if (body.statusSite !== undefined && typeof body.statusSite !== 'boolean') throw new Error('Status harus Active atau Inactive.');
  const status = body.statusSite ?? task.statusSite ?? true;
  const replacementUrl = validateReplacement(body.replacementUrl ?? task.replacementUrl);
  if (replacementUrl && status) throw new Error('Domain asal yang memiliki pengganti harus Inactive.');
  if (replacementUrl && normalizeUrl(replacementUrl) === normalizeUrl(task.url)) throw new Error('Judol site pengganti harus berbeda dari domain asal.');
  if (task.replacementSiteId && normalizeUrl(replacementUrl) !== normalizeUrl(task.replacementUrl)) throw new Error('Domain pengganti sudah tersimpan dan tidak boleh ditimpa.');
  const items = body.items;
  if (!Array.isArray(items)) throw new Error('Data temuan tidak valid.');
  if (!items.length && status) throw new Error('Minimal satu data temuan wajib diisi.');
  const targetUrl = replacementUrl || task.url;
  const docs = items.map((item, index) => {
    const type = String(item?.type || '').trim().toLowerCase();
    const bankName = String(item?.bankName || '').trim();
    const identifierNo = String(item?.identifierNo || '').trim();
    if (!['rekening', 'qris', 'va', 'sakuku'].includes(type)) throw new Error(`Jenis pada baris ${index + 1} tidak valid.`);
    if (!bankName || !identifierNo) throw new Error(`Nama bank dan nomor pada baris ${index + 1} wajib diisi.`);
    return {
      taskId: task._id, judolSite: targetUrl, originalJudolSite: task.url,
      taskDate: task.taskDate || null, type, bankName, identifierNo,
      fileName: buildFileName(targetUrl, type, bankName, identifierNo),
      titleSite: task.title || '', updatedBy, updatedDate: now
    };
  });
  const newSite = replacementUrl && !task.replacementSiteId ? {
    judolSite: replacementUrl, url: replacementUrl, title: task.title || '',
    username: task.username || '', password: task.password || '', flagJudol: true,
    status: true, tanggalTemuan: now, lastCrawl: docs.length ? now : null,
    lastScan: docs.length ? now : null, lastUpdateDate: now, lastUpdate: now,
    lastUpdateBy: updatedBy, replacesUrl: task.url, sourceTaskId: task._id
  } : null;
  return {
    docs, newSite, targetUrl,
    taskUpdate: { statusSite: status, lastUpdatedBy: updatedBy, lastUpdateDate: now }
  };
}

// Serialize these saves in this process, including compensation on standalone MongoDB.
let pendingSave = Promise.resolve();
async function serializeSave(action) {
  const previous = pendingSave;
  let release;
  pendingSave = new Promise(resolve => { release = resolve; });
  await previous;
  try { return await action(); } finally { release(); }
}

function siteUrlFilter(url) {
  const escaped = String(url || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { $or: [{ judolSite: { $regex: `^${escaped}$`, $options: 'i' } }, { url: { $regex: `^${escaped}$`, $options: 'i' } }] };
}

async function saveTaskFindings({ mongoose, TaskModel, SiteModel, TemuanModel, taskFilter, body, updatedBy, buildFileName }) {
  return serializeSave(async () => {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const transactional = Boolean(hello.setName || hello.msg === 'isdbgrid');
    const session = transactional ? await mongoose.startSession() : null;
    const execute = async () => {
      const options = session ? { session } : {};
      const task = await TaskModel.findOne(taskFilter, null, options).lean();
      if (!task) { const error = new Error('Data task tidak ditemukan atau tidak bisa diakses.'); error.statusCode = 404; throw error; }
      const now = new Date();
      const plan = planTaskFindings(task, body, updatedBy, now, buildFileName);
      let source = await SiteModel.findOne(siteUrlFilter(task.url), null, options).lean();
      let target = task.replacementSiteId ? await SiteModel.findById(task.replacementSiteId, null, options).lean() : null;
      if (task.replacementSiteId && !target) throw new Error('Data domain pengganti tidak ditemukan. Hubungi admin.');
      if (plan.newSite && await SiteModel.exists(siteUrlFilter(plan.targetUrl)).setOptions(options)) {
        throw new Error('Judol site pengganti sudah terdaftar. Data lama tidak ditimpa.');
      }
      const undo = [];
      const update = async (Model, original, patch) => {
        if (!original) return;
        const set = {}, unset = {};
        for (const key of Object.keys(patch)) {
          if (Object.hasOwn(original, key)) set[key] = original[key]; else unset[key] = '';
        }
        undo.push(() => Model.updateOne({ _id: original._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }));
        await Model.updateOne({ _id: original._id }, { $set: patch }, options);
      };
      try {
        if (!source) {
          const id = new mongoose.Types.ObjectId();
          undo.push(() => SiteModel.deleteOne({ _id: id }));
          const created = await SiteModel.create([{
            _id: id, judolSite: task.url, url: task.url, title: task.title || '',
            username: task.username || '', password: task.password || '',
            flagJudol: Boolean(task.flagJudol), status: task.statusSite !== false
          }], options);
          source = created[0].toObject();
        }
        if (plan.newSite) {
          const id = new mongoose.Types.ObjectId();
          undo.push(() => SiteModel.deleteOne({ _id: id }));
          const created = await SiteModel.create([{ ...plan.newSite, _id: id, replacesSiteId: source?._id }], options);
          target = created[0].toObject();
          plan.taskUpdate.replacementSiteId = target._id;
          plan.taskUpdate.replacementUrl = target.judolSite;
        }
        const meta = { lastUpdateBy: updatedBy, lastUpdateDate: now, lastUpdate: now };
        await update(SiteModel, source, {
          ...meta, status: plan.taskUpdate.statusSite,
          ...(target ? { replacedBySiteId: target._id, replacedByUrl: target.judolSite } : {}),
          ...(!target && plan.docs.length ? { lastCrawl: now, lastScan: now } : {})
        });
        if (target && plan.docs.length) await update(SiteModel, target, { ...meta, lastCrawl: now, lastScan: now });
        const docs = plan.docs.map(doc => ({ ...doc, _id: new mongoose.Types.ObjectId(), siteId: target?._id || source?._id }));
        if (docs.length) {
          undo.push(() => TemuanModel.deleteMany({ _id: { $in: docs.map(doc => doc._id) } }));
          await TemuanModel.insertMany(docs, options);
        }
        await update(TaskModel, task, plan.taskUpdate);
        return { createdCount: docs.length, replacementUrl: target?.judolSite || '' };
      } catch (error) {
        if (!session) {
          for (const compensate of undo.reverse()) {
            try { await compensate(); } catch (rollbackError) {
              console.error('Task save rollback failed:', rollbackError.message);
              error.message = 'Penyimpanan gagal dan pemulihan belum lengkap. Hubungi admin sebelum mencoba lagi.';
            }
          }
        }
        throw error;
      }
    };
    try {
      return session ? await session.withTransaction(execute) : await execute();
    } finally { if (session) await session.endSession(); }
  });
}

module.exports = { planTaskFindings, duplicateKey, saveTaskFindings, siteUrlFilter };
