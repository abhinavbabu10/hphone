const User = require('../models/userModel');
const Coupon = require("../models/couponModel")

const loadCoupon = async (req, res) => {

  const page = parseInt(req.query.page) || 1; 
  const limit = 10; 
  const skip = (page - 1) * limit;

  try {
    const coupons = await Coupon.find().skip(skip).limit(limit);
    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);

    res.render('coupon', { coupons, totalPages, currentPage: page });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }

};

const addCoupon = async (req, res) => {
  try {
      const { couponname, couponcode, discountpercentage, status, minimumamount, maximumDiscountAmount } = req.body;
      

      if (!couponname || !couponcode || !discountpercentage|| !status || !minimumamount || !maximumDiscountAmount) {
          return res.status(400).json({ message: 'All fields are required' });
      }

      const existingCoupon = await Coupon.findOne({ couponname });
      if (existingCoupon) {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit;

     const coupons = await Coupon.find().skip(skip).limit(limit);
     const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / limit);
          return res.render("coupon", { message: 'Coupon code already exists', coupons, totalPages, currentPage: page });
      }

      const newCoupon = new Coupon({
          couponname,
          couponcode,
          discountpercentage,
          status,
          minimumamount,
          maximumDiscountAmount
      });

      await newCoupon.save();
      res.redirect('/admin/coupon')
     
  } catch (error) {
      console.error('Error adding coupon:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};

const editCoupon = async (req, res) => {
  try {
    const { couponId, couponname, couponcode, discountpercentage, status, minimumamount, maximumDiscountAmount } = req.body;
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const existingCoupon = await Coupon.findOne({ couponname });
    if (existingCoupon && existingCoupon._id.toString() !== couponId) {
      const page = parseInt(req.query.page) || 1; 
      const limit = 10; 
      const skip = (page - 1) * limit;

      const coupons = await Coupon.find().skip(skip).limit(limit);
      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);

      return res.render("coupon", { message: 'Coupon code already exists', coupons, totalPages, currentPage: page });
    }

    coupon.couponname = couponname;
    coupon.couponcode = couponcode;
    coupon.discountpercentage = discountpercentage;
    coupon.status = status;
    coupon.minimumamount = minimumamount;
    coupon.maximumDiscountAmount = maximumDiscountAmount;

    await coupon.save();

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error('Error editing coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const deleteCoupon = async(req,res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.status(200).send({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
};







const applyCoupon = async (req, res) => {
  try {
      const { couponCode, totalAmount } = req.body;
      const userId = req.session.userData;

      if (!userId) {
          return res.status(400).json({ success: false, message: 'User not logged in.' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const coupon = await Coupon.findOne({ couponcode: couponCode, status: 'active' });
      if (!coupon) {
          return res.json({ success: false, message: 'Invalid or inactive coupon code.' });
      }

      if (coupon.usedBy.includes(userId)) {
          return res.json({ success: false, message: 'You have already used this coupon.' });
      }

      if (totalAmount < coupon.minimumamount) {
          return res.json({ success: false, message: `Minimum purchase amount of ₹${coupon.minimumamount} required for this coupon.` });
      }

      const discountPercentage = coupon.discountpercentage;
      let discountAmount = (totalAmount * discountPercentage) / 100;
      let newTotalAmount = totalAmount - discountAmount;

      if (coupon.maximumDiscountAmount && discountAmount > coupon.maximumDiscountAmount) {
          discountAmount = coupon.maximumDiscountAmount;
          newTotalAmount = totalAmount - discountAmount;
      }

      coupon.usedBy.push(userId);
      await coupon.save();

      res.json({
          success: true,
          discountAmount,
          newTotalAmount,
      });
  } catch (error) {
      console.error('Error applying coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

const removeCoupon = async (req, res) => {
  try {
      const userId = req.session.userData;

      if (!userId) {
          return res.status(400).json({ success: false, message: 'User not logged in.' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const coupon = await Coupon.findOne({ usedBy: userId });
      if (!coupon) {
          return res.json({ success: false, message: 'No coupon applied.' });
      }

      coupon.usedBy = coupon.usedBy.filter(id => id.toString() !== userId.toString());
      await coupon.save();

      res.json({ success: true });
  } catch (error) {
      console.error('Error removing coupon:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};




  
  module.exports = {
    loadCoupon,
    addCoupon,
    editCoupon,
    deleteCoupon,
    applyCoupon,
    removeCoupon 
  };