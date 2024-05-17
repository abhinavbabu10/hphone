const User = require('../models/userModel');
const Category = require("../models/categoryModel")
const Product = require("../models/productModel")

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
        res.render('signup',{user})
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
        const otp = generateOTP();
          const userData = {
            name:username,
            email:email,
            password:password,
            otp:otp
        };
       
        req.session.userData=userData
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
        if (parseInt(enteredOTP) === req.session.userData.otp) {
            const {name,email,password}=req.session.userData;
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
            res.json({ error: 'Incorrect OTP' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resendOTP = async (req, res) => {
    try {

         let email = req.session.userData.email
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
        if (userdata) {
            const passwordMatch = await bcrypt.compare(password, userdata.password);
            if (passwordMatch) {
                if (userdata.is_verified) {
                    res.render('login', { message: "user id blocked" ,user:''});
                } else {
                    req.session.userData = userdata.id;
                    res.redirect('/');
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
        const productId= req.params.id;
        const product = await Product.findById(productId)
        if (!product) {
          return res.status(404).send('Product not found');
        }
        const user = req.session.userData
        res.render('shopdetail',{user,product})
    } catch (error) {
        console.log(error)
    }
}

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
    logout
}