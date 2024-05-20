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

    address:[{
        houseName: {
            type: String,
            required: true
        },
        street: {
            type: String,
            requried: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        postalCode: {
            type: Number,
            required: true
        },
        phoneNumber: {
            type: Number,
            required: true
        },
        type: {
            type: String,
        }
    }],

    is_admin:{
        type:Number,
        default:0
    },
    
    is_verified:{
        type:Boolean,
        default:false}  
})

module.exports = mongoose.model('User',userSchema);