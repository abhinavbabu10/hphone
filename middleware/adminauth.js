const isAdminLogin = async(req, res, next) => {
    try {
        if (req.session && req.session.adminData) {
            next();
        } else {
            res.redirect('/admin/');
        }
    } catch (error) {
        console.log('Error checking isAdminLogin:', error);
    }
}

const isAdminLogout = async(req, res, next) => {
    try{
        if (req.session && req.session.adminData) {
            res.redirect('/admin/home');
        }else{
            next();
        }
  
    }catch(error){
        console.log(`error checking isLogin`)
    }
  }
module.exports = {
    isAdminLogin,
    isAdminLogout
}
