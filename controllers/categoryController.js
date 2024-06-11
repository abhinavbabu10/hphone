const Category = require("../models/categoryModel")


const loadCategory = async (req, res) => {
  try {
    const category = await Category.find({ deleted: false }).sort({createdOn:-1})

    res.render("category", { message: "", category: category })
  } catch (error) {
    console.log(error.message)
  }
}



const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmedName = name.trim();
    const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();
    const category = await Category.find({ deleted: false }).sort({ createdOn: -1 });

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${formattedName}$`, 'i') },
      deleted: false
    });

    if (existingCategory) {
      return res.render("category", { message: 'Category already exists', category });
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
    const { name, status } = req.body;
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, status },
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(200).json(updatedCategory);
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