const User = require('../models/userModel')


const loadcustomers = async (req, res) => {
    try {
        const users = await User.find();
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
      user.verified = !user.verified;
      await user.save();
      res.json({ success: true });
  } catch (err) {
      res.status(500).json({ success: false, message: err.message });
  }
};


    
module.exports = {
    loadcustomers,
    blockUnblockuser 
  }