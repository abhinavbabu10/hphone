const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    product: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            requried: true,
        }
    }]
}, {
    timestamps: true
})



module.exports = mongoose.model('Wishlist', wishlistSchema)