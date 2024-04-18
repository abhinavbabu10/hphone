const express = require("express");
const userroute = express();
const path = require("path");

// Import the auth middleware
const auth = require("../middleware/auth");

userroute.set("view engine", "ejs");
userroute.set('views', './views/users');

const userController = require("../controllers/userController");

userroute.get('/', userController.loadhome);
userroute.get('/signup',userController.loadsignup);
userroute.get('/login', userController.loadlogin);
userroute.get('/otp', userController.loadotp);
userroute.post('/login', userController.verifyLogin);
userroute.post('/signup', userController.insertUser);

userroute.get('/verify', userController.sendVerifyMail);

module.exports = userroute;
