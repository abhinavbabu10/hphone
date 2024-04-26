const User = require('../models/userModel')
const bcrypt = require('bcrypt')


const loadAdminLogin = async (req, res) => {
    try {
        res.render('adminlogin')
    } catch (error) {
        console.log(error)
    }
}

const verifyAdmin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;
        console.log(req.body.email, "verify");
        console.log(req.body.password, "verifyvdfjksd");

        const userdata = await User.findOne({ email: email });
        if (userdata) {
            const passwordMatch = await bcrypt.compare(password, userdata.password);
            if (passwordMatch) {
                if (userdata.is_admin=== 0) {
                    res.render('adminlogin', { message: "Email and password are incorrect" });
                } else {
                    req.session.userData = userdata.id;
                    res.redirect('/admin/admindash');
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
      
        res.render('admindash')
    }catch (error){
        console.log(error)
    }
}



const userslist = async (req, res) => {
    try{
    const limit = 10; 
    const page = req.query.page
    console.log(page,"koo")
    const pageNumber = page? parseInt(page):1
    console.log(pageNumber,"lol")
     let skip = (pageNumber - 1) * limit
    const users = await User.find({}).skip(skip).limit(limit)
     let pageLimit=Math.ceil(users.length/limit)
    res.render('userlist', { users: users,page,pageLimit });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
};







module.exports = {
  loadAdminLogin,
  loadDashboard,
  verifyAdmin,
  userslist
}