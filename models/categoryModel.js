const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  normalized_name: {
    type: String,
    required: true,
    unique: true
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
    default: false
  },

  discount:{
    type:Number,
    default:0
}

});

module.exports = mongoose.model('Category', categorySchema);