const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const UrlModel = require('./models/Url'); // Sesuai dengan nama file 'Url.js'
const RekModel = require('./models/Rekening');
const QRISModel = require('./models/Qris');
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

    // Normalize and validate the data
    const normalizedData = data.map(item => {
      const normalizedItem = {
        url: (item.url || "").trim(),
        inputBy: (item.inputBy || "").trim(),
        flagSystem: item.flagSystem === true || item.flagSystem === false ? item.flagSystem : null,
        flagUser: item.flagUser === true || item.flagUser === false ? item.flagUser : null,
        webStatus: (item.webStatus || "").trim(),
        uid: (item.uid || "").trim(),
        password: (item.password || "").trim(),
        firstCrawl: item.firstCrawl ? new Date(item.firstCrawl) : null,
        lastCrawl: item.lastCrawl ? new Date(item.lastCrawl) : null,
        lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : null,
        crawlStatus: item.crawlStatus === true || item.crawlStatus === false ? item.crawlStatus : null
      };

      console.log("Normalized Item:", normalizedItem); // Log the normalized item
      return normalizedItem;
    });

    // Extract all URLs from the normalized data
    const urls = normalizedData.map(item => item.url);

    // Check for duplicate URLs in the database
    const existingUrls = await UrlModel.find({ url: { $in: urls } }).select('url');
    const existingUrlsSet = new Set(existingUrls.map(item => item.url));

    // Find duplicate URLs in the uploaded data
    const duplicateUrls = urls.filter(url => existingUrlsSet.has(url));

    if (duplicateUrls.length > 0) {
      return res.status(400).json({
        message: `These URLs already exist in the database: ${duplicateUrls.join(", ")}`
      });
    }

    // Insert unique URLs into the database
    await UrlModel.insertMany(normalizedData);

    res.status(201).json({
      message: "Upload berhasil sebagian/bulk",
      insertedCount: normalizedData.length, // Number of successfully inserted records
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
      URL: url.url || 'N/A',  // Handle null or undefined
      InputBy: url.inputBy || 'N/A',
      FlagSystem: url.flagSystem !== null ? url.flagSystem : 'N/A',  // Handle null
      FlagUser: url.flagUser !== null ? url.flagUser : 'N/A',  // Handle null
      WebStatus: url.webStatus || 'N/A',  // Handle null or undefined
      UID: url.uid || 'N/A',
      Password: url.password || 'N/A',
      FirstCrawl: url.firstCrawl ? new Date(url.firstCrawl).toISOString() : 'N/A',
      LastCrawl: url.lastCrawl ? new Date(url.lastCrawl).toISOString() : 'N/A',
      LastUpdate: url.lastUpdate ? new Date(url.lastUpdate).toISOString() : 'N/A',
      CrawlStatus: url.crawlStatus !== null ? url.crawlStatus : 'N/A',  // Handle null
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
    res.json(data);
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

// API: Bulk insert Rekening dengan validasi duplicate
app.post('/api/rekening/bulk', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: "Data harus berupa array" });
    }

    // Ambil semua No Rekening dari data
    const noRekList = data.map(item => item.noRek);

    // Cari No Rekening yang sudah ada di database
    const existingRekening = await RekModel.find({ noRek: { $in: noRekList } }).select('noRek');

    const existingNoRekSet = new Set(existingRekening.map(item => item.noRek));

    // Filter hanya data yang belum ada
    const dataToInsert = data.filter(item => !existingNoRekSet.has(item.noRek));

    if (dataToInsert.length === 0) {
      return res.status(409).json({ message: "Semua data yang diupload sudah ada di database." });
    }

    // Insert yang baru saja
    const inserted = await RekModel.insertMany(dataToInsert);

    res.status(201).json({
      message: "Upload berhasil sebagian/bulk",
      insertedCount: inserted.length,
      skippedDuplicates: existingRekening.length
    });

  } catch (error) {
    console.error("Error saat upload rekening:", error);
    res.status(500).json({
      message: "Gagal upload data rekening",
      error: error.message
    });
  }
});

// API: Bulk export Rekening
app.get('/api/rekening/export', async (req, res) => {
  try {
    const data = await RekModel.find();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Tidak ada data untuk diexport." });
    }

    const exportRows = data.map(item => ({
      URL: item.url || '',
      Bank: item.bank || '',
      'No Rek': item.NoRekening || '',
      'Date Found': item.DateFound ? formatDateExport(item.DateFound) : '',
      'Date Blocked': item.DateBlocked ? formatDateExport(item.DateBlocked) : '',
      'Status Rekening': item.StatusRekening || '',
      Directory: item.directory || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RekeningExport");

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="data_rekening_export_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error saat export rekening:', error); // lihat terminal ini
    res.status(500).json({ message: "Gagal export data rekening", error: error.message });
  }
});

// API: Fetch all QRIS data
app.get('/api/qris', async (req, res) => {
  try {
    const qrisData = await QRISModel.find(); // misal ambil data dari MongoDB
    res.json(qrisData);
  } catch (error) {
    console.error('Error fetching QRIS data:', error);
    res.status(500).send('Server error');
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

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: "Invalid data format." });
    }

    // Normalisasi field names dan validasi
    const normalizedData = data.map(item => ({
      url: (item.url || "").trim(),
      bank: (item.bank || "").trim(),
      NoQRIS: item.NoQRIS,
      DateFound: item.DateFound  ? new Date(item.DateFound) : null,
      DateBlocked: item.DateBlocked  ? new Date(item.DateBlocked) : null,
      StatusQRIS: item.StatusQRIS === "Blocked" ? true : item.StatusQRIS === "Active" ? false : Boolean(item.StatusQRIS),
      GambarQRIS: item.GambarQRIS || item.gambarQRIS || ""
    }));

    
    // Cek duplikat URL dalam data yang diupload
    const urls = new Set();
    const duplicateUrls = [];

    for (const item of normalizedData) {
      if (urls.has(item.url)) {
        duplicateUrls.push(item.url); // Simpan URL yang duplikat
      } else {
        urls.add(item.url);
      }
    }

    // Jika ada URL duplikat, kirimkan pesan error
    if (duplicateUrls.length > 0) {
      return res.status(400).json({
        message: `Duplicate URLs found: ${duplicateUrls.join(", ")}`
      });
    }

    // Validasi dan pengecekan URL di database
    const existingUrls = await QRISModel.find({ url: { $in: Array.from(urls) } });

    if (existingUrls.length > 0) {
      const existingUrlsSet = new Set(existingUrls.map(item => item.url));
      const duplicateInDb = Array.from(urls).filter(url => existingUrlsSet.has(url));

      if (duplicateInDb.length > 0) {
        return res.status(400).json({
          message: `These URLs already exist in the database: ${duplicateInDb.join(", ")}`
        });
      }
    }

    // Insert data ke MongoDB jika tidak ada duplikat
    await QRISModel.insertMany(normalizedData);

    res.json({ message: "Data uploaded successfully." });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error during upload." });
  }
});

// Endpoint untuk ekspor data QRIS ke Excel
app.get('/api/qris/export', async (req, res) => {
  try {
    // Mengambil semua data QRIS dari database
    const qrisData = await QRISModel.find();

    // Menyiapkan data untuk worksheet
    const dataForExcel = qrisData.map(item => ({
      URL: item.url,
      Bank: item.bank,
      NoQRIS: item.NoQRIS,
      DateFound: item.DateFound ? new Date(item.DateFound).toLocaleDateString('en-US') : '-',
      DateBlocked: item.DateBlocked ? new Date(item.DateBlocked).toLocaleDateString('en-US') : '-',
      StatusQRIS: item.StatusQRIS ? 'Blocked' : 'Active', // Sesuaikan dengan StatusQRIS
      GambarQRIS: item.GambarQRIS || '-',
    }));

    // Membuat worksheet dan workbook
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QRIS Data');

    // Mengkonversi ke file excel buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Menyusun header response
    res.setHeader('Content-Disposition', `attachment; filename=qris_data_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Mengirimkan file excel ke client
    res.send(excelBuffer);

  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Gagal mengekspor data." });
  }
});


// Helper format tanggal
function formatDateExport(date) {
  const d = new Date(date);
  if (isNaN(d)) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
