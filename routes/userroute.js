const express = require("express");
const userroute = express();
const path = require("path");

const auth = require("../middleware/auth");

userroute.set("view engine", "ejs");
userroute.set('views', './views/users');

const userController = require("../controllers/userController");
const orderController = require("../controllers/orderController")

userroute.get('/',userController.loadhome);

userroute.get('/signup',auth.isLogout,userController.loadsignup);
userroute.post('/signup',userController.insertUser);

userroute.get('/login',userController.loadlogin);
userroute.post('/login', userController.verifyLogin);

userroute.get('/otp', userController.loadotp);
userroute.post('/otp',userController.verifyOTP)
userroute.post('/resendOTP',userController.resendOTP)


userroute.get('/forgot',userController.forgottenPassword)
userroute.post('/forgot',userController.forgotPassword)
userroute.post('/test-email',userController.emailChecking)
userroute.post('/otp-verification',userController.otpVerify)
userroute.post('/updatePassword',userController.updatePassword)



userroute.get('/shop',auth.isLogin,userController.loadShop)
userroute.get('/shop-detail',userController.loadShopdetail)
userroute.get('/logout', userController.logout)

userroute.get('/profile',auth.isLogin, userController.loadProfile)
userroute.post('/edit-detail', userController.editDetail)
userroute.post('/reset-password',userController.resetPassword)

userroute.post('/add-address',userController.addAddress)
userroute.post('/edit-address',userController.updateAddress)
userroute.post('/delete-address',userController.deleteAddress)

userroute.get('/cart',auth.isLogin,userController.loadCart);
userroute.post('/add-cart',userController.addtoCart)
userroute.post('/update-quantity',userController.updateQuantity)
userroute.post('/remove-quantity',userController.removeQuantity)
userroute.post('/checkout-quantity',userController.checkOutQuantity)
userroute.post('/confirm-quantity',userController.confirmQuantity)

userroute.get('/wishlist',auth.isLogin,userController.loadWishlist)
userroute.post('/add-wishlist',userController.addtoWishlist)
userroute.post('/remove-wishlist',userController.removeWishlist)


userroute.get('/checkout', userController.checkOut)
userroute.post('/add-addresscheckout',userController.addAddressCheckOut)

userroute.post('/placeorder',orderController.placeOrder)
userroute.post('/complete-order',orderController.onlinePlaceOrder)
userroute.get('/orderview',orderController.loadOrderView)
userroute.post("/cancelorder",orderController.cancelOrder )
userroute.put("/returnorder",orderController.returnOrder)
userroute.put("/checkWalletBalance",orderController.confirmWalletBalance)
userroute.post("/walletOrder",orderController.walletPlaceOrder)



module.exports = userroute;