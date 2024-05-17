
const isLogin = async(req,res,next) => {
    try{
        if( req.session.userData){
            next();
        }else{
            res.redirect('/login')
        }
    } catch(error){
        console.log(`error checking isLogin`)
    }
  }
  
  const isLogout = async(req,res,next) => {
    try{
        if(req.session.userData){
            res.redirect('/');
        }else{
            next();
        }
  
    }catch(error){
        console.log(`error checking isLogin`)
    }
  }
  module.exports ={
    isLogin,
    isLogout
  }