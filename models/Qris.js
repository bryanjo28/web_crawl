const mongoose = require('mongoose');

// QRIS Schema
const qrisSchema = new mongoose.Schema({
  url: { type: String, required: true },
  bank: { type: String, required: true },
  NoQRIS: { type: String, required: true },
  DateFound: { type: Date, required: true },
  DateBlocked: { type: Date },
  StatusQRIS: { type: Boolean, required: true },
  GambarQRIS: { type: String }, // Menyimpan gambar sebagai Base64 string
});

// Model untuk QRIS
const QRISModel = mongoose.model('QRIS', qrisSchema, 'qrisJudol');

module.exports = QRISModel;
