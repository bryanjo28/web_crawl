const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 80;
const mongoose = require('mongoose');
const UrlModel = require('./models/Url'); // Sesuai dengan nama file 'Url.js'
const SiteModel = require('./models/Site'); // Sesuai dengan nama file 'Site.js'
const TaskModel = require('./models/Task');
const TemuanModel = require('./models/Temuan');

const RekModel = require('./models/Rekening');
const QRISModel = require('./models/Qris');
const KeyModel = require('./models/Keyword');
const CrawlModel = require('./models/ExcludeWeb')
const ConfigModel = require('./models/Config')
const UserModel = require('./models/User')


const XLSX = require('xlsx');

const SESSION_COOKIE_NAME = 'crawl_session';
const sessionStore = new Map();
const ADMIN_ROLE = 'admin';

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, chunk) => {
    const [rawKey, ...rawValue] = chunk.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    return acc;
  }, {});
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

async function seedDefaultUsers() {
  const [adminCount, userCount] = await Promise.all([
    UserModel.countDocuments({ role: 'admin' }),
    UserModel.countDocuments({ role: 'user' })
  ]);

  if (adminCount > 0 && userCount > 0) {
    console.log('Seed user dilewati: admin dan user sudah tersedia.');
    return;
  }

  const dummyUsers = [
    {
      name: 'admin',
      password: 'admin123',
      fullName: 'Administrator',
      role: 'admin',
      isActive: true
    },
    {
      name: 'user',
      password: 'user123',
      fullName: 'Standard User',
      role: 'user',
      isActive: true
    }
  ];

  await Promise.all(
    dummyUsers.map((user) =>
      UserModel.findOneAndUpdate(
        { name: user.name },
        {
          $set: {
            password: user.password,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            lastUpdatedBy: 'system',
            lastUpdatedAt: new Date()
          },
          $setOnInsert: {
            createdBy: 'system',
            createdAt: new Date()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );

  console.log('Dummy user login siap');
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'y', 'yes', 'active'].includes(normalized)) return true;
    if (['false', '0', 'n', 'no', 'inactive'].includes(normalized)) return false;
  }

  return Boolean(value);
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function convertExcelSerialDate(value) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + Number(value) * 86400000);
}

function parseSpreadsheetDate(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelDate = convertExcelSerialDate(value);
    return Number.isNaN(excelDate.getTime()) ? null : excelDate;
  }

  const raw = String(value).trim();
  if (!raw || raw === '-' || raw.toUpperCase() === 'N/A') return null;

  const normalized = raw
    .replace(',', ' ')
    .replace(/\.(\d{2})\.(\d{2})(?:\s|$)/, ':$1:$2 ')
    .trim();

  const localDateTimeMatch = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
  );

  if (localDateTimeMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = localDateTimeMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return parseOptionalDate(normalized);
}

function normalizeTitleSitePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildTemuanTitleSite(judolSite, type, bankName, identifierNo) {
  return [
    normalizeTitleSitePart(judolSite),
    normalizeTitleSitePart(type),
    normalizeTitleSitePart(bankName),
    normalizeTitleSitePart(identifierNo)
  ]
    .filter(Boolean)
    .join('-');
}

function normalizeSiteDocument(site) {
  const plainSite = site && typeof site.toObject === 'function' ? site.toObject() : site;
  if (!plainSite) return plainSite;

  return {
    ...plainSite,
    judolSite: plainSite.judolSite || plainSite.url || '',
    title: plainSite.title || '',
    username: plainSite.username || '',
    password: plainSite.password || '',
    flagJudol: parseBoolean(plainSite.flagJudol, false),
    status: parseBoolean(plainSite.status, true),
    assetSite: plainSite.assetSite || '',
    lastCrawl: plainSite.lastCrawl || plainSite.lastScan || null,
    lastGetAsset: plainSite.lastGetAsset || null,
    lastUpdateBy: plainSite.lastUpdateBy || '',
    lastUpdateDate: plainSite.lastUpdateDate || plainSite.lastUpdate || null
  };
}

function buildSitePayload(body = {}, fallbackUser = 'system') {
  const judolSite = String(body.judolSite ?? body.url ?? '').trim();
  const title = String(body.title ?? '').trim();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '').trim();
  const assetSite = String(body.assetSite ?? '').trim();
  const flagJudol = parseBoolean(body.flagJudol, false);
  const status = parseBoolean(body.status, true);
  const lastCrawl = parseSpreadsheetDate(body.lastCrawl ?? body.lastScan);
  const lastGetAsset = parseSpreadsheetDate(body.lastGetAsset);
  const lastUpdateDate = parseSpreadsheetDate(body.lastUpdateDate ?? body.lastUpdate) || new Date();
  const lastUpdateBy = String(body.lastUpdateBy || fallbackUser).trim() || fallbackUser;

  return {
    judolSite,
    title,
    username,
    password,
    flagJudol,
    status,
    assetSite,
    lastCrawl,
    lastGetAsset,
    lastUpdateBy,
    lastUpdateDate,
    url: judolSite,
    lastScan: lastCrawl,
    lastUpdate: lastUpdateDate
  };
}

function buildTaskPayload(body = {}, fallbackUser = 'system') {
  const rawTaskDate = parseSpreadsheetDate(body.taskDate ?? body.tasklistDate);
  const taskDate = rawTaskDate
    ? new Date(Date.UTC(rawTaskDate.getFullYear(), rawTaskDate.getMonth(), rawTaskDate.getDate()))
    : null;
  const pic = String(body.pic ?? body.PIC ?? '').trim();
  const url = String(body.url ?? body.judolSite ?? '').trim();
  const title = String(body.title ?? body.titleJudol ?? '').trim();
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '').trim();
  const flagJudol = parseBoolean(body.flagJudol, false);
  const statusSite = parseBoolean(body.statusSite ?? body.status, true);
  const lastUpdatedBy = String(body.lastUpdatedBy ?? body.lastUpdateBy ?? fallbackUser).trim() || fallbackUser;
  const lastUpdateDate = parseSpreadsheetDate(body.lastUpdateDate) || new Date();

  return {
    taskDate,
    pic,
    url,
    title,
    username,
    password,
    flagJudol,
    statusSite,
    lastUpdatedBy,
    lastUpdateDate
  };
}

function normalizeJudolSiteValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getStartOfTodayInJakarta() {
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  return new Date(`${jakartaDate}T00:00:00+07:00`);
}

async function revokeExpiredTasks() {
  const startOfToday = getStartOfTodayInJakarta();
  const result = await TaskModel.deleteMany({
    taskDate: {
      $ne: null,
      $lt: startOfToday
    }
  });

  if (result.deletedCount > 0) {
    console.log(`Revoke task expired: ${result.deletedCount} task dihapus.`);
  }
}

async function getAvailableSitesForDistribution() {
  await revokeExpiredTasks();

  const [sites, tasks] = await Promise.all([
    SiteModel.find().lean(),
    TaskModel.find({}, { url: 1 }).lean()
  ]);

  const usedTaskUrls = new Set(
    tasks
      .map((task) => normalizeJudolSiteValue(task.url))
      .filter(Boolean)
  );

  return sites
    .map(normalizeSiteDocument)
    .filter((site) => normalizeJudolSiteValue(site.judolSite))
    .filter((site) => !usedTaskUrls.has(normalizeJudolSiteValue(site.judolSite)))
    .sort((a, b) => {
      const aTime = new Date(a.lastUpdateDate || a.lastCrawl || 0).getTime();
      const bTime = new Date(b.lastUpdateDate || b.lastCrawl || 0).getTime();

      if (bTime !== aTime) return bTime - aTime;
      return String(a.judolSite || '').localeCompare(String(b.judolSite || ''), 'id');
    });
}

function isAdminUser(user) {
  return user?.role === ADMIN_ROLE;
}

function getAllowedTaskPics(user) {
  return [user?.fullName, user?.name]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function buildTaskAccessFilter(user) {
  if (isAdminUser(user)) {
    return {};
  }

  const allowedPics = getAllowedTaskPics(user);
  return allowedPics.length ? { pic: { $in: allowedPics } } : { _id: null };
}

async function migrateLegacySiteData() {
  const legacySites = await SiteModel.find({
    $or: [
      { judolSite: { $exists: false } },
      { lastCrawl: { $exists: false } },
      { lastUpdateDate: { $exists: false } }
    ]
  }).lean();

  if (!legacySites.length) {
    return;
  }

  const operations = legacySites.map((site) => ({
    updateOne: {
      filter: { _id: site._id },
      update: {
        $set: {
          judolSite: site.judolSite || site.url || '',
          lastCrawl: site.lastCrawl || site.lastScan || null,
          lastUpdateDate: site.lastUpdateDate || site.lastUpdate || null
        }
      }
    }
  }));

  await SiteModel.bulkWrite(operations);
  console.log(`Migrasi siteData selesai: ${operations.length} dokumen diperbarui.`);
}

mongoose.connect('mongodb://localhost:27017/JudolBCA', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB connected');
    await seedDefaultUsers();
    await migrateLegacySiteData();
  })
  .catch((err) => console.error('MongoDB connection failed', err));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (sessionToken && sessionStore.has(sessionToken)) {
    req.user = sessionStore.get(sessionToken);
  }

  next();
});

app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === ADMIN_ROLE ? '/user' : '/task');
  }

  res.sendFile(path.join(__dirname, 'pages/login.html'));
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    const user = await UserModel.findOne({
      name: name.trim(),
      password: password.trim(),
      isActive: true
    }).lean();

    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const sessionToken = crypto.randomBytes(24).toString('hex');
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      fullName: user.fullName,
      role: user.role
    };

    sessionStore.set(sessionToken, safeUser);
    setSessionCookie(res, sessionToken);

    res.json({ message: 'Login berhasil.', user: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Gagal login.', error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (sessionToken) {
    sessionStore.delete(sessionToken);
  }

  clearSessionCookie(res);
  res.json({ message: 'Logout berhasil.' });
});

app.use((req, res, next) => {
  const isPublicRoute =
    req.path === '/login' ||
    req.path === '/favicon.ico' ||
    req.path.startsWith('/static/') ||
    req.path.startsWith('/api/auth/');

  if (isPublicRoute) {
    return next();
  }

  if (!req.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.redirect('/login');
  }

  next();
});

function requireAdmin(req, res, next) {
  const requestPath = req.originalUrl || req.path || '';
  if (req.user?.role !== ADMIN_ROLE) {
    if (requestPath.startsWith('/api/')) {
      return res.status(403).json({ message: 'Akses admin diperlukan.' });
    }

    return res.redirect('/');
  }

  next();
}

// Routing ke HTML pages
app.get('/', (req, res) => {
  res.redirect(req.user?.role === ADMIN_ROLE ? '/user' : '/task');
});

app.get('/user', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/user.html'));
});

app.get('/temuan', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/temuan.html'));
});

app.get('/task', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/task.html'));
});

app.get('/site', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/site.html'));
});


// app.get('/config_web', requireAdmin, (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/config.html'));
// });

// app.get('/url', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/url.html'));
// });


// app.get('/keyword', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/keyword.html'));
// });

// app.get('/qris', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/qris.html'));
// });

// app.get('/rekening', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/rekening.html'));
// });

// app.get('/exclude_web', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pages/exclude_web.html'));
// });


// Route khusus untuk navbar
app.get('/navbar', (req, res) => {
  res.sendFile(path.join(__dirname, 'static/navbar/navbar.html'));
});

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user.', error: error.message });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { name, password, fullName, role, isActive } = req.body;
    const normalizedRole = String(role || '').trim();
    const normalizedPassword = normalizedRole === 'admin' ? String(password || '').trim() : 'bca123';

    if (!name || !normalizedPassword || !fullName || !normalizedRole) {
      return res.status(400).json({ message: 'Username, password, full name, dan role wajib diisi.' });
    }

    const existingUser = await UserModel.findOne({ name: name.trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Username sudah digunakan.' });
    }

    const now = new Date();
    const user = await UserModel.create({
      name: name.trim(),
      password: normalizedPassword,
      fullName: fullName.trim(),
      role: normalizedRole,
      isActive: Boolean(isActive),
      createdBy: req.user.fullName,
      createdAt: now,
      lastUpdatedBy: req.user.fullName,
      lastUpdatedAt: now
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan user.', error: error.message });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, fullName, role, isActive } = req.body;
    const normalizedRole = String(role || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID user tidak valid.' });
    }

    if (!name || !fullName || !normalizedRole) {
      return res.status(400).json({ message: 'Username, full name, dan role wajib diisi.' });
    }

    const existingUser = await UserModel.findOne({
      name: name.trim(),
      _id: { $ne: id }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Username sudah digunakan user lain.' });
    }

    const updatePayload = {
      name: name.trim(),
      fullName: fullName.trim(),
      role: normalizedRole,
      isActive: Boolean(isActive),
      lastUpdatedBy: req.user.fullName,
      lastUpdatedAt: new Date()
    };

    if (normalizedRole !== 'admin') {
      updatePayload.password = 'bca123';
    } else if (password && String(password).trim()) {
      updatePayload.password = password.trim();
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui user.', error: error.message });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID user tidak valid.' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ message: 'Admin tidak bisa menghapus akun yang sedang dipakai login.' });
    }

    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    res.json({ message: 'User berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus user.', error: error.message });
  }
});

app.get('/api/temuan', async (req, res) => {
  try {
    const data = await TemuanModel.find().sort({ updatedDate: -1, taskDate: -1, judolSite: 1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data temuan.', error: error.message });
  }
});

app.post('/api/temuan', requireAdmin, async (req, res) => {
  try {
    const judolSite = String(req.body?.judolSite || '').trim();
    const type = String(req.body?.type || '').trim();
    const bankName = String(req.body?.bankName || '').trim();
    const identifierNo = String(req.body?.identifierNo || '').trim();
    const fileName = String(req.body?.fileName || '').trim();
    const titleSite = String(req.body?.titleSite || '').trim();

    if (!judolSite) {
      return res.status(400).json({ message: 'Judol Site wajib diisi.' });
    }

    const doc = await TemuanModel.create({
      judolSite,
      taskDate: parseSpreadsheetDate(req.body?.taskDate),
      type,
      bankName,
      identifierNo,
      fileName,
      titleSite,
      updatedBy: req.user?.fullName || req.user?.name || 'system',
      updatedDate: new Date()
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan data temuan.', error: error.message });
  }
});

app.delete('/api/temuan/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const deleted = await TemuanModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Data temuan tidak ditemukan' });
    }

    res.json({ message: 'Data temuan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus data temuan.', error: error.message });
  }
});


// API: Get semua data URL
// app.get('/api/urls', async (req, res) => {
//   try {
//     const data = await UrlModel.find();
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ message: 'Error ambil data', error: err });
//   }
// });

// // API: Get ID data URL
// app.get('/api/urls/:id', async (req, res) => {
//   const { id } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({ message: 'ID tidak valid' });
//   }

//   try {
//     const item = await UrlModel.findById(id);
//     if (!item) return res.status(404).json({ message: 'Data tidak ditemukan' });
//     res.json(item);
//   } catch (err) {
//     res.status(500).json({ message: 'Gagal ambil detail data', error: err });
//   }
// });

// // API: Post ID data URL
// app.post('/api/urls', async (req, res) => {
//   try {
//     const { url } = req.body;

//     // 🔍 Cek apakah URL sudah ada
//     const existing = await UrlModel.findOne({ url });
//     if (existing) {
//       return res.status(409).json({ message: "URL sudah terdaftar sebelumnya." });
//     }

//     const newUrl = new UrlModel(req.body);
//     const saved = await newUrl.save();
//     res.status(201).json(saved);
//   } catch (err) {
//     res.status(500).json({ message: "Gagal simpan URL", error: err });
//   }
// });


// // API: PUT ID data URL
// app.put('/api/urls/:id', async (req, res) => {
//   const { id } = req.params;
//   const update = req.body;

//   try {
//     const updated = await UrlModel.findByIdAndUpdate(id, update, { new: true });
//     if (!updated) return res.status(404).json({ message: "Data tidak ditemukan" });

//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: "Gagal update URL", error: err });
//   }
// });

// //API: Delete ID data URL 
// app.delete('/api/urls/:id', async (req, res) => {
//   try {
//     const deleted = await UrlModel.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ message: "Data tidak ditemukan" });

//     res.json({ message: "Berhasil dihapus" });
//   } catch (err) {
//     res.status(500).json({ message: "Gagal hapus URL", error: err });
//   }
// });

// API: Get semua data Site
app.get('/api/sites', async (req, res) => {
  try {
    const data = await SiteModel.find().sort({ lastUpdateDate: -1, judolSite: 1, url: 1 });
    res.json(data.map(normalizeSiteDocument));
  } catch (err) {
    res.status(500).json({ message: 'Error ambil data site', error: err.message });
  }
});

// API: Get detail Site by ID
app.get('/api/sites/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const item = await SiteModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Data site tidak ditemukan' });

    res.json(normalizeSiteDocument(item));
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil detail site', error: err.message });
  }
});

// API: Tambah Site
app.post('/api/sites', async (req, res) => {
  try {
    const payload = buildSitePayload(
      req.body,
      req.user?.fullName || req.user?.name || 'system'
    );

    if (!payload.judolSite) {
      return res.status(400).json({ message: 'Judol Site wajib diisi.' });
    }

    const existing = await SiteModel.findOne({
      $or: [
        { judolSite: payload.judolSite },
        { url: payload.judolSite }
      ]
    });
    if (existing) {
      return res.status(409).json({ message: 'Site sudah terdaftar sebelumnya.' });
    }

    const newSite = await SiteModel.create(payload);

    res.status(201).json(normalizeSiteDocument(newSite));
  } catch (err) {
    res.status(500).json({ message: 'Gagal simpan site', error: err.message });
  }
});

// API: Update Site
app.put('/api/sites/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const incomingJudolSite = req.body.judolSite ?? req.body.url;
    if (incomingJudolSite !== undefined && !String(incomingJudolSite).trim()) {
      return res.status(400).json({ message: 'Judol Site wajib diisi.' });
    }

    if (incomingJudolSite !== undefined) {
      const normalizedUrl = String(incomingJudolSite).trim();
      const existing = await SiteModel.findOne({
        _id: { $ne: id },
        $or: [
          { judolSite: normalizedUrl },
          { url: normalizedUrl }
        ]
      });

      if (existing) {
        return res.status(409).json({ message: 'Judol Site sudah digunakan data lain.' });
      }
    }

    const updatePayload = buildSitePayload(
      req.body,
      req.user?.fullName || req.user?.name || 'system'
    );

    const updated = await SiteModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Data site tidak ditemukan' });

    res.json(normalizeSiteDocument(updated));
  } catch (err) {
    res.status(500).json({ message: 'Gagal update site', error: err.message });
  }
});

// API: Hapus Site
app.delete('/api/sites/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const deleted = await SiteModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Data site tidak ditemukan' });

    res.json({ message: 'Site berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal hapus site', error: err.message });
  }
});

app.post('/api/sites/upload', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ message: 'Data upload site tidak boleh kosong.' });
    }

    const fallbackUser = req.user?.fullName || req.user?.name || 'system';
    const operations = [];
    const invalidRows = [];

    items.forEach((item, index) => {
      const payload = buildSitePayload(item, fallbackUser);

      if (!payload.judolSite) {
        invalidRows.push(`Baris ${index + 2}: Judol Site wajib diisi.`);
        return;
      }

      operations.push({
        updateOne: {
          filter: {
            $or: [
              { judolSite: payload.judolSite },
              { url: payload.judolSite }
            ]
          },
          update: {
            $set: payload,
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          upsert: true
        }
      });
    });

    if (!operations.length) {
      return res.status(400).json({
        message: 'Tidak ada data valid untuk diupload.',
        invalidRows
      });
    }

    const existingSites = await SiteModel.find(
      {
        $or: operations.map((operation) => operation.updateOne.filter)
      },
      { judolSite: 1, url: 1 }
    ).lean();
    const existingSiteKeys = new Set(
      existingSites
        .map((site) => normalizeJudolSiteValue(site.judolSite || site.url))
        .filter(Boolean)
    );

    const result = await SiteModel.bulkWrite(operations, { ordered: false });

    let createdCount = 0;
    let updatedCount = 0;
    operations.forEach((operation) => {
      const judolSite = operation.updateOne.update.$set.judolSite;
      if (existingSiteKeys.has(normalizeJudolSiteValue(judolSite))) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
    });

    res.json({
      message: `Upload site selesai. ${createdCount} baru, ${updatedCount} diperbarui${invalidRows.length ? `, ${invalidRows.length} dilewati` : ''}.`,
      processedCount: operations.length,
      createdCount,
      updatedCount,
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      invalidRows
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload data site.', error: err.message });
  }
});

// API: Get semua data Task
app.get('/api/tasks', async (req, res) => {
  try {
    await revokeExpiredTasks();
    const data = await TaskModel.find(buildTaskAccessFilter(req.user)).sort({ lastUpdateDate: -1, taskDate: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error ambil data task', error: err.message });
  }
});

// API: Tambah Task
app.post('/api/tasks', async (req, res) => {
  try {
    const payload = buildTaskPayload(
      req.body,
      req.user?.fullName || req.user?.name || 'system'
    );

    if (!payload.url) {
      return res.status(400).json({ message: 'Judol site wajib diisi.' });
    }

    const created = await TaskModel.create(payload);

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Gagal simpan task', error: err.message });
  }
});

app.post('/api/tasks/upload', requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ message: 'Data upload task tidak boleh kosong.' });
    }

    const fallbackUser = req.user?.fullName || req.user?.name || 'system';
    const operations = [];
    const invalidRows = [];

    items.forEach((item, index) => {
      const payload = buildTaskPayload(item, fallbackUser);

      if (!payload.url) {
        invalidRows.push(`Baris ${index + 2}: Judol Site wajib diisi.`);
        return;
      }

      if (!payload.taskDate) {
        invalidRows.push(`Baris ${index + 2}: Tasklist Date wajib diisi.`);
        return;
      }

      if (!payload.pic) {
        invalidRows.push(`Baris ${index + 2}: PIC wajib diisi.`);
        return;
      }

      operations.push({
        updateOne: {
          filter: {
            taskDate: payload.taskDate,
            pic: payload.pic,
            url: payload.url
          },
          update: {
            $set: payload
          },
          upsert: true
        }
      });
    });

    if (!operations.length) {
      return res.status(400).json({
        message: 'Tidak ada data task valid untuk diupload.',
        invalidRows
      });
    }

    const existingTasks = await TaskModel.find(
      {
        $or: operations.map((operation) => operation.updateOne.filter)
      },
      { taskDate: 1, pic: 1, url: 1 }
    ).lean();

    const existingTaskKeys = new Set(
      existingTasks.map((task) => {
        const taskDate = task.taskDate instanceof Date ? task.taskDate.toISOString() : String(task.taskDate || '');
        return `${taskDate}__${String(task.pic || '').trim()}__${String(task.url || '').trim().toLowerCase()}`;
      })
    );

    const result = await TaskModel.bulkWrite(operations, { ordered: false });

    let createdCount = 0;
    let updatedCount = 0;
    operations.forEach((operation) => {
      const payload = operation.updateOne.update.$set;
      const key = `${payload.taskDate.toISOString()}__${payload.pic}__${payload.url.toLowerCase()}`;
      if (existingTaskKeys.has(key)) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
    });

    res.json({
      message: `Upload task selesai. ${createdCount} baru, ${updatedCount} diperbarui${invalidRows.length ? `, ${invalidRows.length} dilewati` : ''}.`,
      processedCount: operations.length,
      createdCount,
      updatedCount,
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      invalidRows
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal upload data task.', error: err.message });
  }
});

app.get('/api/tasks/distribution/availability', requireAdmin, async (req, res) => {
  try {
    const availableSites = await getAvailableSitesForDistribution();
    res.json({ availableCount: availableSites.length });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data distribusi.', error: err.message });
  }
});

app.post('/api/tasks/distribute', requireAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Minimal satu item distribusi wajib diisi.' });
    }

    const users = await UserModel.find({ role: 'user', isActive: true }).lean();
    const validPics = new Set(
      users
        .map((user) => String(user.fullName || user.name || '').trim())
        .filter(Boolean)
    );

    const normalizedItems = items.map((item, index) => {
      const taskDate = item?.taskDate ? new Date(item.taskDate) : null;
      const pic = String(item?.pic || '').trim();
      const quantity = Number(item?.quantity);

      if (!taskDate || Number.isNaN(taskDate.getTime())) {
        throw new Error(`Tasklist date pada baris ${index + 1} tidak valid.`);
      }

      if (!pic) {
        throw new Error(`PIC pada baris ${index + 1} wajib diisi.`);
      }

      if (!validPics.has(pic)) {
        throw new Error(`PIC pada baris ${index + 1} harus berasal dari user aktif.`);
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Jumlah task pada baris ${index + 1} harus angka bulat lebih dari 0.`);
      }

      return {
        taskDate,
        pic,
        quantity
      };
    });

    const availableSites = await getAvailableSitesForDistribution();
    const totalRequested = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

    if (totalRequested > availableSites.length) {
      return res.status(400).json({
        message: `Jumlah task melebihi data tersedia. Tersedia ${availableSites.length}, diminta ${totalRequested}.`
      });
    }

    let cursor = 0;
    const docsToInsert = [];

    normalizedItems.forEach((item) => {
      const selectedSites = availableSites.slice(cursor, cursor + item.quantity);
      cursor += item.quantity;

      selectedSites.forEach((site) => {
        docsToInsert.push({
          taskDate: item.taskDate,
          pic: item.pic,
          url: site.judolSite || '',
          title: site.title || '',
          username: site.username || '',
          password: site.password || '',
          flagJudol: Boolean(site.flagJudol),
          statusSite: site.status !== undefined ? Boolean(site.status) : true,
          lastUpdatedBy: '',
          lastUpdateDate: null
        });
      });
    });

    const created = await TaskModel.insertMany(docsToInsert);

    res.status(201).json({
      message: `${created.length} task berhasil didistribusikan.`,
      createdCount: created.length,
      remainingCount: availableSites.length - created.length
    });
  } catch (err) {
    const statusCode = err instanceof Error ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Gagal distribute task.', error: err.message });
  }
});

app.post('/api/tasks/:id/temuan', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID task tidak valid.' });
  }

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Minimal satu data temuan wajib diisi.' });
    }

    const task = await TaskModel.findOne({
      _id: id,
      ...buildTaskAccessFilter(req.user)
    }).lean();
    if (!task) {
      return res.status(404).json({ message: 'Data task tidak ditemukan atau tidak bisa diakses.' });
    }

    const allowedTypes = new Set(['rekening', 'qris', 'va', 'sakuku']);
    const now = new Date();
    const updatedBy = req.user?.fullName || req.user?.name || 'system';

    const docs = items.map((item, index) => {
      const type = String(item?.type || '').trim().toLowerCase();
      const bankName = String(item?.bankName || '').trim();
      const identifierNo = String(item?.identifierNo || '').trim();

      if (!allowedTypes.has(type)) {
        throw new Error(`Jenis pada baris ${index + 1} tidak valid.`);
      }

      if (!bankName) {
        throw new Error(`Nama bank pada baris ${index + 1} wajib diisi.`);
      }

      if (!identifierNo) {
        throw new Error(`Nomor pada baris ${index + 1} wajib diisi.`);
      }

      return {
        judolSite: task.url || '',
        taskDate: task.taskDate || null,
        type,
        bankName,
        identifierNo,
        fileName: buildTemuanTitleSite(task.url || '', type, bankName, identifierNo),
        titleSite: task.title || '',
        updatedBy,
        updatedDate: now
      };
    });

    const created = await TemuanModel.insertMany(docs);
    await TaskModel.updateOne(
      { _id: task._id },
      {
        $set: {
          lastUpdatedBy: updatedBy,
          lastUpdateDate: now
        }
      }
    );

    res.status(201).json({
      message: `${created.length} data temuan berhasil disimpan.`,
      createdCount: created.length
    });
  } catch (err) {
    const statusCode = err instanceof Error ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Gagal menyimpan data temuan.', error: err.message });
  }
});

// API: Update Task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const {
      taskDate,
      pic,
      url,
      title,
      username,
      password,
      flagJudol,
      statusSite,
      lastUpdatedBy,
      lastUpdateDate
    } = req.body;

    if (url !== undefined && !String(url).trim()) {
      return res.status(400).json({ message: 'Judol site wajib diisi.' });
    }

    const updatePayload = {
      lastUpdatedBy: lastUpdatedBy || req.user?.fullName || req.user?.name || 'system',
      lastUpdateDate: lastUpdateDate ? new Date(lastUpdateDate) : new Date()
    };

    if (taskDate !== undefined) updatePayload.taskDate = taskDate ? new Date(taskDate) : null;
    if (pic !== undefined) updatePayload.pic = String(pic).trim();
    if (url !== undefined) updatePayload.url = String(url).trim();
    if (title !== undefined) updatePayload.title = String(title).trim();
    if (username !== undefined) updatePayload.username = String(username).trim();
    if (password !== undefined) updatePayload.password = String(password).trim();
    if (flagJudol !== undefined) updatePayload.flagJudol = Boolean(flagJudol);
    if (statusSite !== undefined) updatePayload.statusSite = Boolean(statusSite);

    const updated = await TaskModel.findOneAndUpdate(
      {
        _id: id,
        ...buildTaskAccessFilter(req.user)
      },
      updatePayload,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Data task tidak ditemukan atau tidak bisa diakses' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Gagal update task', error: err.message });
  }
});

// API: Get detail Task by ID
app.get('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const item = await TaskModel.findOne({
      _id: id,
      ...buildTaskAccessFilter(req.user)
    });
    if (!item) return res.status(404).json({ message: 'Data task tidak ditemukan atau tidak bisa diakses' });

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil detail task', error: err.message });
  }
});

// API: Hapus Task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const deleted = await TaskModel.findOneAndDelete({
      _id: id,
      ...buildTaskAccessFilter(req.user)
    });
    if (!deleted) return res.status(404).json({ message: 'Data task tidak ditemukan atau tidak bisa diakses' });

    res.json({ message: 'Task berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal hapus task', error: err.message });
  }
});

// Fungsi untuk mengonversi Excel serial date ke format JavaScript Date
// function convertExcelSerialDate(serialDate) {
//   if (!serialDate || serialDate === "null") return null; // Jika kosong atau "null" sebagai string, set ke null
//   const date = new Date((serialDate - 25569) * 86400 * 1000); // Konversi Excel serial date
//   return isNaN(date.getTime()) ? null : date; // Jika tidak valid, kembalikan null
// }

// app.post('/api/urls/bulk', async (req, res) => {
//   try {
//     const { data } = req.body;

//     if (!Array.isArray(data)) {
//       return res.status(400).json({ message: "Data tidak valid" });
//     }

//     // Helper untuk build $set only for defined values
//     function buildSetObject(item) {
//       const setObj = {};

//       if (item.inputBy) setObj.inputBy = item.inputBy;
//       // if (item.flagSystem !== undefined) setObj.flagSystem = item.flagSystem;
//       // if (item.flagUser !== undefined) setObj.flagUser = item.flagUser;
//        // Jika kosong, default ke true
//       setObj.flagSystem = item.flagSystem !== undefined ? item.flagSystem : true;
//       setObj.flagUser = item.flagUser !== undefined ? item.flagUser : true;
      
//       if (item.webStatus) setObj.webStatus = item.webStatus;
//       if (item.uid !== undefined) setObj.uid = item.uid;
//       if (item.password !== undefined) setObj.password = item.password;
//       if (item.firstCrawl !== undefined) setObj.firstCrawl = item.firstCrawl ? new Date(item.firstCrawl) : null;
//       if (item.lastCrawl !== undefined) setObj.lastCrawl = item.lastCrawl ? new Date(item.lastCrawl) : null;
//       if (item.lastUpdate !== undefined) setObj.lastUpdate = item.lastUpdate ? new Date(item.lastUpdate) : new Date();
//       if (item.crawlStatus !== undefined) setObj.crawlStatus = item.crawlStatus;

//       return setObj;
//     }

//     const operations = data.map(item => ({
//       updateOne: {
//         filter: { url: item.url },
//         update: {
//           $set: buildSetObject(item)
//         },
//         upsert: true
//       }
//     }));

//     const result = await UrlModel.bulkWrite(operations);

//     res.status(201).json({
//       message: `Upload selesai. ${result.upsertedCount} baru, ${result.modifiedCount} diperbarui.`,
//       insertedCount: result.upsertedCount,
//       updatedCount: result.modifiedCount
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       message: "Gagal upload data",
//       error: err.message
//     });
//   }
// });


// // API Export URL ke Excel
// app.get('/api/url/export', async (req, res) => {
//   try {
//     const urls = await UrlModel.find().lean(); // Fetch data

//     // Convert data to worksheet
//     const worksheet = XLSX.utils.json_to_sheet(urls.map(url => ({
//       URL: url.url || 'N/A',
//       InputBy: url.inputBy || '',
//       FlagSystem: url.flagSystem === true ? 'Y' : url.flagSystem === false ? 'N' : '',
//       FlagUser: url.flagUser === true ? 'Y' : url.flagUser === false ? 'N' : '',
//       WebStatus: url.webStatus || '',
//       UID: url.uid || '',
//       Password: url.password || '',
//       FirstCrawl: url.firstCrawl ? new Date(url.firstCrawl) : '',
//       LastCrawl: url.lastCrawl ? new Date(url.lastCrawl) : '',
//       LastUpdate: url.lastUpdate ? new Date(url.lastUpdate) : '',
//       CrawlStatus: url.crawlStatus !== null ? url.crawlStatus : '',
//     })));


//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'CrawlData');
//     const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

//     res.setHeader('Content-Disposition', `attachment; filename="url_data_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.send(buffer);

//   } catch (error) {
//     console.error('Export error:', error);
//     res.status(500).send('Gagal export data.');
//   }
// });


// GET: ambil config terbaru (anggap hanya satu dokumen yang relevan)
// Ambil config (1 dokumen saja)
// app.get('/api/config', requireAdmin, async (req, res) => {
//   try {
//     const doc = await ConfigModel.findOne().lean();
//     if (!doc) return res.status(404).json({ message: 'Belum ada config' });
//     res.json(doc);
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// Upsert config (buat kalau belum ada, update kalau sudah ada)
// app.put('/api/config', requireAdmin, async (req, res) => {
//   try {
//     const { maxUrlScan, maxFilter } = req.body;
//     if (maxUrlScan == null || maxFilter == null) {
//       return res.status(400).json({ message: 'maxUrlScan & maxFilter wajib diisi' });
//     }

//     const updated = await ConfigModel.findOneAndUpdate(
//       {}, // selalu dokumen pertama
//       { maxUrlScan: Number(maxUrlScan), maxFilter: Number(maxFilter) },
//       { new: true, upsert: true, runValidators: true }
//     );

//     res.json(updated);
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// Helper format tanggal
// function formatDateExport(date) {
//   const d = new Date(date);
//   if (isNaN(d)) return ';
//   return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
// }

// Jalankan server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});




