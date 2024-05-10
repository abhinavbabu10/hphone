const User = require('../models/userModel')


const loadcustomers = async (req, res) => {
    try {
        const users = await User.find({is_admin:false});
        res.render('customer', { users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Internal Server Error');
    }
}

const blockUnblockuser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
         if (!user) {
          return res.status(404).json({ success: false, message: 'User not found.' });
        }
    
        user.is_blocked =!user.is_blocked;
        await user.save();
    
        const users = await User.find();
        res.status(200).json({ success: true, data: users });

      } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }

};


    
module.exports = {
    loadcustomers,
    blockUnblockuser 
  }