const Order = require("../models/orderModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Wallet = require("../models/walletModel");
const Coupon = require("../models/couponModel");
const Razorpay = require("razorpay");
require('dotenv').config();
const PDFDocument = require("pdfkit-table");
const { v4: uuidv4 } = require('uuid');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const cart = await Cart.findOne({ userId }).populate({
      path: "product.productId",
      populate: {
        path: 'category',
        model: 'Category'
      }
    });

    if (!cart || !cart.product.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const oId = uuidv4();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { addressId, paymentMethod, total, couponCode, couponAmount, couponId, orderNotes } = req.body;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }

    const createOrderObject = () => ({
      user: userId,
      cart: cart._id,
      oId,
      items: cart.product.map((item) => {
        const product = item.productId;
        let effectivePrice = product.price;

        // Check for category discount
        if (product.category && product.category.discount > 0) {
          const categoryDiscountPrice = product.price * (1 - product.category.discount / 100);
          effectivePrice = Math.min(effectivePrice, categoryDiscountPrice);
        }

        // Check for product-specific discount
        if (product.discountPrice > 0) {
          effectivePrice = Math.min(effectivePrice, product.discountPrice);
        }

        return {
          productId: product._id,
          name: product.name,
          media: product.media,
          productPrice: effectivePrice,
          quantity: item.quantity,
        };
      }),
      billTotal: parseInt(total),
      shippingAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        postalCode: selectedAddress.postalCode,
      },
      paymentMethod,
      couponCode: couponCode || null,
      couponAmount: couponAmount || 0,
      orderNotes: orderNotes || '',
    });

    if (paymentMethod === "Razorpay") {
      var options = {
        amount: parseFloat(total) * 100, 
        currency: "INR",
        receipt: `receipt_${cart._id}`,
      };

      razorpayInstance.orders.create(options, function (err, order) {
        if (!err) {
          res.status(200).json({
            success: true,
            msg: "Order Created",
            order_id: order.id,
            amount: parseFloat(total) * 100,
            key_id: process.env.RAZORPAY_KEY_ID,
            product_name: "product",
            description: req.body.description,
            contact: "1234567891",
            name: user.name,
            email: user.email,
          });
        } else {
          console.log("Error creating Razorpay order:", err);
          res.status(500).json({ success: false, message: "Error creating Razorpay order" });
        }
      });
    } else if (paymentMethod === "COD" || paymentMethod === "Wallet") {
      const newOrder = new Order(createOrderObject());

      if (paymentMethod === "Wallet") {
        const userWallet = await Wallet.findOne({ user: userId });
        if (!userWallet || userWallet.walletBalance < total) {
          return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }
        userWallet.walletBalance -= total;
        userWallet.amountSpent += total;
        userWallet.transactions.push({
          amount: total,
          description: `Order payment for Order id:${oId}`,
          type: 'debit'
        });
        await userWallet.save();
        newOrder.paymentStatus = "Success";
      }

      await newOrder.save();

      for (const item of newOrder.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found`);
        }
        product.stock -= item.quantity;
        await product.save();
      }
      await Cart.findOneAndDelete({ userId });

      if (couponId) {
        const coupon = await Coupon.findById(couponId);
        if (coupon && !coupon.usedBy.includes(userId)) {
          coupon.usedBy.push(userId);
          await coupon.save();
        }
      }

      res.status(201).json({ success: true, message: "Order placed successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const onlinePlaceOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const cart = await Cart.findOne({ userId }).populate({
      path: "product.productId",
      populate: {
        path: 'category',
        model: 'Category'
      }
    });
    
    if (!cart || !cart.product.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const oId = uuidv4();
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { addressId, total, paymentMethod, paymentStatus, subtotal, couponCode, couponAmount, orderNotes } = req.query;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }

    const newOrder = new Order({
      user: userId,
      cart: cart._id,
      oId,
      items: cart.product.map((item) => {
        const product = item.productId;
        let effectivePrice = product.price;

        // Check for category discount
        if (product.category && product.category.discount > 0) {
          const categoryDiscountPrice = product.price * (1 - product.category.discount / 100);
          effectivePrice = Math.min(effectivePrice, categoryDiscountPrice);
        }

        // Check for product-specific discount
        if (product.discountPrice > 0) {
          effectivePrice = Math.min(effectivePrice, product.discountPrice);
        }

        return {
          productId: product._id,
          name: product.name,
          media: product.media,
          productPrice: effectivePrice,
          quantity: item.quantity,
        };
      }),
      billTotal: parseInt(total),
      shippingAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        postalCode: selectedAddress.postalCode,
      },
      paymentMethod,
      couponCode: couponCode || null,
      couponAmount: couponAmount || 0,
      paymentStatus,
      orderNotes: orderNotes || '',
    });

    await newOrder.save();

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponcode: couponCode });
      if (coupon && !coupon.usedBy.includes(userId)) {
        coupon.usedBy.push(userId);
        await coupon.save();
      }
    }

    if (newOrder.paymentStatus === "Success") {
      for (const item of newOrder.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found`);
        }
        product.stock -= item.quantity;
        await product.save();
      }

      await Cart.findOneAndDelete({ userId });

      res.status(201).json({ success: true, message: "Order placed successfully" });
    } else if (newOrder.paymentStatus === "Failed") {
      await Cart.findOneAndDelete({ userId });
      res.status(201).json({ success: true, message: "Payment failed, please retry" });
    } else {
      res.status(400).json({ success: false, message: "Invalid payment status" });
    }
  } catch (error) {
    console.error("Error completing order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const loadOrderView = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { id } = req.query;
    const user = await User.findById(userId);
    const order = await Order.findById(id).populate({
      path: 'items.productId',
      populate: {
        path: 'category',
        model: 'Category'
      }
    });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Calculate effective prices and discounts for each item
    const updatedItems = await Promise.all(order.items.map(async (item) => {
      const product = item.productId;
      const category = product.category;

      let effectivePrice = product.price;
      let categoryDiscountPrice = 0;
      let productDiscountPrice = 0;

      if (category && category.discount > 0) {
        categoryDiscountPrice = product.price * (1 - category.discount / 100);
        effectivePrice = Math.min(effectivePrice, categoryDiscountPrice);
      }

      if (product.discountPrice > 0) {
        productDiscountPrice = product.discountPrice;
        effectivePrice = Math.min(effectivePrice, productDiscountPrice);
      }

      return {
        ...item.toObject(),
        categoryDiscountPrice: categoryDiscountPrice,
        productDiscountPrice: productDiscountPrice,
        effectivePrice: effectivePrice
      };
    }));

    res.render('orderview', {
      user,
      order: {
        ...order.toObject(),
        items: updatedItems
      }
    });

  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};


// const cancelOrder = async (req, res) => {
//   const { orderId, itemId, cancellationReason } = req.body;

//   try {
//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({ message: 'Order not found' });
//     }

//     const item = order.items.id(itemId);

//     if (!item) {
//       return res.status(404).json({ message: 'Item not found in order' });
//     }

//     if (item.status === 'Cancelled') {
//       return res.status(400).json({ message: 'Item has already been cancelled' });
//     }
    
//     // Calculate the refund amount considering coupon discount
//     let refundAmount = item.quantity * item.productPrice;
//     let couponDiscount = 0;
    
//     if (order.couponAmount > 0) {
//       const totalBeforeDiscount = order.items.reduce((sum, i) => sum + (i.productPrice * i.quantity), 0);
//       const itemProportion = refundAmount / totalBeforeDiscount;
      
//       couponDiscount = order.couponAmount * itemProportion;
//       refundAmount -= couponDiscount;
//     }

//     item.status = 'Cancelled';
//     item.cancellationReason = cancellationReason;
//     item.cancellationDate = new Date();

//     const product = await Product.findById(item.productId);
//     if (product) {
//       product.stock += item.quantity;
//       await product.save();
//     }

//     // Recalculate the order total
//     const activeItems = order.items.filter(i => i.status !== 'Cancelled');
//     order.billTotal = activeItems.reduce((total, i) => total + (i.productPrice * i.quantity), 0);
    
//     // Adjust coupon amount if applicable
//     if (order.couponAmount > 0) {
//       order.couponAmount -= couponDiscount;
//       order.couponAmount = Math.max(0, order.couponAmount); // Ensure coupon amount is not negative
//       order.billTotal -= order.couponAmount;
//     }

//     // Ensure billTotal is not negative
//     order.billTotal = Math.max(0, order.billTotal);

//     if (activeItems.length === 0) {
//       order.orderStatus = 'Cancelled';
//       order.cancellationReason = cancellationReason;
//       order.couponAmount = 0;
//       order.billTotal = 0;
//     } else {
//       order.orderStatus = 'Partially Cancelled';
//     }

//     await order.save();

//     let wallet = await Wallet.findOne({ user: order.user });
//     if (!wallet) {
//       wallet = new Wallet({ user: order.user, walletBalance: 0 });
//     }

//     wallet.walletBalance += refundAmount;
//     wallet.transactions.push({
//       amount: refundAmount,
//       description: `Refund for cancelled item from order ${order.oId}`,
//       type: 'Credit',
//       transactionDate: new Date()
//     });

//     await wallet.save();

//     res.status(200).json({ 
//       message: 'Order has been cancelled and amount refunded successfully',
//       refundAmount,
//       newOrderTotal: order.billTotal,
//       newOrderStatus: order.orderStatus
//     });
//   } catch (error) {
//     console.error('Error cancelling order:', error);
//     res.status(500).json({ message: 'An error occurred while cancelling the order' });
//   }
// };


const cancelOrder = async (req, res) => {
  try {
    const { orderId, itemId, cancellationReason } = req.body;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.find(item => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in the order' });
    }

    if (item.status === 'Cancelled') {
      return res.status(400).json({ message: 'Item is already cancelled' });
    }

    item.status = 'Cancelled';
    item.cancellationReason = cancellationReason;
    item.cancellationDate = new Date();

    // Calculate refund amount
    let refundAmount = item.productPrice * item.quantity;

    // Handle coupon adjustments
    let couponAdjustment = 0;
    if (order.couponAmount > 0) {
      const itemTotalPrice = item.productPrice * item.quantity;
      couponAdjustment = order.couponAmount * (itemTotalPrice / order.billTotal);
      couponAdjustment = Math.min(couponAdjustment, order.couponAmount);
      order.couponAmount = Math.max(0, order.couponAmount - couponAdjustment);
    }

    // Calculate total refund including coupon adjustment
    const totalRefund = refundAmount - couponAdjustment;

    // Update order total
    order.billTotal = Math.max(0, order.billTotal - refundAmount);

    // Process refund to wallet if payment was successful
    if (order.paymentStatus === 'Success') {
      let wallet = await Wallet.findOne({ user: order.user });
      
      if (!wallet) {
        wallet = new Wallet({ user: order.user, walletBalance: 0 });
      }

      wallet.walletBalance += totalRefund;
      wallet.transactions.push({
        amount: totalRefund,
        description: `Refund for order ${order.oId}`,
        type: 'Credit'
      });

      await wallet.save();
    }

    // Update order status
    const remainingActiveItems = order.items.filter(item => item.status !== 'Cancelled');
    if (remainingActiveItems.length === 0) {
      order.orderStatus = 'Cancelled';
    } else {
      order.orderStatus = 'Partially Cancelled';
    }

    // Ensure values are not NaN before saving
    if (isNaN(order.couponAmount)) order.couponAmount = 0;
    if (isNaN(order.billTotal)) order.billTotal = 0;

    await order.save();

    res.status(200).json({ 
      message: 'Order cancelled successfully', 
      refundAmount: totalRefund 
    });

  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const loadOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;

    const totalOrderCount = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrderCount / perPage);
    const skip = (page - 1) * perPage;

    const orders = await Order.find({})
      .populate('user')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(perPage);
    
    res.render("order", { orders, currentPage: page, totalPages });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}

const changeOrderStatus = async (req, res) => {
  try {
    const { orderId, orderStatus } = req.body;
    
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const canChangeItemStatus = (item) => {
      return item.status !== 'Cancelled' && item.status !== 'Returned';
    };

    if (orderStatus === "Shipped" || orderStatus === "Delivered") {
      order.items.forEach(item => {
        if (canChangeItemStatus(item)) {
          item.status = orderStatus;
        }
      });
    }

    const itemStatuses = order.items.map(item => item.status);
    const uniqueStatuses = [...new Set(itemStatuses)];

    if (uniqueStatuses.length === 1) {
      order.orderStatus = uniqueStatuses[0];
    } else if (itemStatuses.includes('Delivered')) {
      order.orderStatus = 'Partially Delivered';
    } else if (itemStatuses.includes('Shipped')) {
      order.orderStatus = 'Partially Shipped';
    } else if (itemStatuses.includes('Cancelled') && itemStatuses.includes('Pending')) {
      order.orderStatus = 'Partially Cancelled';
    } else {
      order.orderStatus = 'Processing';
    }

    if (orderStatus === "Delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "Success";
    }

    await order.save();

    res.status(200).json({ 
      message: 'Order status updated successfully', 
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        billTotal: order.billTotal,
        items: order.items.map(item => ({
          _id: item._id,
          status: item.status,
          name: item.name,
          quantity: item.quantity,
          productPrice: item.productPrice
        }))
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'An error occurred while updating order status' });
  }
};


const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.userData;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of items per page
    const skip = (page - 1) * limit;

    // Fetch the order with paginated items
    const order = await Order.findById(orderId)
      .populate({
        path: 'items',
        options: {
          skip: skip,
          limit: limit
        }
      })
      .exec();

    const user = await User.findById(userId);

    // Calculate total pages
    const totalItems = order.items.length;
    const totalPages = Math.ceil(totalItems / limit);

    res.render('orderdetails', {
      order,
      user,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.log(error.message);
  }
};



const returnOrder = async (req, res) => {
  try {
    const { orderId, itemId, returnReason } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.find(item => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in the order' });
    }

    if (item.status !== 'Delivered') {
      return res.status(400).json({ message: 'Only delivered items can be returned' });
    }

    if (item.status === 'Returned') {
      return res.status(400).json({ message: 'Item is already returned' });
    }

    item.status = 'Returned';
    item.reasonForReturn = returnReason;
    item.returnDate = new Date();

    // Calculate refund amount
    let refundAmount = item.productPrice * item.quantity;

    // Handle coupon adjustments
    let couponAdjustment = 0;
    if (order.couponAmount > 0) {
      const itemTotalPrice = item.productPrice * item.quantity;
      couponAdjustment = order.couponAmount * (itemTotalPrice / order.billTotal);
      couponAdjustment = Math.min(couponAdjustment, order.couponAmount);
      order.couponAmount = Math.max(0, order.couponAmount - couponAdjustment);
    }

    // Calculate total refund including coupon adjustment
    const totalRefund = refundAmount - couponAdjustment;

    // Update order total
    order.billTotal = Math.max(0, order.billTotal - refundAmount);

    // Process refund to wallet
    let wallet = await Wallet.findOne({ user: order.user });
    
    if (!wallet) {
      wallet = new Wallet({ user: order.user, walletBalance: 0 });
    }
    wallet.walletBalance += totalRefund;
    wallet.transactions.push({
      amount: totalRefund,
      description: `Refund for returned item in order ${order.oId}`,
      type: 'Credit'
    });
    await wallet.save();

    // Update order status
    const remainingActiveItems = order.items.filter(item => item.status !== 'Returned' && item.status !== 'Cancelled');
    if (remainingActiveItems.length === 0) {
      order.orderStatus = 'Returned';
    } else {
      order.orderStatus = 'Partially Returned';
    }

    // Ensure values are not NaN before saving
    if (isNaN(order.couponAmount)) order.couponAmount = 0;
    if (isNaN(order.billTotal)) order.billTotal = 0;

    await order.save();

    res.status(200).json({
      message: 'Item returned successfully',
      refundAmount: totalRefund
    });
  } catch (error) {
    console.error('Error in returnOrder:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const confirmWalletBalance = async (req,res) =>{
  const { totalAmount } = req.query;
  const userId = req.session.userId;

  try {
      const userWallet = await Wallet.findOne({ user: userId });
      if (userWallet && userWallet.walletBalance >= totalAmount) {
          res.json({ success: true });
      } else {
          res.json({ success: false, message: 'Insufficient wallet balance' });
      }
  } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking wallet balance' });
  }
}

const walletPlaceOrder = async (req, res) => {
  const { addressId, paymentMethod, subtotal } = req.body;
  const userId = req.session.user;

  try {
    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart || !cart.product.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const orderId = uuidv4();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const selectedAddress = user.address[addressId];

    const newOrder = new Order({
      orderId,
      user: userId,
      items: cart.product.map((item) => ({
        productId: item.productId._id,
        title: item.productId.title,
        image: item.productId.image,
        productPrice: item.productId.discountPrice > 0 ? item.productId.discountPrice : item.productId.price,
        quantity: item.quantity,
        price: item.productId.discountPrice > 0 ? item.productId.discountPrice * item.quantity : item.productId.price * item.quantity,
        status: "Confirmed",
      })),
      billTotal: parseInt(subtotal),
      shippingAddress: {
        houseName: selectedAddress.houseName,
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        postalCode: selectedAddress.postalCode,
      },
      paymentMethod,
      paymentStatus: "Success",
    });

    await newOrder.save();

    for (const item of newOrder.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product with id ${item.productId} not found`);
      }
      product.stock -= item.quantity;
      await product.save();
    }

    await Cart.findOneAndDelete({ userId });

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }
    wallet.walletBalance -= totalAmount;
    wallet.transactions.push({
      amount: totalAmount,
      description: `Purchased product Order id:${newOrder._id}`,
      type: "Debit",
      transactionDate: new Date(),
    });
    await wallet.save();

    res.status(201).json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).json({ success: false, message: "Error placing order" });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.query;

    const order = await Order.findById(orderId).populate("user");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    generateInvoicePDF(order, res);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

async function generateInvoicePDF(order, res) {
  const doc = new PDFDocument();
  const filename = `invoice_${order._id}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);

  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();

  // Add order details
  doc.fontSize(12).text(`Order Date: ${new Date(order.orderDate).toLocaleString("en-IN")}`);
  doc.text(`Payment Method: ${order.paymentMethod}`);
  doc.text(`Payment Status: ${order.paymentStatus}`);
  doc.text(
    `Shipping Address: ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.country}, ${order.shippingAddress.postalCode}`
  );
  doc.moveDown();

  // Filter only delivered items
  const deliveredItems = order.items.filter(item => item.status === 'Delivered');

  // Create the table data with only delivered items
  const table = {
    headers: ["Product Name", "Quantity", "Price", "Total Price"],
    rows: deliveredItems.map(item => [
      item.name,
      item.quantity,
      `INR ${item.productPrice.toFixed(2)}`,
      `INR ${(item.productPrice * item.quantity).toFixed(2)}`
    ])
  };

  // Draw the table with styling
  doc.table(table, {
    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(12),
    prepareRow: (row, i) => doc.font("Helvetica").fontSize(10),
    width: 500,
    align: "center",
    padding: 5,
    colors: ["#AE2424", "#AE2424", "#AE2424", "#AE2424"],
    borderWidth: 1,
    headerBorderWidth: 1,
    rowEvenBackground: "#AE2424"
  });
   
  doc.moveDown();

  // Calculate total for delivered items
  let deliveredTotal = deliveredItems.reduce((total, item) => total + (item.productPrice * item.quantity), 0);

  // Calculate coupon adjustment
  let couponAdjustment = 0;
  if (order.couponAmount > 0) {
    couponAdjustment = order.couponAmount * (deliveredTotal / order.billTotal);
    couponAdjustment = Math.min(couponAdjustment, order.couponAmount);
  }

  // Calculate final total
  const finalTotal = deliveredTotal - couponAdjustment;

  // Add coupon amount and grand total to invoice
  if (couponAdjustment > 0) {
    doc.text(`Coupon Discount: INR ${couponAdjustment.toFixed(2)}`);
  }
  doc.text(`Grand Total: INR ${finalTotal.toFixed(2)}`);

  doc.end();
}

const retryOrder =async(req,res)=>{
  try{
    const userId = req.session.userData
    const user = await User.findById(userId);
    const {orderId,totalAmount}=req.body;
    

    var options = {
      amount: totalAmount * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: `reciept_${orderId}`,
    };
    razorpayInstance.orders.create(options, function (err, order) {
    
      if (!err) {
        res.status(200).json({
          success: true,
          msg: "Order Created",
          order_id: order.id,
          amount: totalAmount * 100,
          key_id: process.env.RAZORPAY_KEY_ID,
          product_name: "product",
          description: req.body.description,
          contact:  "1234567891",
          name: user.name,
          email: user.email,
        });
      } else {
        console.log("error --->", err);
      }
    });

  }catch(error){
    console.log(error.message)
  }
}

const retryPayment =async(req,res)=>{
  try{
    const {orderId,totalAmount,status}=req.body;
    const order= await Order.findById(orderId);

    order.paymentStatus=status;

    order.save();
    if(order.paymentStatus=="Failed"){
     return res.status(201).json({ success: true, message: "Payment failed retry" }); 
    }
   return res
    .status(201)
    .json({ success: true, message: "Order placed successfully" });

  }catch(error){
    console.log(error.message)
  }
}





module.exports = {
  placeOrder,
  onlinePlaceOrder,
  loadOrderView,
  cancelOrder,
  loadOrder,
  changeOrderStatus,
  loadOrderDetails,
  returnOrder,
  confirmWalletBalance ,
  walletPlaceOrder ,
  downloadInvoice,
  retryOrder,
  retryPayment

};