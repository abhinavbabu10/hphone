const express=require("express")
const adminRoute = express()
const path=require("path")

const session=require("express-session")
const secretKey = process.env.SECRET_KEY;

adminRoute.use(
    session({
        secret: secretKey,
        resave: false,
        saveUninitialized: true
    })
);


adminRoute.set("view engine","ejs")
adminRoute.set("views","./views/admin")

const adminController = require("../controllers/adminController")

adminRoute.get('/', adminController.loadAdminLogin);
adminRoute.get("/home", adminController.loadDashboard)
adminRoute.post('/', adminController.verifyAdmin);


// users
const userManagement = require("../controllers/userManagement")

adminRoute.get("/customer",userManagement.loadcustomers );







module.exports=adminRoute