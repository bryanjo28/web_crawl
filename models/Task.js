const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskDate: Date,
  url: String,
  title: String,
  username: String,
  password: String,
  flagJudol: Boolean,
  statusSite: Boolean,
  pic: String,
  lastUpdatedBy: String,
  lastUpdateDate: Date
});

const TaskModel = mongoose.model('Task', taskSchema, 'taskData');

module.exports = TaskModel;
