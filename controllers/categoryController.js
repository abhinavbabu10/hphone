const Category = require("../models/categoryModel")
const Product = require("../models/productModel")


const loadCategory = async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
      const category = await Category.find({ deleted: false }).sort({ createdOn: -1 }).skip(skip).limit(limit);
      const totalCategories = await Category.countDocuments({ deleted: false });
      const totalPages = Math.ceil(totalCategories / limit);

      res.render("category", { message: "", category, totalPages, currentPage: page });
  } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
  }
};



const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmedName = name.trim();
    const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();


    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${formattedName}$`, 'i') },
      deleted: false
    });

    if (existingCategory) {
      const page = parseInt(req.query.page) || 1; 
      const limit = 10; 
      const skip = (page - 1) * limit;

        const category = await Category.find({ deleted: false }).sort({ createdOn: -1 }).skip(skip).limit();
      const totalCategories = await Category.countDocuments();
      const totalPages = Math.ceil(totalCategories / limit);
     return res.render("category", { message: 'Category already exists', category, totalPages, currentPage: page });
    } else {
      const newCategory = new Category({
        name: formattedName,
        createdOn: new Date(),
      });

      await newCategory.save();
      res.redirect("/admin/category");
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the category' });
  }
};



const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, discount } = req.body;
    const trimmedName = name.trim();
    const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();

    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'invalid_name', message: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ name: formattedName });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res.status(400).json({ success: false, error: 'category_exists', message: 'Category already exists' });
    }

    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name: formattedName, status, discount },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (discount) {
      const products = await Product.find({ category: updatedCategory.name });
      for (const product of products) {
        const discountPrice = parseInt(product.price - (product.price * (discount / 100)));
        await Product.findByIdAndUpdate(product._id, { discountPrice });
      }
    }

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const confirmDelete = async (req, res) => {

  try {
    const categoryId = req.params.id;
    const deletedCategory = await Category.findByIdAndUpdate(categoryId,{ deleted: true });

    await deletedCategory.save()


    if (!deletedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'An error occurred while deleting the category' });
  }
};




module.exports = {
  loadCategory,
  addCategory,
  editCategory,
  confirmDelete
}