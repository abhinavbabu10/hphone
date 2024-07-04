const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const keys = require('./key')
const User = require('../models/userModel');
require('dotenv').config()

// function to generate Referralcode
function generateReferralCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode = '';

    for (let i = 0; i < length; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return referralCode;
}

passport.serializeUser((user,done)=>{
    done(null,user.id)
})


passport.deserializeUser((id,done)=>{
    User.findById(id).then((user)=>{
        done(null,user)
    })
    
})

passport.use(
    new GoogleStrategy({

    callbackURL:process.env.CALLBACK_URL,
    clientID: process.env.CLIENT_ID ,
    clientSecret: process.env.CLIENT_SECRET ,
   
  }, (accessToken, refreshToken, profile,done) =>{

    const referralCode = generateReferralCode(8);
    console.log("alert",referralCode)

     console.log('passport callback function fired')
     console.log(profile)


     User.findOne({ email: profile.emails[0].value }).then((currentUser) => {
                if (currentUser) {
                    console.log('user is ',currentUser);
                    done(null,currentUser)

                }
                else {
                    new User({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        is_admin: 0,
                        is_verified: false,
                        referralCode: referralCode
        
                    }).save().then((newUser) => {
                        console.log('new user created:' + newUser);
                        done(null,newUser)
                    }).catch((err) => {
                        done(err,null);
                    });
                }
        
            }).catch((err) => {
                done(err,null);
            })
        
        })
)

module.exports = passport;