const Order = require("../models/orderModel")
const User = require("../models/userModel")
const Product = require("../models/productModel")
const Cart = require("../models/cartModel");

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
    const { addressId,  paymentMethod, total} = req.body;
    const selectedAddress = user.address.id(addressId);

    if (!selectedAddress) {
      return res.status(400).json({ success: false, message: "Invalid address selected" });
    }
     
    
  console.log("Received payment method:", paymentMethod);
    if (paymentMethod === "COD") {
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
      res.status(400).json({ success: false, message: "Invalid payment method" });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

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

      res.json({ message: 'Order has been cancelled successfully' });
  } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'An error occurred while cancelling the order' });
  }
};


const loadOrder = async (req,res) =>{
  try {
    const order = await Order.find()
    res.render("order",{order})
  } catch (error) {
    console.log(error.message)
  }
}














module.exports = {
  placeOrder,
  loadOrderView,
  cancelOrder,
  loadOrder 
};