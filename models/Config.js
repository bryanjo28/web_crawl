// models/config.js
const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  maxUrlScan: { type: Number, required: true, min: 0 },
  maxFilter: { type: Number, required: true, min: 0 },
}, { timestamps: true });

const ConfigModel = mongoose.model('config', configSchema, 'configList');
module.exports = ConfigModel;
