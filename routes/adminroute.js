const express=require("express")
const adminRoute = express()
const userManagement = require("../controllers/userManagement")
const adminController = require("../controllers/adminController")
const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
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



adminRoute.get('/', adminController.loadAdminLogin);
adminRoute.post('/', adminController.verifyAdmin);
adminRoute.get("/home", adminController.loadDashboard)



// users
adminRoute.get("/customer",userManagement.loadcustomers);
adminRoute.post('/users/:id/block',userManagement.blockUnblockuser);

//category
adminRoute.get("/category", categoryController.loadCategory);
adminRoute.post("/add-category", categoryController.addCategory);
adminRoute.post("/update-category/:id", categoryController.editCategory)
adminRoute.post("/delete-category/:id", categoryController.confirmDelete)

//product

adminRoute.get("/product", productController.loadProduct)
adminRoute.get("/add-product", productController.loadAddProduct)
adminRoute.post("/add-product",productController.addProduct)
adminRoute.get("/edit-product/:id",productController.editProduct)
adminRoute.post("/edit-product/:id",productController.updateProduct)
adminRoute.post("/delete-product/:id",productController.deleteProduct)
adminRoute.post("/remove-image/:id",productController.removeImage)


module.exports=adminRoute