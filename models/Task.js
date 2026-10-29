const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskDate: Date,
  tanggalTemuan: Date,
  url: String,
  title: String,
  username: String,
  password: String,
  flagJudol: Boolean,
  statusSite: Boolean,
  replacementSiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  replacementUrl: String,
  replacementTitle: String,
  pic: String,
  lastUpdatedBy: String,
  lastUpdateDate: Date
});

const TaskModel = mongoose.model('Task', taskSchema, 'taskData');

module.exports = TaskModel;
