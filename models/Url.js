const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  url: String,
  inputBy: String,
  flagSystem: Boolean,
  flagUser: Boolean,
  webStatus: String,
  uid: String,
  password: String,
  firstCrawl: Date,
  lastCrawl: Date,
  lastUpdate: Date,
  crawlStatus: Boolean
});

const UrlModel = mongoose.model('Url', urlSchema, 'crawlData');

module.exports = UrlModel;
