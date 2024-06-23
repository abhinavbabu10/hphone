const User = require('../models/userModel')
const bcrypt = require('bcrypt')


const loadAdminLogin = async (req, res) => {
    try {
        res.render('adminlogin',{message: ""})
    } catch (error) {
        console.log(error)
    }
}

const verifyAdmin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userdata = await User.findOne({ email: email });
        if (userdata) {
            const passwordMatch = await bcrypt.compare(password, userdata.password);
            if (passwordMatch) {
                if (userdata.is_admin=== 0) {
                    res.render('adminlogin', { message: "Email and password are incorrect" });
                } else {
                    req.session.adminData = userdata.id;
                    res.redirect('/admin/home');
                }
            } else {
                res.render('adminlogin', { message: "Email and password are incorrect" });
            }
        } else {
            res.render('adminlogin', { message: "Email and password are incorrect" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const loadDashboard = async(req,res)=>{
    try{
      
        res.render('home')
    }catch (error){
        console.log(error)
    }
}


const adminlogout = async(req,res)=>{
    try{
    req.session.adminData=null
    res.redirect('/admin/')
  }catch (error){
      console.log(error)
}

};







module.exports = {
  loadAdminLogin,
  loadDashboard,
  verifyAdmin,
  adminlogout
}