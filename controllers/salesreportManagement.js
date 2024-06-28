const Order = require("../models/orderModel")

const loadSales = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const deliveredOrders = await Order.find({ orderStatus: "Delivered" })
      .populate("user")
      .populate("items.productId")
      .skip(skip)
      .limit(limit);

    const totalSalesCount = await Order.countDocuments({ orderStatus: "Delivered" });
    const totalDiscountAmount = deliveredOrders.reduce(
      (acc, order) => acc + (order.couponAmount || 0), 0
    );
    const totalSalesAmount = deliveredOrders.reduce(
      (acc, order) => acc + order.billTotal, 0
    );
    const totalPages = Math.ceil(totalSalesCount / limit);

    res.render("salesreport", {
      orders: deliveredOrders,
      totalSalesCount: totalSalesCount,
      totalDiscountAmount: parseFloat(totalDiscountAmount) || 0,
      totalSalesAmount: parseFloat(totalSalesAmount) || 0,
      totalPages: totalPages,
      currentPage: page
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};








module.exports = {
    loadSales
  }