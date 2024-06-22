const Order = require("../models/orderModel")
const User = require("../models/userModel")
const Product = require("../models/productModel")

const Coupon = require("../models/couponModel")

const loadCoupon = async (req, res) => {
    try {
      const coupons = await Coupon.find();
  
      res.render('coupon', { coupons });
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Server Error');
    }
  };


const addCoupon = async (req,res) =>{
    try {

        const coupons = await Coupon.find();
  
        const { couponname, couponcode, discountamount, startDate, endDate, status, minimumamount } = req.body;

        if (!couponname || !couponcode || !discountamount || !startDate || !endDate || !status || !minimumamount) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingCoupon = await Coupon.findOne({ couponcode });
        if (existingCoupon) {
            return res.render("coupon",{ message: 'Coupon code already exists' , coupons});
        }

   
        const newCoupon = new Coupon({
            couponname,
            couponcode,
            discountamount,
            startDate,
            endDate,
            status,
            minimumamount
        });

   
        await newCoupon.save();
        res.redirect("/admin/coupon");

        res.status(201).json({ message: 'Coupon added successfully', coupon: newCoupon });
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

}













  
  module.exports = {
    loadCoupon,
    addCoupon
  };