const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");






// PASSWORD HASHING//

const securePassword = async(password)=>{

    try{

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash

    }catch(error){
        console.log(error)
    }
}



//LOAD HOME PAGE

const loadhome = async(req,res)=>{
    try {
        res.render('home')
    } catch (error) {
        console.log(error)
    }
}

//LOAD SIGNUP PAGE

const loadsignup = async(req,res)=>{
    try{
        res.render('signup')
    }catch(error){
        console.log(error)
    }
}

//LOAD LOGIN//

const loadlogin = async(req,res)=>{
    try{
        res.render('login')
    }catch(error){
        console.log(error)
    }
}


const verifyLogin = async(req,res)=>{

    try{

        const email = req.body.email;
        const password= req.body.password;

const userData = await User.findOne({email:email});

if(userData){

const passwordMatch  = bcrypt.compare(password,userData.password)
if(passwordMatch){
    if(userData.is_verified === 0){
        res.render('login',{message:"Please verify your mail"})

    }else{
        req.session.user_id = userData._id
       res.redirect('/home');
    }

}
else{

    res.render('login',{message:"Email and password is incorrect"})
}


}

else{
    res.render('login',{message:"Email and password is incorrect"})
}

    }catch(error){
        console.log(error)
    }
}


//Insert User send otp


const insertUser = async(req,res)=>{
    try{
        const spassword = await securePassword(req.body.password);

        const user = new User({
            name:req.body.name,
            email:req.body.email,
            password:req.body.password,
            is_admin:0,

        })

        new User
        .save()
        .then((result)=>{
            sendOTPVerificationEmail(result,res)
        })


    
    }catch(error){
        console.log(error)
    }
}




//LOAD OTP


const loadotp = async(req,res)=>{
    try{
        res.render('otp')
    }catch(error){
        console.log(error)
    }
}




// for send mail

const sendVerifyMail = async(name,email,user_id)=>{

     try{
        
       const transporter =  nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                 user:'abhinavbabu336@gmail.com',
                 pass:''
            }

        })
     } catch (error){
        console.log(error)
     }

}



// send otp verification email

const sendOTPVerificationEmail = async (req,res)=>{
    try{
        const otp = `${1000 + Math.random() *9000}`;

      //mail options
      const mailOptions = {
        from:"abhinavbabu336@gmail.com",
        to:email,
        subject:"Verify Your Email",
        html:`<p>Enter<b>${otp}</b> in the app to verify your email and complete the signup<p>
        <p>This code <b>expires in 1 hour</b>.</p>`
      };

      //hash the otp

      const saltRounds = 10;

      const hashedOTP = await bcrypt.hash(otp,saltRounds);
      const newOTPVerification = await new userOTPVerification({
        userId: __dirname,
        otp: hashedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,

      })

      //save otp record

      await newOTPVerification.save();
      await transporter.sendMail(mailOptions);

      res.json({
        status:"PENDING",
        message:"Verification otp email sent",
        data: {
            userId: _id,
            email,
        }
      })

    }catch(error){
     
        res.json({
            status:"FAILED",
            message: error.message,

        })
    }
}

//verify otp email

const verifyOTP = async (req, res) => {
    try{
        let{userId,otp} = req.body;
        if(!userId || !otp){
            throw Error("Empty otp details are not allowed")
        } else{
         const userOPTVerificationRecords = await   userOPTVerification.find({
             userId,
            });
            if(userOPTVerificationRecords.length<=0) {
                throw new Error(
                    "Account record doesnt exist or has been verified already . please sign up or login"
                )
         
                
            } else{
                const {expiresAt} = userOPTVerificationRecords[0];
               
                const hashedOTP = userOPTVerificationRecords[0].otp;

                if(expiresAt < Date.now()){

                    await userOPTVerificationRecords.deleteMany({userId});
                    throw new Error("code has expired.Please request again")
                }else{
                    const validOTP = await bcrypt.compare(otp,hashedOTP)

                    if(!validOTP){
                        throw new Error("Invalid code passed.check your inbox")
                    }else{
                       await User.updateOne({_id: userId},{verified:true})
                       await userOPTVerification.deleteMany({userId});
                       res.json({
                        status:"VERIFIED",
                        message: `User email verified succesfully`
                       })
                    }
                }
            }
        }
    }catch(error){
        res.json({
            status:"FAILED",
            message:error.message
        })

}
}

//resend verification

const resendOTPVerificationCode = async (req, res) => {
    try{
        let{userId,email} = req.body;
        if(!userId || email){
            throw Error ("Empty user details are not allowed")
        }else{
            await userOPTVerification.deleteMany({userId})
            sendOTPVerificationEmail({_id:userId,email},res);
        }
    } catch(error){
       
        res.json({
            status: "FAILED"
        })
    }
}

module.exports = {
    loadhome,
    loadsignup,
    loadlogin,
    loadotp,
    verifyLogin,
    insertUser,
    sendVerifyMail,
    verifyOTP,
    resendOTPVerificationCode
}