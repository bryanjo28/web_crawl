const mongoose = require('mongoose');

// Keyword Schema
const keywordSchema = new mongoose.Schema({
  keyword: String,
});

// Model untuk Keyword
const KeyModel = mongoose.model('Keyword', keywordSchema, 'listKeyword');

module.exports = KeyModel;
