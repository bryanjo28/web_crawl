const express = require('express');
const path = require('path');
const app = express();
const port = 80;
const mongoose = require('mongoose');
const UrlModel = require('./models/Url'); // Sesuai dengan nama file 'Url.js'
const RekModel = require('./models/Rekening');
const QRISModel = require('./models/Qris');
const KeyModel = require('./models/Keyword');
const CrawlModel = require('./models/ExcludeWeb')
const ConfigModel = require('./models/Config')

const XLSX = require('xlsx');


// Koneksi ke MongoDB lokal (tanpa username/password)
mongoose.connect('mongodb://localhost:27017/JudolBCA', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Terhubung ke MongoDB'))
  .catch((err) => console.error('❌ Gagal terhubung ke MongoDB', err));

app.use(express.json({ limit: '10mb' }));   // ⬅️ Penting!


// Static file middleware
app.use('/static', express.static(path.join(__dirname, 'static')));

// Routing ke HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/index.html'));
});

app.get('/keyword', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/keyword.html'));
});

app.get('/qris', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/qris.html'));
});

app.get('/rekening', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/rekening.html'));
});

app.get('/exclude_web', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/exclude_web.html'));
});

app.get('/config_web', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/config.html'));
});


// Route khusus untuk navbar
app.get('/navbar', (req, res) => {
  res.sendFile(path.join(__dirname, 'static/navbar/navbar.html'));
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
      if (item.flagSystem !== undefined) setObj.flagSystem = item.flagSystem;
      if (item.flagUser !== undefined) setObj.flagUser = item.flagUser;
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


// API: Get semua data Rekening
app.get('/api/rekening', async (req, res) => {
  try {
    const data = await RekModel.find();

    // Konversi buffer GambarWeb ke base64 string
    const formatted = data.map(item => {
      const plain = item.toObject();
      if (plain.GambarWeb && plain.GambarWeb.buffer) {
        plain.GambarWeb = `data:image/png;base64,${plain.GambarWeb.buffer.toString("base64")}`;
      } else {
        plain.GambarWeb = null;
      }
      return plain;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Error ambil data', error: err });
  }
});


// Update Rekening Status by ID (block)
app.put('/api/rekening/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { StatusRekening, DateBlocked } = req.body;

    const updated = await RekModel.findByIdAndUpdate(id, {
      StatusRekening,
      DateBlocked
    }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Rekening not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating rekening', error: error.message });
  }
});

// Delete Rekening by ID
app.delete('/api/rekening/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RekModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Rekening not found' });
    }

    res.json({ message: 'Rekening deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rekening', error: error.message });
  }
});

function normalizeNoRekening(noRekening) {
  if (!noRekening) return null;
  return noRekening.trim().replace(/\s+/g, ' ');
}
function buildSetFields(item) {
  const setFields = {};

  if ('url' in item) {
    setFields.url = item.url?.trim() || null;
  }
  if ('bank' in item) {
    setFields.bank = item.bank?.trim() || null;
  }
  if ('NoRekening' in item) {
    const cleaned = normalizeNoRekening(item.NoRekening);
    setFields.NoRekening = cleaned;
    setFields.NormalizedNoRekening = cleaned?.toLowerCase();  // For case-insensitive
  }

  if ('DateFound' in item) {
    setFields.DateFound = item.DateFound ? new Date(item.DateFound) : null;
  }
  if ('DateBlocked' in item) {
    setFields.DateBlocked = item.DateBlocked ? new Date(item.DateBlocked) : null;
  }
  if ('StatusRekening' in item) {
    setFields.StatusRekening = (typeof item.StatusRekening === 'boolean') ? item.StatusRekening : false;
  }
  if ('GambarWeb' in item && item.GambarWeb) {
    setFields.GambarWeb = item.GambarWeb;
  }

  return setFields;
}
// API: Bulk insert/update Rekening with partial upsert (like /url/bulk)
app.post('/api/rekening/bulk', async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Data harus berupa array dan tidak boleh kosong." });
    }

    console.log("=== Incoming Data ===", JSON.stringify(data, null, 2));

    // 1️⃣ Ambil semua NoRekening dari DB
    const allExistingDocs = await RekModel.find({}, { NoRekening: 1 }).lean();
    const existingSet = new Set(
      allExistingDocs
        .map(doc => normalizeNoRekening(doc.NoRekening)?.toLowerCase())
        .filter(v => !!v)
    );

    // 2️⃣ Build bulkOps
    const bulkOps = data
      .filter(item => item.NoRekening != null)
      .map(item => {
        const normalized = normalizeNoRekening(item.NoRekening);
        const normalizedLower = normalized?.toLowerCase();

        if (!normalizedLower) return null;

        // 3️⃣ Only build op if new or will update existing
        if (existingSet.has(normalizedLower)) {
          console.log(`UPDATE mode for: ${normalized}`);
        } else {
          console.log(`INSERT mode for: ${normalized}`);
          existingSet.add(normalizedLower);  // prevent dupe in same upload
        }

        return {
          updateOne: {
            filter: { NoRekening: normalized },
            update: { $set: buildSetFields({ ...item, NoRekening: normalized }) },
            upsert: true
          }
        };
      })
      .filter(Boolean);

    console.log("=== Bulk Operations ===", JSON.stringify(bulkOps, null, 2));

    // 4️⃣ Execute
    const result = await RekModel.bulkWrite(bulkOps);
    console.log("=== BulkWrite Result ===", result);

    res.status(200).json({
      message: "Upload dan update data rekening berhasil",
      insertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error("Error saat upload/update rekening:", error);
    res.status(500).json({
      message: "Gagal upload/update data rekening",
      error: error.message
    });
  }
});


// API: Bulk export Rekening
app.get('/api/rekening/export', async (req, res) => {
  try {
    const data = await RekModel.find().lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Tidak ada data untuk diexport." });
    }

    // Mapping jadi mirip /api/url/export style
    const exportRows = data.map(item => ({
      URL: item.url || '',
      Bank: item.bank || '',
      'No Rek': item.NoRekening ?? '',
      'Date Found': item.DateFound ? new Date(item.DateFound) : '',
      'Date Blocked': item.DateBlocked ? new Date(item.DateBlocked) : '',
      'Status Rekening': item.StatusRekening === true ? 'Blocked' : 'Active'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RekeningExport');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="data_rekening_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error saat export rekening:', error);
    res.status(500).json({ message: "Gagal export data rekening", error: error.message });
  }
});


// API: Fetch all QRIS data
app.get('/api/qris', async (req, res) => {
  try {
    const qrisList = await QRISModel.find();

    const result = qrisList.map(item => {
      const plain = item.toObject();
      if (plain.GambarQRIS && plain.GambarQRIS.buffer) {
        plain.GambarQRIS = `data:image/png;base64,${plain.GambarQRIS.buffer.toString("base64")}`;
      } else {
        plain.GambarQRIS = null;
      }
      return plain;
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching QRIS data:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// API: Block QRIS per ID
app.put('/api/qris/:id/block', async (req, res) => {
  try {
    const { id } = req.params;

    // Cari data QRIS berdasarkan ID
    const qris = await QRISModel.findById(id);

    if (!qris) {
      return res.status(404).json({ message: 'QRIS data not found.' });
    }

    // Update status QRIS menjadi "true" (blocked)
    qris.StatusQRIS = true;
    qris.DateBlocked = new Date(); // Optional: update tanggal blokir ke sekarang

    // Simpan perubahan
    await qris.save();

    res.status(200).json({ message: 'QRIS successfully blocked.', qris });
  } catch (error) {
    console.error('Error blocking QRIS:', error);
    res.status(500).json({ message: 'Failed to block QRIS', error: error.message });
  }
});

app.post('/api/qris/upload', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Data harus berupa array dan tidak boleh kosong." });
    }

    // Step 1: Normalisasi
    const normalizedData = data
      .map(item => ({
        url: (item.url || "").trim(),
        bank: (item.bank || "").trim(),
        NoQRIS: item.NoQRIS ? String(item.NoQRIS).trim() : "",
        DateFound: item.DateFound ? new Date(item.DateFound) : null,
        DateBlocked: item.DateBlocked ? new Date(item.DateBlocked) : null,
        StatusQRIS: item.StatusQRIS === "Blocked" ? true : item.StatusQRIS === "Active" ? false : Boolean(item.StatusQRIS),
        GambarQRIS: item.GambarQRIS || item.gambarQRIS || ""
      }))
      .filter(item => item.NoQRIS);  // Buang yang NoQRIS kosong

    if (normalizedData.length === 0) {
      return res.status(400).json({ message: "Semua data tidak memiliki NoQRIS." });
    }

    // Step 2: Buang duplikat di dalam batch itu sendiri
    const uniqueMap = new Map();
    normalizedData.forEach(item => {
      const key = item.NoQRIS.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    const uniqueData = Array.from(uniqueMap.values());

    // Step 3: Ambil yang sudah ada di DB
    const existingDocs = await QRISModel.find({
      NoQRIS: { $in: uniqueData.map(i => i.NoQRIS) }
    }, { NoQRIS: 1 });

    const existingSet = new Set(existingDocs.map(doc => doc.NoQRIS.toLowerCase()));

    // Step 4: Filter hanya yang belum ada di DB
    const toInsert = uniqueData.filter(item => !existingSet.has(item.NoQRIS.toLowerCase()));

    // Step 5: Insert only new
    if (toInsert.length > 0) {
      await QRISModel.insertMany(toInsert);
    }

    // Step 6: Response
    res.json({
      message: `Upload selesai. Ditambahkan ${toInsert.length} data baru. ${existingSet.size} sudah ada di database dan diabaikan.`,
      insertedCount: toInsert.length,
      skippedCount: existingSet.size
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error during upload.", error: error.message });
  }
});


// Endpoint untuk ekspor data QRIS ke Excel
app.get('/api/qris/export', async (req, res) => {
  try {
    // Ambil semua data QRIS
    const qrisData = await QRISModel.find().lean();

    if (!qrisData || qrisData.length === 0) {
      return res.status(404).json({ message: "Tidak ada data untuk diekspor." });
    }

    // Siapkan data untuk worksheet (tanpa GambarQRIS)
    const dataForExcel = qrisData.map(item => ({
      URL: item.url || '',
      Bank: item.bank || '',
      NoQRIS: item.NoQRIS || '',
      DateFound: item.DateFound ? new Date(item.DateFound) : '',
      DateBlocked: item.DateBlocked ? new Date(item.DateBlocked) : '',
      StatusQRIS: item.StatusQRIS === true ? 'Blocked' : 'Active'
    }));

    // Buat worksheet dan workbook
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QRIS Data');

    // Konversi ke buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Kirim response
    res.setHeader('Content-Disposition', `attachment; filename="qris_data_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);

  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Gagal mengekspor data.", error: error.message });
  }
});


// API: Fetch all Keyword data
app.get('/api/keyword', async (req, res) => {
  try {
    const keywordData = await KeyModel.find(); // misal ambil data dari MongoDB
    res.json(keywordData);
  } catch (error) {
    console.error('Error fetching Keyword data:', error);
    res.status(500).send('Server error');
  }
});

// API: Post Keyword data
app.post("/api/keyword", async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ message: "Keyword tidak boleh kosong." });
    }

    const trimmedKeyword = keyword.trim();

    // Cek apakah keyword sudah ada di database
    const existing = await KeyModel.findOne({ keyword: trimmedKeyword });
    if (existing) {
      return res.status(409).json({ message: "Keyword sudah ada di database." });
    }

    const newKeyword = new KeyModel({ keyword: trimmedKeyword });
    await newKeyword.save();

    res.status(201).json({ message: "Keyword berhasil ditambahkan" });
  } catch (error) {
    console.error("Error saat tambah keyword:", error);
    res.status(500).json({ message: "Gagal menambahkan keyword", error: error.message });
  }
});


// API: Update keyword by ID
app.put('/api/keyword/:id', async (req, res) => {
  try {
    const { keyword } = req.body;
    const { id } = req.params;

    if (!keyword || keyword.trim() === "") {
      return res.status(400).json({ message: "Keyword tidak boleh kosong" });
    }

    const updated = await KeyModel.findByIdAndUpdate(id, { keyword }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: "Keyword tidak ditemukan" });
    }

    res.json({ message: "Keyword berhasil diperbarui", data: updated });
  } catch (err) {
    console.error("Error updating keyword:", err);
    res.status(500).json({ message: "Gagal memperbarui keyword" });
  }
});

// API: Delete keyword by ID
app.delete('/api/keyword/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await KeyModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Keyword tidak ditemukan." });
    }

    res.json({ message: "Keyword berhasil dihapus." });
  } catch (error) {
    console.error("Error delete keyword:", error);
    res.status(500).json({ message: "Gagal menghapus keyword", error: error.message });
  }
});


// API: Bulk insert Keyword dengan validasi duplicate
app.post('/api/keyword/bulk', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: "Data harus berupa array" });
    }

    // Ambil semua No Rekening dari data
    const keywordList = data.map(item => item.keyword);

    // Cari No Rekening yang sudah ada di database
    const existingKeyword = await KeyModel.find({ keyword: { $in: keywordList } }).select('keyword');

    const existingKeywordSet = new Set(existingKeyword.map(item => item.keyword));

    // Filter hanya data yang belum ada
    const dataToInsert = data.filter(item => !existingKeywordSet.has(item.keyword));

    if (dataToInsert.length === 0) {
      return res.status(409).json({ message: "Keyword sudah ada dalam database." });
    }

    // Insert yang baru saja
    const inserted = await KeyModel.insertMany(dataToInsert);

    res.status(201).json({
      message: "Upload berhasil sebagian/bulk",
      insertedCount: inserted.length,
      skippedDuplicates: existingKeyword.length
    });

  } catch (error) {
    console.error("Error saat upload keyword:", error);
    res.status(500).json({
      message: "Gagal upload data keyword",
      error: error.message
    });
  }
});


// GET semua data URL
app.get('/api/excludeCrawl', async (req, res) => {
  try {
    const data = await CrawlModel.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Gagal ambil data', error: err });
  }
});

// POST: Tambah URL Exclude baru
app.post('/api/excludeCrawl', async (req, res) => {
  try {
    const { url } = req.body;
    console.log("URL yang diterima dari frontend:", url);  // Debug log
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'URL tidak valid' });
    }

    const normalizedUrl = url.trim().toLowerCase();
    console.log("Normalized URL:", normalizedUrl);

    // Cek apakah URL sudah ada di excludeCrawl
    const existing = await CrawlModel.findOne({ url: { $regex: `^${normalizedUrl}$`, $options: 'i' } });
    if (existing) {
      return res.status(409).json({ message: 'URL sudah ada di daftar exclude' });
    }

    // Simpan URL baru ke CrawlModel
    const newUrl = new CrawlModel({ url: normalizedUrl, inputBy: 'System' });
    await newUrl.save();
    console.log("URL berhasil disimpan:", newUrl);

    // Hapus data terkait di UrlModel
    const deleted = await UrlModel.deleteMany({ url: { $regex: `^${normalizedUrl}$`, $options: 'i' } });
    console.log("Deleted count:", deleted.deletedCount);

    res.json({
      message: 'URL berhasil ditambahkan dan data terkait dihapus',
      data: newUrl,
      deletedCount: deleted.deletedCount,
    });
  } catch (err) {
    console.error('POST /excludeCrawl Error:', err);
    res.status(500).json({ message: 'Gagal tambah URL', error: err });
  }
});



// PUT: Edit URL Exclude berdasarkan ID
app.put('/api/excludeCrawl/:id', async (req, res) => {
  try {
    const { url } = req.body;
    const updated = await CrawlModel.findByIdAndUpdate(req.params.id, { url }, { new: true });
    res.json({ message: 'URL berhasil diupdate', data: updated });
  } catch (err) {
    res.status(500).json({ message: 'Gagal update URL', error: err });
  }
});

// DELETE: Hapus URL Exclude berdasarkan ID
app.delete('/api/excludeCrawl/:id', async (req, res) => {
  try {
    await CrawlModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'URL berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal hapus URL', error: err });
  }
});

// GET: ambil config terbaru (anggap hanya satu dokumen yang relevan)
// Ambil config (1 dokumen saja)
app.get('/api/config', async (req, res) => {
  try {
    const doc = await ConfigModel.findOne().lean();
    if (!doc) return res.status(404).json({ message: 'Belum ada config' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Upsert config (buat kalau belum ada, update kalau sudah ada)
app.put('/api/config', async (req, res) => {
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
//   if (isNaN(d)) return '';
//   return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
// }

// Jalankan server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
