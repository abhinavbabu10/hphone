const mongoose = require("mongoose");

const userOPTVerificationSchema = new mongoose.Schema({
    userId:String,
    otp:String,
    createdAt:Date,
    expiredAt:Date
})

const userOPTVerification = mongoose.model(
    "UserOTPVerification",
    userOPTVerificationSchema
)

module.exports = userOPTVerification;