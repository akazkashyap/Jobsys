const mongoose = require("mongoose");

const category = mongoose.Schema({
  title: {
    type: String,
    unique: true,
    lowercase: true,
  },
  jobCount: Number,
});

const Category = mongoose.model("Category", category);
module.exports = Category;
