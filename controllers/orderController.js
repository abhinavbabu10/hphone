const Order = require("../models/orderModel")
const User = require("../models/userModel")
const Product = require("../models/productModel")
const Cart = require("../models/cartModel");
const Wallet = require("../models/walletModel")
const Coupon = require("../models/couponModel")
const Razorpay = require("razorpay");
require('dotenv').config();
const moment = require('moment')
const PDFdocument = require('pdfkit')
const PDFDocument = require("pdfkit-table");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const { v4: uuidv4 } = require('uuid');



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userData;

    const cart = await Cart.findOne({ userId }).populate("product.productId");
    if (!cart || !cart.product.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const orderId = uuidv4();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let billTotal = 0;
    for (const item of cart.product) {
      billTotal += item.productId.price * item.quantity;
    }

    const { addressId, paymentMethod, total, couponCode, couponAmount,couponId } = req.body;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }

    console.log("Received payment method:", paymentMethod);

    const createOrderObject = () => ({
      oId: orderId,
      user: userId,
      items: cart.product.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        media: item.productId.media,
        productPrice: item.productId.discountPrice > 0 ? item.productId.discountPrice : item.productId.price,
        quantity: item.quantity,
        price: item.productId.discountPrice > 0 ? item.productId.discountPrice * item.quantity : item.productId.price * item.quantity,
      })),
      billTotal: parseInt(total),
      shippingAddress: {
        houseName: selectedAddress.houseName,
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        postalCode: selectedAddress.postalCode,
      },
      paymentMethod,
      couponCode: couponCode || null,
      couponAmount: couponAmount || 0
    });

    if (paymentMethod === "Razorpay") {
      console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
      console.log("Razorpay Key Secret:", process.env.RAZORPAY_KEY_SECRET);
      console.log("Online payment with Razorpay");

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
          description: `Order payment for Order id:${orderId}`,
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

      // If a coupon was used, add the user to the coupon's usedBy array
      // if (couponCode) {
      //   const coupon = await Coupon.findOne({ couponcode: couponCode });
      //   if (coupon) {
      //     coupon.usedBy.push(userId);
      //     await coupon.save();
      //   }
      // }

      if (couponId) {
        const coupon = await Coupon.findById(couponId);
        if (coupon && !coupon.usedBy.includes(userId)) {
          coupon.usedBy.push(userId);
          await coupon.save();
          newOrder.couponApplied = couponId;
          newOrder.discountAmount = couponAmount;
          await newOrder.save();
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





const onlinePlaceOrder = async(req,res) => {
  try {
    const userId = req.session.userData;
    const cart = await Cart.findOne({ userId }).populate("product.productId");
    
 

    if (!cart || !cart.product.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const orderId = uuidv4();
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { addressId, total, paymentMethod, paymentStatus, subtotal, couponCode, couponAmount } = req.query;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }

    let billTotal = 0;
    for (const item of cart.product) {
      billTotal += item.productId.price * item.quantity;
    }

    const newOrder = new Order({
      oId: orderId,
      user: userId,
      items: cart.product.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        media: item.productId.media,
        productPrice: item.productId.discountPrice > 0 ? item.productId.discountPrice : item.productId.price,
        quantity: item.quantity,
        price: item.productId.discountPrice > 0 ? item.productId.discountPrice * item.quantity : item.productId.price * item.quantity,
      })),
      billTotal: parseInt(total),
      shippingAddress: {
        houseName: selectedAddress.houseName,
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
    });

    await newOrder.save();

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponcode: couponCode });
      if (coupon) {
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
}






const loadOrderView = async (req, res) =>{
 
  try {
    const userId = req.session.userData
    const {id} = req.query
    const user = await User.findById(userId)
    const product = await Product.find({ isUnlisted: false })
    const order = await Order.findById(id)
   res.render('orderview',{user,order,product:product})
   
} catch (error) {
    console.log(error)
}
}


const cancelOrder = async (req, res) => {
  const { orderId, itemId, cancellationReason } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: 'Item not found in order' });
    }

    item.status = 'Cancelled';
    item.cancellationReason = cancellationReason;
    item.cancellationDate = new Date();

    const product = await Product.findById(item.productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }

    const allItemsCancelled = order.items.every(item => item.status === 'Cancelled');
    if (allItemsCancelled) {
      order.orderStatus = 'Cancelled';
      order.cancellationReason = cancellationReason;
    }

    // Calculate the refund amount considering the coupon discount
    const itemTotal = item.quantity * item.price;
    const orderTotal = order.billTotal;
    const orderSubtotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountRatio = orderTotal / orderSubtotal;
    const refundAmount = itemTotal * discountRatio;

    await order.save();

    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({
        user: order.user,
        walletBalance: 0,
        amountSpent: 0,
        transactions: []
      });
    }

    wallet.walletBalance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      description: `Refund for cancelled item from order ${orderId} (Including coupon discount)`,
      type: 'Refund',
      transactionDate: new Date()
    });

    await wallet.save();

    // If all items are cancelled, remove the user from the coupon's usedBy array
    if (allItemsCancelled && order.couponCode) {
      const coupon = await Coupon.findOne({ couponcode: order.couponCode });
      if (coupon) {
        coupon.usedBy = coupon.usedBy.filter(userId => !userId.equals(order.user));
        await coupon.save();
      }
    }

    res.json({ message: 'Order has been cancelled and amount refunded successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'An error occurred while cancelling the order' });
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


const changeOrderStatus = async (req,res) =>{
  try {
    const { orderId, orderStatus } = req.body;
   console.log(orderStatus);
    
    const order = await Order.findById(orderId);

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }
    order.orderStatus = orderStatus;

  
    if (orderStatus === "Shipped") {
        order.items.forEach(item => {
            item.status = "Shipped";
        });
    }

    if (orderStatus === "Delivered") {
        order.items.forEach(item => {
            item.status = "Delivered";
        });
        if(order.paymentMethod==="COD"){
            order.paymentStatus="Success"
        }

    }
    await order.save();

    res.status(200).json({ message: 'Order status updated successfully', order });
} catch (error) {
    console.error(error);
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

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found in order' });
    }

    // Calculate the refund amount considering the coupon discount
    const itemTotal = item.quantity * item.price;
    const orderTotal = order.billTotal;
    const orderSubtotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountRatio = orderTotal / orderSubtotal;
    const refundAmount = itemTotal * discountRatio;

    item.status = 'Returned';
    item.reasonForReturn = returnReason;
    item.returnDate = new Date();

    const allItemsReturned = order.items.every((item) => item.status === 'Returned');
    if (allItemsReturned) {
      order.orderStatus = 'Returned';
    }

    await order.save();

    // Update product stock
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }

    // Process refund to wallet
    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({ user: order.user });
    }

    wallet.walletBalance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      description: `Refund for returned item from order ${orderId} (Including coupon discount)`,
      type: 'Credit',
    });

    await wallet.save();

    // If all items are returned, remove the user from the coupon's usedBy array
    if (allItemsReturned && order.couponCode) {
      const coupon = await Coupon.findOne({ couponcode: order.couponCode });
      if (coupon) {
        coupon.usedBy = coupon.usedBy.filter(userId => !userId.equals(order.user));
        await coupon.save();
      }
    }

    res.status(200).json({ message: 'Order returned and amount refunded to wallet successfully' });
  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ message: 'An error occurred while returning the order' });
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

const downloadInvoice = async (req, res) =>{
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

  // Create the table data
  const table = {
    headers: ["Product Name", "Quantity", "Price", "Total Price"],
    rows: order.items.map(item => [
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
    width: 500, // Width of the table
    align: "center", // Align text within columns to center
    padding: 5, // Padding for each cell
    colors: ["#AE2424", "#AE2424", "#AE2424", "#AE2424"], // Color of text in each column
    borderWidth: 1, // Border width
    headerBorderWidth: 1, // Header border width
    rowEvenBackground: "#AE2424" // Background color for even rows
  });
   
  doc.moveDown();

  // Add total amount and coupon
  if (order.couponAmount > 0) {
    doc.text(`Coupon Amount: INR ${order.couponAmount.toFixed(2)}`);
  }
  doc.text(`Grand Total: INR ${order.billTotal.toFixed(2)}`);

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