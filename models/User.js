const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    trim: true,
    default: ""
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    trim: true,
    default: "system"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedBy: {
    type: String,
    trim: true,
    default: "system"
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
});

// Model User
const UserModel = mongoose.model("User", userSchema, "users");

module.exports = UserModel;
