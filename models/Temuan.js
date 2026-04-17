const mongoose = require('mongoose');

const temuanSchema = new mongoose.Schema({
  judolSite: String,
  taskDate: Date,
  type: String,
  bankName: String,
  identifierNo: String,
  fileName: String,
  titleSite: String,
  updatedBy: String,
  updatedDate: Date
});

const TemuanModel = mongoose.model('Temuan', temuanSchema, 'temuanData');

module.exports = TemuanModel;
