const Order = require("../models/orderModel")
const User = require("../models/userModel")
const Product = require("../models/productModel")
const Cart = require("../models/cartModel");
const Wallet = require("../models/walletModel")
const Razorpay = require("razorpay");
require('dotenv').config();

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

    const { addressId, paymentMethod, total } = req.body;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }

    console.log("Received payment method:", paymentMethod);

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
    } else if (paymentMethod === "COD") {
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
        paymentMethod
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

      res.status(201).json({ success: true, message: "Order placed successfully" });
    } else if (paymentMethod === "Wallet") {
      const userWallet = await Wallet.findOne({ user: userId });
      if (userWallet && userWallet.walletBalance >= total) {
        userWallet.walletBalance -= total;
        userWallet.amountSpent += total;
        userWallet.transactions.push({
          amount: total,
          description: `Order payment for Order id:${orderId}`,
          type: 'debit'
        });
        await userWallet.save();

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
          paymentMethod
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

        res.status(201).json({ success: true, message: "Order placed successfully" });
      } else {
        res.status(400).json({ success: false, message: "Insufficient wallet balance" });
      }
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

    const { addressId, total, paymentMethod, paymentStatus, subtotal } = req.query;
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
      paymentStatus,
    });

    await newOrder.save();

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

      const refundAmount = item.quantity * item.price;
      wallet.walletBalance += refundAmount;
      wallet.transactions.push({
          amount: refundAmount,
          description: `Refund for cancelled order ${orderId}`,
          type: 'Refund',
          transactionDate: new Date()
      });

      await wallet.save();

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
    
    const orders = await Order.find({}).populate('user').skip(skip).limit(perPage);
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

const loadOrderDetails = async(req,res) =>{
  try{
    const orderId=req.query.id;
    const order= await Order.findById(orderId);
    const userId = req.session.userData
    const user = await User.findById(userId)
    res.render("orderdetails",{order,user})

}catch(error){
    console.log(error.message)
}

}


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

    const refundAmount = item.productPrice * item.quantity; 
    item.status = 'Returned';
    item.reasonForReturn = returnReason;
    item.returnDate = new Date();

    const allItemsReturned = order.items.every((item) => item.status === 'Returned');
    if (allItemsReturned) {
      order.orderStatus = 'Returned';
    }

    await order.save();

   
    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({ user: order.user });
    }

    wallet.walletBalance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      description: `Refund for returned item from order ${orderId}`,
      type: 'Credit',
    });

    await wallet.save();

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
  walletPlaceOrder 

};