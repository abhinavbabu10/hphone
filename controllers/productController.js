const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const sharp = require('sharp')
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/Productimages");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage }).array("media", 10);


const loadProduct = async (req, res) => {
  try {
    const products = await Product.find({ isUnlisted: false })
    res.render("product", { products: products })

  } catch (error) {
    console.log(error.message)
  }
}


const loadAddProduct = async (req, res) => {
  try {
    const category = await Category.find({ deleted: false })
    res.render("addnewproduct", { category: category })

  } catch (error) {
    console.log(error.message)
  }
}


const addProduct = async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        console.log("Multer error:", err);
        res.status(500).send("Error uploading images");
        return;
      } else if (err) {
        console.log("Unknown error:", err);
        res.status(500).send("Unknown error occurred");
        return;
      }

      if (!req.files || req.files.length === 0) {
        res.status(400).send("No images uploaded");
        return;
      }

      const processedImages = [];
      for (const file of req.files) {
        const imageBuffer = await sharp(file.path)
          .resize(1500, 750)
          .toBuffer();

        const filename = `cropped_${Date.now()}-${file.originalname}`;
        const imagePath = path.join(__dirname, "..", "public", "Productimages", filename);

        fs.writeFileSync(imagePath, imageBuffer);
        processedImages.push(filename);
      }

      const { name, description, price, category, stock } = req.body;
      const newProduct = new Product({
        name,
        description,
        media: processedImages,
        price,
        category,
        stock
      });

      await newProduct.save();
      res.redirect("/admin/product");
    });

  } catch (error) {
    if (err.name === 'ValidationError') {
      console.log("Validation Error:", err.message);
      res.status(400).send(`Validation Error: ${err.message}`);
    } else {
      console.log("Error adding product:", err);
      res.status(500).send("Error adding product");
  }
};

}

let editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    const category = await Category.find({ deleted: false });

    res.render('editproduct', { product, category });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

const newupload = multer({ storage: storage }).array("media", 10);

const updateProduct = async (req, res) => {
  try {
    newupload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        console.log("Multer error:", err);
        res.status(500).send("Error uploading images");
        return;
      } else if (err) {
        console.log("Unknown error:", err);
        res.status(500).send("Unknown error occurred");
        return;
      }

      const processedImages = [];
      for (const file of req.files) {
        const imageBuffer = await sharp(file.path)
          .resize(1200,1200)
          .toBuffer();

        const filename = `cropped_${Date.now()}-${file.originalname}`;
        const imagePath = path.join(__dirname, "..", "public", "Productimages", filename);

        fs.writeFileSync(imagePath, imageBuffer);

        processedImages.push(filename);
      }

      const productId = req.params.id;
      const { name, description, price, category, stock } = req.body;
      
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).send(`Product not found with ID ${productId}`);
        return;
      }
      product.name = name;
      product.description = description;
      product.price = price;
      product.category = category;
      product.stock = stock;
      product.media = product.media.concat(processedImages);

      await product.save();

      res.redirect("/admin/product");
    });

  } catch (error) {
    console.error(error);
    res.status(500).send(`Error updating product: ${error.message}`);
  }
};


const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isUnlisted: true },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const removeImage = async(req,res) =>{
  const { id } = req.params;
  const { imageId, index } = req.body;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.media.splice(index, 1);
    await product.save();

    res.json({ message: 'Image removed successfully', product });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};













module.exports = {
  loadProduct,
  loadAddProduct,
  addProduct,
  editProduct,
  updateProduct,
  deleteProduct,
  removeImage 
}