const mongoose = require("mongoose");
const { bool } = require("sharp");

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    is_admin:{
        type:Number,
       default:0
    },
    is_verified:{
        type:Boolean,
        default:false}  
})

module.exports = mongoose.model('User',userSchema);