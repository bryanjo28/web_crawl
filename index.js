const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 80;
const mongoose = require('mongoose');
const UrlModel = require('./models/Url'); // Sesuai dengan nama file 'Url.js'
const SiteModel = require('./models/Site'); // Sesuai dengan nama file 'Site.js'
const TaskModel = require('./models/Task');

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

mongoose.connect('mongodb://localhost:27017/JudolBCA', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB connected');
    await seedDefaultUsers();
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
    return res.redirect('/');
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
  if (req.user?.role !== ADMIN_ROLE) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: 'Akses admin diperlukan.' });
    }

    return res.redirect('/');
  }

  next();
}

// Routing ke HTML pages
app.get('/', (req, res) => {
  res.redirect('/site');
});

app.get('/user', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/user.html'));
});

app.get('/config_web', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/config.html'));
});

app.get('/site', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/site.html'));
});

app.get('/url', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/url.html'));
});

app.get('/task', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/task.html'));
});

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

    if (!name || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Username, password, full name, dan role wajib diisi.' });
    }

    const existingUser = await UserModel.findOne({ name: name.trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Username sudah digunakan.' });
    }

    const now = new Date();
    const user = await UserModel.create({
      name: name.trim(),
      password: password.trim(),
      fullName: fullName.trim(),
      role,
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID user tidak valid.' });
    }

    if (!name || !fullName || !role) {
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
      role,
      isActive: Boolean(isActive),
      lastUpdatedBy: req.user.fullName,
      lastUpdatedAt: new Date()
    };

    if (password && password.trim()) {
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


// API: Get semua data URL
app.get('/api/urls', async (req, res) => {
  try {
    const data = await UrlModel.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error ambil data', error: err });
  }
});

// API: Get ID data URL
app.get('/api/urls/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const item = await UrlModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil detail data', error: err });
  }
});

// API: Post ID data URL
app.post('/api/urls', async (req, res) => {
  try {
    const { url } = req.body;

    // 🔍 Cek apakah URL sudah ada
    const existing = await UrlModel.findOne({ url });
    if (existing) {
      return res.status(409).json({ message: "URL sudah terdaftar sebelumnya." });
    }

    const newUrl = new UrlModel(req.body);
    const saved = await newUrl.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Gagal simpan URL", error: err });
  }
});


// API: PUT ID data URL
app.put('/api/urls/:id', async (req, res) => {
  const { id } = req.params;
  const update = req.body;

  try {
    const updated = await UrlModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Gagal update URL", error: err });
  }
});

//API: Delete ID data URL 
app.delete('/api/urls/:id', async (req, res) => {
  try {
    const deleted = await UrlModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json({ message: "Berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: "Gagal hapus URL", error: err });
  }
});

// API: Get semua data Site
app.get('/api/sites', async (req, res) => {
  try {
    const data = await SiteModel.find().sort({ lastUpdate: -1, url: 1 });
    res.json(data);
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

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil detail site', error: err.message });
  }
});

// API: Tambah Site
app.post('/api/sites', async (req, res) => {
  try {
    const { url, status, lastScan, lastUpdateBy, lastUpdate } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ message: 'URL wajib diisi.' });
    }

    const normalizedUrl = url.trim();
    const existing = await SiteModel.findOne({ url: normalizedUrl });
    if (existing) {
      return res.status(409).json({ message: 'Site sudah terdaftar sebelumnya.' });
    }

    const now = new Date();
    const newSite = await SiteModel.create({
      url: normalizedUrl,
      status: status !== undefined ? Boolean(status) : true,
      lastScan: lastScan ? new Date(lastScan) : null,
      lastUpdateBy: lastUpdateBy || req.user?.fullName || req.user?.name || 'system',
      lastUpdate: lastUpdate ? new Date(lastUpdate) : now
    });

    res.status(201).json(newSite);
  } catch (err) {
    res.status(500).json({ message: 'Gagal simpan site', error: err.message });
  }
});

// API: Update Site
app.put('/api/sites/:id', async (req, res) => {
  const { id } = req.params;
  const { url, status, lastScan, lastUpdateBy, lastUpdate } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    if (url !== undefined && !String(url).trim()) {
      return res.status(400).json({ message: 'URL wajib diisi.' });
    }

    if (url !== undefined) {
      const normalizedUrl = String(url).trim();
      const existing = await SiteModel.findOne({
        url: normalizedUrl,
        _id: { $ne: id }
      });

      if (existing) {
        return res.status(409).json({ message: 'URL site sudah digunakan data lain.' });
      }
    }

    const updatePayload = {};

    if (url !== undefined) updatePayload.url = String(url).trim();
    if (status !== undefined) updatePayload.status = Boolean(status);
    if (lastScan !== undefined) updatePayload.lastScan = lastScan ? new Date(lastScan) : null;
    updatePayload.lastUpdateBy = lastUpdateBy || req.user?.fullName || req.user?.name || 'system';
    updatePayload.lastUpdate = lastUpdate ? new Date(lastUpdate) : new Date();

    const updated = await SiteModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Data site tidak ditemukan' });

    res.json(updated);
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

// API: Get semua data Task
app.get('/api/tasks', async (req, res) => {
  try {
    const data = await TaskModel.find().sort({ lastUpdateDate: -1, taskDate: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error ambil data task', error: err.message });
  }
});

// API: Tambah Task
app.post('/api/tasks', async (req, res) => {
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

    if (!url || !String(url).trim()) {
      return res.status(400).json({ message: 'Judol site wajib diisi.' });
    }

    const now = new Date();
    const created = await TaskModel.create({
      taskDate: taskDate ? new Date(taskDate) : null,
      pic: pic ? String(pic).trim() : '',
      url: String(url).trim(),
      title: title ? String(title).trim() : '',
      username: username ? String(username).trim() : '',
      password: password ? String(password).trim() : '',
      flagJudol: flagJudol !== undefined ? Boolean(flagJudol) : false,
      statusSite: statusSite !== undefined ? Boolean(statusSite) : true,
      lastUpdatedBy: lastUpdatedBy || req.user?.fullName || req.user?.name || 'system',
      lastUpdateDate: lastUpdateDate ? new Date(lastUpdateDate) : now
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Gagal simpan task', error: err.message });
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

    const updated = await TaskModel.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Data task tidak ditemukan' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Gagal update task', error: err.message });
  }
});

// API: Distribute Task ke PIC
app.put('/api/tasks/distribute', requireAdmin, async (req, res) => {
  try {
    const { taskIds, pic } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'Pilih minimal satu task.' });
    }

    if (!pic || !String(pic).trim()) {
      return res.status(400).json({ message: 'PIC wajib diisi.' });
    }

    const invalidIds = taskIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'Ada ID task yang tidak valid.' });
    }

    const result = await TaskModel.updateMany(
      { _id: { $in: taskIds } },
      {
        $set: {
          pic: String(pic).trim(),
          lastUpdatedBy: req.user?.fullName || req.user?.name || 'system',
          lastUpdateDate: new Date()
        }
      }
    );

    res.json({
      message: `${result.modifiedCount} task berhasil didistribusikan ke PIC ${String(pic).trim()}.`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal distribute task', error: err.message });
  }
});

// API: Get detail Task by ID
app.get('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }

  try {
    const item = await TaskModel.findById(id);
    if (!item) return res.status(404).json({ message: 'Data task tidak ditemukan' });

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
    const deleted = await TaskModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Data task tidak ditemukan' });

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

app.post('/api/urls/bulk', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: "Data tidak valid" });
    }

    // Helper untuk build $set only for defined values
    function buildSetObject(item) {
      const setObj = {};

      if (item.inputBy) setObj.inputBy = item.inputBy;
      // if (item.flagSystem !== undefined) setObj.flagSystem = item.flagSystem;
      // if (item.flagUser !== undefined) setObj.flagUser = item.flagUser;
       // Jika kosong, default ke true
      setObj.flagSystem = item.flagSystem !== undefined ? item.flagSystem : true;
      setObj.flagUser = item.flagUser !== undefined ? item.flagUser : true;
      
      if (item.webStatus) setObj.webStatus = item.webStatus;
      if (item.uid !== undefined) setObj.uid = item.uid;
      if (item.password !== undefined) setObj.password = item.password;
      if (item.firstCrawl !== undefined) setObj.firstCrawl = item.firstCrawl ? new Date(item.firstCrawl) : null;
      if (item.lastCrawl !== undefined) setObj.lastCrawl = item.lastCrawl ? new Date(item.lastCrawl) : null;
      if (item.lastUpdate !== undefined) setObj.lastUpdate = item.lastUpdate ? new Date(item.lastUpdate) : new Date();
      if (item.crawlStatus !== undefined) setObj.crawlStatus = item.crawlStatus;

      return setObj;
    }

    const operations = data.map(item => ({
      updateOne: {
        filter: { url: item.url },
        update: {
          $set: buildSetObject(item)
        },
        upsert: true
      }
    }));

    const result = await UrlModel.bulkWrite(operations);

    res.status(201).json({
      message: `Upload selesai. ${result.upsertedCount} baru, ${result.modifiedCount} diperbarui.`,
      insertedCount: result.upsertedCount,
      updatedCount: result.modifiedCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal upload data",
      error: err.message
    });
  }
});


// API Export URL ke Excel
app.get('/api/url/export', async (req, res) => {
  try {
    const urls = await UrlModel.find().lean(); // Fetch data

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(urls.map(url => ({
      URL: url.url || 'N/A',
      InputBy: url.inputBy || '',
      FlagSystem: url.flagSystem === true ? 'Y' : url.flagSystem === false ? 'N' : '',
      FlagUser: url.flagUser === true ? 'Y' : url.flagUser === false ? 'N' : '',
      WebStatus: url.webStatus || '',
      UID: url.uid || '',
      Password: url.password || '',
      FirstCrawl: url.firstCrawl ? new Date(url.firstCrawl) : '',
      LastCrawl: url.lastCrawl ? new Date(url.lastCrawl) : '',
      LastUpdate: url.lastUpdate ? new Date(url.lastUpdate) : '',
      CrawlStatus: url.crawlStatus !== null ? url.crawlStatus : '',
    })));


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CrawlData');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="url_data_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Gagal export data.');
  }
});


// GET: ambil config terbaru (anggap hanya satu dokumen yang relevan)
// Ambil config (1 dokumen saja)
app.get('/api/config', requireAdmin, async (req, res) => {
  try {
    const doc = await ConfigModel.findOne().lean();
    if (!doc) return res.status(404).json({ message: 'Belum ada config' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Upsert config (buat kalau belum ada, update kalau sudah ada)
app.put('/api/config', requireAdmin, async (req, res) => {
  try {
    const { maxUrlScan, maxFilter } = req.body;
    if (maxUrlScan == null || maxFilter == null) {
      return res.status(400).json({ message: 'maxUrlScan & maxFilter wajib diisi' });
    }

    const updated = await ConfigModel.findOneAndUpdate(
      {}, // selalu dokumen pertama
      { maxUrlScan: Number(maxUrlScan), maxFilter: Number(maxFilter) },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

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




