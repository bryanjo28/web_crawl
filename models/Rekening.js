const mongoose = require('mongoose');

const rekSchema = new mongoose.Schema({
  url: String,
  bank: String,
  NoRekening: String,
  DateFound: Date,
  DateBlocked: Date,
  StatusRekening: Boolean,
  GambarWeb: Buffer

});

const RekModel = mongoose.model('Rekening', rekSchema, 'rekeningJudol');

module.exports = RekModel;
