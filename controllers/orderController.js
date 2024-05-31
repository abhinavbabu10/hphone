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
    const page = parseInt(req.query.page) || 1;
    const perPage=10;

    const totalOrderCount= await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrderCount / perPage);

    const skip = (page - 1) * perPage;
    
    const orders = await Order.find({}).populate('user').skip(skip).limit(perPage);
    res.render("order", { orders,currentPage: page, totalPages   });
} catch (error) {
    console.log(error.message);
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

const returnOrder = async(req,res) =>{
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

    item.status = 'Returned';
    item.reasonForReturn = returnReason;
    item.returnDate = new Date();

    await order.save();

    res.status(200).json({ message: 'Order returned successfully' });
} catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ message: 'An error occurred while returning the order' });
}

}











module.exports = {
  placeOrder,
  loadOrderView,
  cancelOrder,
  loadOrder,
  changeOrderStatus,
  loadOrderDetails,
  returnOrder
};