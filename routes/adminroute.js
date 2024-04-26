const express=require("express")
const adminRoute = express()
// const multer=require("multer")
const path=require("path")

const session=require("express-session")

adminRoute.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: true
    })
);


adminRoute.set("view engine","ejs")
adminRoute.set("views","./views/admin")

const adminController = require("../controllers/adminController")

adminRoute.get('/', adminController.loadAdminLogin);
adminRoute.get("/admindash", adminController.loadDashboard)
adminRoute.post('/', adminController.verifyAdmin);


//users
adminRoute.get("/userlist",adminController.userslist)


module.exports=adminRoute