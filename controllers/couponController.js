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


  const addCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        const { couponname, couponcode, discountamount, startDate, endDate, status, minimumamount } = req.body;

        if (!couponname || !couponcode || !discountamount || !startDate || !endDate || !status || !minimumamount) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingCoupon = await Coupon.findOne({ couponcode });
        if (existingCoupon) {
            return res.render("coupon", { message: 'Coupon code already exists', coupons });
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
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



const editCoupon = async (req, res) => {
  try {
    const { couponId, couponname, couponcode, discountamount, startDate, endDate, status, minimumamount } = req.body;
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.couponname = couponname;
    coupon.couponcode = couponcode;
    coupon.discountamount = discountamount;
    coupon.startDate = startDate;
    coupon.endDate = endDate;
    coupon.status = status;
    coupon.minimumamount = minimumamount;
     await coupon.save();

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error('Error editing coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



const deleteCoupon = async(req,res) => {

}












  
  module.exports = {
    loadCoupon,
    addCoupon,
    editCoupon,
    deleteCoupon
  };