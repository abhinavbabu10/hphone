const User = require('../models/userModel');
const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const Cart = require("../models/cartModel")
const Order = require("../models/orderModel")

const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");


const Email = process.env.Email;
const pass = process.env.Pass;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: Email,
        pass: pass
    }
});



// PASSWORD HASHING//

const securePassword = async (password) => {

    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash

    } catch (error) {
        console.log(error)
    }
}


//LOAD HOME PAGE

const loadhome = async (req, res) => {
    try {

        const users = req.session.userData
        const user = await User.findById(users)
 
         
        res.render('home',{user})
    } catch (error) {
        console.log(error)
    }
}



//LOAD SIGNUP PAGE

const loadsignup = async (req, res) => {
    try {
        const user = req.session.userData
        res.render('signup',{user,message:''})
    } catch (error) {
        console.log(error)
    }
}

//LOAD LOGIN//

const loadlogin = async (req, res) => {
    try {
        // const user = req.session.userData
        res.render('login', {message: "",user:''})
    } catch (error) {
        console.log(error)
    }
}

const logout = async (req,res) =>{
    try{
        req.session.userData = null
        res.redirect('/')

    }catch (error){
        console.log(error)
    }
}


const insertUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
          if (!req.session) {
            throw new Error('Session middleware not initialized');
        }

        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.render('signup',{ user:null,message: 'Email already exists' });
        }

        const otp = generateOTP();
          const userData = {
            name:username,
            email:email,
            password:password,
            otp:otp
        };
       
        req.session.userDetail=userData
       console.log(otp,"otp")

        sendOTPByEmail(email, otp);
        res.redirect('/otp');

        } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send('Error inserting user');
     }
};






function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}



function sendOTPByEmail(userEmail, otp) {
    const mailOptions = {
        from: Email,
        to: userEmail,
        subject: 'OTP Verification',
        text: `Your OTP for verification is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}




//LOAD OTP
const loadotp = async (req, res) => {
    try {
        res.render('otp')
    } catch (error) {
        console.log(error)
    }
}

const loadShop = async (req,res) =>{
    try {

        const user = req.session.userData
        const category = await Category.find({ deleted: false }).sort({createdOn:-1})
        const products = await Product.find({ isUnlisted: false })
        res.render('shop',{category,products,user})
    } catch (error) {
        console.log(error)
    }
}


const verifyOTP = async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        if (parseInt(enteredOTP) === req.session.userDetail.otp) {
            const {name,email,password}=req.session.userDetail;
            const spassword = await securePassword(password);
            const newUser = new User({
                name,
                email,
                password: spassword,
                is_admin:0,
            });

            await newUser.save();
            res.redirect('/login');
        } else {
            res.render('otp', { errorMessage: 'Incorrect OTP' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resendOTP = async (req, res) => {
    try {

         let email = req.session.userDetail.email
        const newOTP = Math.floor(100000 + Math.random() * 900000);
        req.session.userData.otp = newOTP;

        const expirationTime = Date.now() + 60 * 1000;
        req.session.otpExpiration = expirationTime;
        console.log('New OTP:', newOTP);

        sendOTPByEmail(email, newOTP);

        res.status(200).json({ message: 'New OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const verifyLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = req.session.userData;
        const userdata = await User.findOne({ email: email });
        if(userdata.is_admin ===1){
           return res.render('login', { message:"admin" ,user:''});
        }
        if (userdata) {
            const passwordMatch = await bcrypt.compare(password, userdata.password);
            if (passwordMatch) {
                if (userdata.is_verified) {
                    return res.render('login', { message: "user id blocked" ,user:''});
                } else {
                    req.session.userData = userdata.id;
                   return res.redirect('/');
                }
            } else {
                res.render('login', { message: "Email and password are incorrect",user:'' });
            }
        } else {
            res.render('login', { message: "Email and password are incorrect",user:'' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const loadShopdetail = async(req,res) =>{
    try {
        const productId= req.query.id;
        const product = await Product.findById(productId)
        const user = req.session.userData
        console.log(`product : ${product}`)
        res.render('shopdetail',{user,product})
    } catch (error) {
        console.log(error)
    }
}


const loadProfile = async(req,res) =>{

    try {
        const userId = req.session.userData
        const user = await User.findById(userId)
        const product = await Product.find({ isUnlisted: false })
        const order = await Order.find({user:userId})
       res.render('profile',{user,order,product:product})
       
    } catch (error) {
        console.log(error)
    }
}

const editDetail = async (req, res) => {
    try {
        const user = req.session.userData
        const { name, email } = req.body;
        const newUser = await User.findById(user);
        newUser.name = name;
        newUser.email = email;
        if (!newUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        await newUser.save();
        return res.status(200).json({ success: true, newUser });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    };

const resetPassword = async(req,res) => {
    try {
        const userId = req.session.userData;
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(userId); 

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
         if (!isPasswordValid) {
            return res.json({ success: false, message: 'Invalid current password' });
        }

        const spassword = await securePassword(newPassword);
        user.password = spassword;
          await user.save();

        return res.status(200).json({ success: true, message: 'Password reset successful' });
 } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const addAddress = async(req,res) => {
    try {
        const userId = req.session.userData;
        const {houseName, street, city, state, country, postalCode, phoneNumber, addressType } = req.body;
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        const newAddress = {
          houseName,
          street,
          city,
          state,
          country,
          postalCode,
          phoneNumber,
          type: addressType
        };
        user.address.push(newAddress);
        await user.save();
        res.status(200).json({ success: true, message: 'Address added successfully' });
      } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    };
    

const updateAddress = async (req,res) =>{
    try {
        const userId = req.session.userData; 
        const { addressId, houseName, street, city, state, country, postalCode, phoneNumber, addressType } = req.body;
      
        const user = await User.findById(userId);       
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' }); 
        }
      
      
        const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
          return res.status(404).json({ success: false, message: 'Address not found' });
        }
      
        user.address[addressIndex].houseName = houseName;
        user.address[addressIndex].street = street;
        user.address[addressIndex].city = city;
        user.address[addressIndex].state = state;
        user.address[addressIndex].country = country;
        user.address[addressIndex].postalCode = postalCode;
        user.address[addressIndex].phoneNumber = phoneNumber;
        user.address[addressIndex].type = addressType;
      
        await user.save();
      
        res.status(200).json({ success: true, message: 'Address updated successfully' }); 
      } catch (error) {
        console.error('Error updating address:', error); 
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }      

const deleteAddress = async (req,res) =>{
    const user = await User.findById(req.session.userData)
    const addressId = req.query.id;
    const addressIndex = user.address.findIndex(addr => addr._id.toString() === addressId);
  
    if (addressIndex !== -1) {
     user.address.splice(addressIndex, 1);
     await user.save()
      res.json({ success: true, message: 'Address deleted successfully' });
    } else {
      res.json({ success: false, message: 'Address not found' });
    }
  };


  const addtoCart = async (req, res) => {
    try {
      const productId = req.body.productId;
      const userId = req.session.userData;
      let cart = await Cart.findOne({ userId: userId });
      if (!cart) {
        cart = new Cart({ userId: userId });
      }
  
      const productIndex = cart.product.findIndex(
        (item) => item.productId.toString() === productId
      );
  
      if (productIndex === -1) {
        cart.product.push({ productId: productId, quantity: 1 });
      } else {
        // Product is already in the cart
        res.status(200).json({ success: false, error: 'Product already in cart' });
        return;
      }
  
      await cart.save();
  
      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Server Error' });
    }
  };


  const loadCart = async (req,res) =>{
        try {
            const userId = req.session.userData;
            const cart = await Cart.findOne({ userId:userId }).populate('product.productId');
            res.render('cart', { cart,user:userId });
          } catch (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
          }
  };
        

  const updateQuantity = async (req,res) =>{
    const { cartId, productId, quantity } = req.body;

  try {
    const cart = await Cart.findById(cartId);
    const productIndex = cart.product.findIndex(item => item.productId.toString() === productId);

    if (productIndex !== -1) {
      cart.product[productIndex].quantity = quantity;
      await cart.save();

      res.status(200).json({ message: 'Quantity updated successfully',quantity });
    } else {
      res.status(404).json({ error: 'Product not found in cart' });
    }
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Failed to update quantity' });
  }
};

const removeQuantity = async (req, res) => {
    const { cartId, productId } = req.body;

    try {
        const cart = await Cart.findById(cartId);
        const productIndex = cart.product.findIndex(item => item.productId.toString() === productId);

        if (productIndex !== -1) {
            cart.product.splice(productIndex, 1);
            await cart.save();

            res.status(200).json({ message: 'Product removed successfully' });
        } else {
            res.status(404).json({ error: 'Product not found in cart' });
        }
    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({ error: 'Failed to remove product' });
    }
};


const checkOutQuantity= async (req,res) =>{
    try {
        const userId = req.session.userData;
        const cart = await Cart.findOne({ userId: userId }).populate('product.productId');
    
        if (!cart || cart.product.length === 0) {
            return res.status(404).json({ message: 'Cart is empty or not found' });
        }
    
        for (const cartProduct of cart.product) {
            const product = cartProduct.productId;
            const cartQuantity = cartProduct.quantity;
    
            if (cartQuantity > product.stock) {
                cartProduct.quantity = product.stock;
            }
        }
        await cart.save();
        res.status(200).json({ message: 'Cart processed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};



const checkOut = async (req, res) =>{
    try {
        const userId = req.session.userData;
        const user = await User.findById(userId)
        const cart = await Cart.findOne({ userId:userId }).populate('product.productId');
        res.render('checkout', { cart,user });
      } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      }
    };

    const addAddressCheckOut = async (req,res) =>{
        try {
            const userId = req.session.userData;
            const {houseName, street, city, state, country, postalCode, phoneNumber, addressType } = req.body;
            const user = await User.findById(userId);
            if (!user) {
              return res.status(404).json({ success: false, message: 'User not found' });
            }
            const newAddress = {
              houseName,
              street,
              city,
              state,
              country,
              postalCode,
              phoneNumber,
              type: addressType
            };
            user.address.push(newAddress);
            await user.save();
            res.status(200).json({ success: true, message: 'Address added successfully' });
          } catch (error) {
            console.error('Error adding address:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
          }


    }

    const confirmQuantity = async (req, res) => {
        try{
            const userId = req.session.userData;
            const cart = await Cart.findOne({ userId:userId }).populate('product.productId');
    
            for(const item of cart.product){
                const product= await Product.findById(item.productId);
                if(!product){
                    return res.json({success:false,message:"product not found"})
                }
                if (item.quantity <= 0 || item.quantity>product.stock){
                    return res.json({success:false,message:"Quantity is invalid or out of stock"})
                }
    
                
            }
            return res.json({success:true}) 
    
        }catch(error){
            console.log(error.message);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    const forgottenPassword = async (req,res) =>{
        try {
         res.render('forgotpassword')
        } catch (error) {
            console.log(error)
        }

    }
    
    const forgotPassword = async (req, res) => {
     
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ errorMessage: 'User not found' });
            }
    
            const otp = generateOTP();
            req.session.otp = otp
            console.log('og',otp)
            const mailOptions = {
                from: Email,
                to: email,
                subject: 'Your OTP for Password Reset',
                text: `Your OTP for password reset is: ${otp}`
            };
    
            transporter.sendMail(mailOptions, async (error, info) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ errorMessage: 'Error sending OTP. Please try again later.' });
                }
                console.log('Email sent: ' + info.response);

    
                res.json({ successMessage: 'OTP sent to your email address.' });
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errorMessage: 'Server error. Please try again later.' });
        }
    };
    
    const emailChecking = async (req, res) => {
       try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            if (user) {
                res.json({ exists: true });
            } else {
                res.json({ exists: false });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ errorMessage: 'Server error. Please try again later.' });
        }
    };

    const otpVerify = async (req, res) => {
       try {

            const enteredOTP = req.body.otp;
            if (enteredOTP != req.session.otp) {
              return res.status(400).json({ success: false, errorMessage: 'Invalid OTP.' });
          }
            res.json({ success: true, message: 'OTP verified successfully.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errorMessage: 'Server error. Please try again later.' });
        }
    };


    
    const updatePassword = async (req, res) => {
  
        try {
            const {email, newPassword } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ errorMessage: 'User not found' });
            }
            const spassword = await securePassword(newPassword);
    
            user.password = spassword;
            await user.save();
    
            res.json({ successMessage: 'Password updated successfully.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errorMessage: 'Server error. Please try again later.' });
        }
    };
      

module.exports = {
    loadhome,
    loadsignup,
    loadlogin,
    loadotp,
    loadShop,
    insertUser,
    verifyOTP,
    resendOTP,
    verifyLogin,
    loadShopdetail,
    loadProfile,
    editDetail,
    resetPassword,
    forgottenPassword,
    forgotPassword ,
    emailChecking,
    otpVerify,
    updatePassword,
    addAddress,
    updateAddress,
    deleteAddress,
    loadCart,
    addtoCart,
    updateQuantity ,
    removeQuantity ,
    checkOut,
    addAddressCheckOut ,
    checkOutQuantity,
    confirmQuantity,
    logout
}