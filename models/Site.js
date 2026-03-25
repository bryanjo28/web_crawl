const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  url: String,
  status: Boolean,
  lastScan: Date,
  lastUpdateBy: String,
  lastUpdate: Date,
});

const SiteModel = mongoose.model('Site', siteSchema, 'siteData');

module.exports = SiteModel;
