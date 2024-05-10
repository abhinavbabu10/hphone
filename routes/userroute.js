const express = require("express");
const userroute = express();
const path = require("path");

const auth = require("../middleware/auth");

userroute.set("view engine", "ejs");
userroute.set('views', './views/users');

const userController = require("../controllers/userController");

userroute.get('/', userController.loadhome);

userroute.get('/signup',userController.loadsignup);
userroute.post('/signup', userController.insertUser);

userroute.get('/login', userController.loadlogin);
userroute.post('/login', userController.verifyLogin);

userroute.get('/otp', userController.loadotp);
userroute.post('/otp',userController.verifyOTP)
userroute.post('/verifyOTP',userController.verifyOTP)
userroute.post('/resendOTP',userController.resendOTP)



module.exports = userroute;