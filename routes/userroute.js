const express = require("express");
const userroute = express();
const path = require("path");

const auth = require("../middleware/auth");

userroute.set("view engine", "ejs");
userroute.set('views', './views/users');

const userController = require("../controllers/userController");

userroute.get('/',auth.isLogin,userController.loadhome);

userroute.get('/signup',auth.isLogout,userController.loadsignup);
userroute.post('/signup',userController.insertUser);

userroute.get('/login',userController.loadlogin);
userroute.post('/login', userController.verifyLogin);

userroute.get('/otp', userController.loadotp);
userroute.post('/otp',userController.verifyOTP)
userroute.post('/resendOTP',userController.resendOTP)


userroute.get('/shop',userController.loadShop)
userroute.get('/shop-detail',userController.loadShopdetail)
userroute.get('/logout', userController.logout)

userroute.get('/profile',auth.isLogin, userController.loadProfile)
userroute.post('/edit-detail', userController.editDetail)
userroute.post('/reset-password',userController.resetPassword)

userroute.post('/add-address',userController.addAddress)
userroute.post('/edit-address',userController.updateAddress)
userroute.post('/delete-address',userController.deleteAddress)





module.exports = userroute;