const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponname: {
        type: String,
        required: true,
    },
    couponcode: {
        type: String,
        required: true,
    },
    discountpercentage: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    minimumamount: {
        type: Number,
        required: true
    },
    maximumDiscountAmount: {
        type: Number,
        required: true
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
    }]
},
{
    timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);

