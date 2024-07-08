const express=require("express")
const adminRoute = express()
const userManagement = require("../controllers/userManagement")
const adminController = require("../controllers/adminController")
const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
const orderController = require("../controllers/orderController")
const couponController = require("../controllers/couponController")
const salesreportManagement = require("../controllers/salesreportManagement")

const path=require("path")

const adminauth = require("../middleware/adminauth");

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



adminRoute.get('/', adminauth.isAdminLogout, adminController.loadAdminLogin);

adminRoute.post('/', adminController.verifyAdmin);

adminRoute.get("/home",adminauth.isAdminLogin, adminController.loadDashboard);

adminRoute.get("/filter-graph",adminController.filterGraph);

adminRoute.get('/logout',  adminController.adminlogout)



// users
adminRoute.get("/customer", adminauth.isAdminLogin, userManagement.loadcustomers);
adminRoute.post('/users/:id',userManagement.blockUnblockuser);

//category
adminRoute.get("/category", adminauth.isAdminLogin, categoryController.loadCategory);
adminRoute.post("/add-category", categoryController.addCategory);
adminRoute.post("/update-category/:id", categoryController.editCategory)
adminRoute.post("/delete-category/:id", categoryController.confirmDelete)

//product

adminRoute.get("/product", adminauth.isAdminLogin, productController.loadProduct)
adminRoute.get("/add-product", productController.loadAddProduct)
adminRoute.post("/add-product",productController.addProduct)
adminRoute.get("/edit-product/:id",productController.editProduct)
adminRoute.post("/edit-product/:id",productController.updateProduct)
adminRoute.post("/delete-product/:id",productController.deleteProduct)
adminRoute.post("/remove-image/:id",productController.removeImage)

// order
adminRoute.get("/order", adminauth.isAdminLogin, orderController.loadOrder)
adminRoute.put("/changeStatus", orderController.changeOrderStatus)
adminRoute.get("/orderdetails", orderController.loadOrderDetails)

// coupon
adminRoute.get("/coupon", adminauth.isAdminLogin, couponController.loadCoupon)
adminRoute.post('/add-coupon', couponController.addCoupon)
adminRoute.post('/edit-coupon',couponController.editCoupon)
adminRoute.post('/delete-coupon/:id', couponController.deleteCoupon)

// salesreport
adminRoute.get("/salesreport", adminauth.isAdminLogin , salesreportManagement.loadSales)
adminRoute.post("/filterorder", salesreportManagement.filterOrders)
adminRoute.post('/generate-pdf',salesreportManagement.pdfDownload)

module.exports=adminRoute