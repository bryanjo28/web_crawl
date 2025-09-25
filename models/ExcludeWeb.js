const mongoose = require('mongoose');

// Keyword Schema
const excludeSchema = new mongoose.Schema({
  url: String,
  inputBy: String
});

// Model untuk Keyword
const CrawlModel = mongoose.model('excludeCrawl', excludeSchema, 'excludeCrawlList');

module.exports = CrawlModel;
