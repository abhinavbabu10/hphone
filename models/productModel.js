const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category:{
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  media:[{
    type: String,
    required: true
  }],
  isUnlisted:{
    type: Boolean,
    default: false
  },
  
  createdOn: 
  { type: Date,
required: true,
default: Date.now
 },

discountPrice:{
  type:Number,
  default:0,
  min:0
}
});

module.exports = mongoose.model('Product', productSchema);