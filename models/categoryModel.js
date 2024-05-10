const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },

  createdOn:{
    type: Date,
    required: true
  },

  deleted: {
    type: Boolean,
    required:true,
    default: false
  }
});

module.exports = mongoose.model('Category', categorySchema);