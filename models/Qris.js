const mongoose = require('mongoose');

// QRIS Schema
const qrisSchema = new mongoose.Schema({
  url: String,
  bank: String,
  NoQRIS: String,
  DateFound: Date,
  DateBlocked: Date,
  StatusQRIS: Boolean,
  GambarQRIS: String, // Menyimpan gambar sebagai Base64 string
});

// Model untuk QRIS
const QRISModel = mongoose.model('QRIS', qrisSchema, 'qrisJudol');

module.exports = QRISModel;
