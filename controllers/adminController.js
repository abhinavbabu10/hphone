const User = require('../models/userModel')
const Order = require("../models/orderModel")
const Product = require("../models/productModel")
const { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } = require('date-fns');
const bcrypt = require('bcrypt')


const loadAdminLogin = async (req, res) => {
    try {
        res.render('adminlogin',{message: ""})
    } catch (error) {
        console.log(error)
    }
}

const verifyAdmin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userdata = await User.findOne({ email: email });
        if (userdata) {
            const passwordMatch = await bcrypt.compare(password, userdata.password);
            if (passwordMatch) {
                if (userdata.is_admin=== 0) {
                    res.render('adminlogin', { message: "Email and password are incorrect" });
                } else {
                    req.session.adminData = userdata.id;
                    res.redirect('/admin/home');
                }
            } else {
                res.render('adminlogin', { message: "Email and password are incorrect" });
            }
        } else {
            res.render('adminlogin', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const loadDashboard = async(req,res)=>{
    try {
        const totalRevenueResult = await Order.aggregate([
            { $match: { orderStatus: 'Delivered' } },
            { $group: { _id: null, totalRevenue: { $sum: "$billTotal" } } },
            { $project: { _id: 0, totalRevenue: 1 } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        // Calculate Orders
        const deliveredOrders = await Order.countDocuments({ orderStatus: "Delivered" });

        // Calculate Products
        const totalProducts = await Product.countDocuments({ isDeleted: false });

        // Calculate Total Categories
        const totalCategories = await Product.distinct('category', { isDeleted: false });

        // Calculate Monthly Earnings for Delivered Orders
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyEarningsResult = await Order.aggregate([
            { $match: { orderStatus: 'Delivered', orderDate: { $gte: startOfMonth } } },
            { $group: { _id: null, monthlyEarnings: { $sum: "$billTotal" } } },
            { $project: { _id: 0, monthlyEarnings: 1 } }
        ]);
        const monthlyEarnings = monthlyEarningsResult[0]?.monthlyEarnings || 0;

     

        // Find Top 10 Products
        const topProducts = await Order.aggregate([
            { $match: { orderStatus: 'Delivered' } },
            { $unwind: "$items" },
            { $group: { _id: "$items.productId", totalOrders: { $sum: "$items.quantity" } } },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" },
            { $project: { _id: 1, product: 1, totalOrders: 1 } }
        ]);

        // Find Top Categories
        const topCategories = await Order.aggregate([
            { $match: { orderStatus: 'Delivered' } },
            { $unwind: "$items" },
            { 
                $lookup: { 
                    from: 'products',
                    localField: 'items.productId', 
                    foreignField: '_id', 
                    as: 'productInfo' 
                } 
            }, 
            { $unwind: "$productInfo" },
            { $group: { _id: "$productInfo.category", totalRevenue: { $sum: "$items.price" } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        // console.log("totalRevenue",totalRevenue);
        // console.log("deliveredOrders",deliveredOrders);
        // console.log("totalProducts",totalProducts);
        // console.log("monthlyEarnings", monthlyEarnings)
        // console.log("topProducts",topProducts);
        // console.log("topCategories",topCategories);

        res.render("home", {
            totalRevenue,
            deliveredOrders ,
            totalProducts,
            totalCategories,
            monthlyEarnings,
            topProducts,
            topCategories
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


const filterGraph = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        console.log("Filter:", filter);
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);
        
        let matchCriteria = { orderStatus: 'Delivered' }; // Filtering only delivered orders

        switch (filter) {
            case 'weekly':
                matchCriteria.orderDate = {
                    $gte: startOfWeek(new Date()),
                    $lte: endOfWeek(new Date())
                };
                break;
            case 'monthly':
                matchCriteria.orderDate = {
                    $gte: startOfMonth(new Date()),
                    $lte: endOfMonth(new Date())
                };
                break;
            case 'yearly':
                matchCriteria.orderDate = {
                    $gte: startOfYear(new Date()),
                    $lte: endOfYear(new Date())
                };
                break;
            case 'custom':
                if (startDate && endDate) {
                    matchCriteria.orderDate = {
                        $gte: new Date(startDate),
                        $lte: new Date(endDate)
                    };
                } else {
                    console.log("Invalid date range");
                    return res.status(400).json({ error: 'Invalid date range' });
                }
                break;
            default:
                console.log("Invalid filter option");
                return res.status(400).json({ error: 'Invalid filter option' });
        }

        console.log("Match Criteria:", matchCriteria);

        const orders = await Order.aggregate([
            { $match: matchCriteria },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: filter === 'yearly' ? "%Y" : filter === 'monthly' ? "%Y-%m" : "%Y-%m-%d",
                            date: "$orderDate"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log("Orders:", orders);

        const labels = orders.map(order => order._id);
        const data = orders.map(order => order.count);

        res.json({ labels, data });
    } catch (error) {
        console.log("Failed to filter graph:", error.message);
        res.status(500).json({ error: "Failed to filter graph" });
    }
};









const adminlogout = async(req,res)=>{
    try{
    req.session.adminData=null
    res.redirect('/admin/')
  }catch (error){
      console.log(error)
}

};







module.exports = {
  loadAdminLogin,
  loadDashboard,
  filterGraph,
  verifyAdmin,
  adminlogout
}