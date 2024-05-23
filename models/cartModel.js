const mongoose=require("mongoose");
const{Schema}=mongoose;

const cartSchema = mongoose.Schema({
userId: {
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true
 },

product: [{
    productId:{
    type:Schema.Types.ObjectId,
    ref:"Product",
    require:true
},

quantity: {
    type:Number,
    required:true,
    default:1,

} }]

})

module.exports= mongoose.model("Cart",cartSchema);