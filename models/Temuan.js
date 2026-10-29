const mongoose = require('mongoose');

const temuanSchema = new mongoose.Schema({
  judolSite: String,
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  originalJudolSite: String,
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
