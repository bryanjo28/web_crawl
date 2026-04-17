const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  judolSite: String,
  title: String,
  username: String,
  password: String,
  flagJudol: Boolean,
  status: Boolean,
  assetSite: String,
  lastCrawl: Date,
  lastGetAsset: Date,
  lastUpdateBy: String,
  lastUpdateDate: Date,
  // Legacy fields retained for backward compatibility with existing documents.
  url: String,
  lastScan: Date,
  lastUpdate: Date,
});

const SiteModel = mongoose.model('Site', siteSchema, 'siteData');

module.exports = SiteModel;
