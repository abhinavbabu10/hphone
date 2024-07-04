const router = require('express').Router();
require('../config/passport-setup')
const passport= require('passport')
 

router.use(passport.initialize())

router.use(passport.session())



router.get('/login',(req,res)=>{
    res.render('login')
})


router.get('/logout',(req,res)=>{
    req.logout(()=>{
        res.redirect('/')
    })
    
})


// auth with google

// router.get('/google',(req,res,next)=>{
//   console.log("Oi")
//   next()
// }, passport.authenticate('google',{
//        scope: ['profile','email'],
// }))

router.get('/google',passport.authenticate('google',{scope:['email','profile']}))





// router.get("/google/redirect",(req,res,next)=>{
//   console.log("ki")
//   next()
// },passport.authenticate("google"),(req,res)=>{
//   res.redirect("/shop")
// })


// router.get('/google/redirect',  passport.authenticate('google'), (req,res)=>{
//     res.send(req.user)
//     res.redirect('/')
// })

router.get('/google/redirect', passport.authenticate('google', { 
  
  successRedirect:'/success',
  failureRedirect: '/login' }), async (req, res, next) => {
    try {
     
      if ( req.user.is_verified === 1) {
        
        return res.redirect('/');
      } else {
        
        console.log('User is not verified');
        return res.redirect('/login');
      }
    } catch (err) {
     
      next(err);
    }
  });

module.exports = router;