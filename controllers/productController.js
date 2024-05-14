const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/Productimages');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage }).array('media', 10);



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
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.log('Multer error:', err);
        res.status(500).send('Error uploading images');
        return;
      } else if (err) {
        console.log('Unknown error:', err);
        res.status(500).send('Unknown error occurred');
        return;
      }

      if (!req.files || req.files.length === 0) {
        res.status(400).send('No images uploaded');
        return;
      }

      const processedImages = req.files.map((file) => {
        const filename = `${Date.now()}-${file.originalname}`;
        const imagePath = path.join(__dirname, '..', 'public', 'Productimages', filename);
        fs.copyFileSync(file.path, imagePath);

        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.log('Error deleting file:', unlinkError.message);
        }

        return filename;
      });

      const { name, description, price, category, stock } = req.body;
      const newProduct = new Product({
        name,
        description,
        media: processedImages,
        price,
        category,
        stock,
        createdOn: Date.now(),
      });

      newProduct.save()
      res.redirect('/admin/product')

    });
  } catch (error) {
    console.log('Error adding product:', error);
    res.status(500).send('Error adding product');
    res.render('pagenotfound');
  }
};


const uploadForEditProduct = multer({
  storage: storage
}).array('newImages', 5);


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

const updateProduct = async (req, res) => {
  try {
    uploadForEditProduct(req, res, async function (err) {
      if (err) {
        console.error(err);
        return res.status(400).send('File upload error.');
      }

      const productId = req.params.id;
      const { name, description, price, category, stock, isUnlisted, deleteImages } = req.body;

      const updatedProductData = {
        name,
        description,
        price,
        category,
        stock,
        isUnlisted
      };
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).send('Product not found.');
      }
      if (deleteImages && deleteImages.length > 0) {
        deleteImages.forEach(filename => {
          const index = product.media.indexOf(filename);
          if (index !== -1) {
            product.media.splice(index, 1);
            const imagePath = path.join(__dirname, '..', 'public', 'productimages', filename);
            fs.unlink(imagePath, (err) => {
              if (err) {
                console.error(`Error deleting file: ${filename}`, err);
              }
            });
          }
        });
        await product.save();
      }


      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.filename);
        updatedProductData.media = [...product.media, ...newImages];
      } else {
        updatedProductData.media = product.media;
      }
      const updatedProduct = await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

      if (!updatedProduct) {
        return res.status(404).send('Product not found.');
      }

      res.redirect('/admin/product');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
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













module.exports = {
  loadProduct,
  loadAddProduct,
  addProduct,
  editProduct,
  updateProduct,
  deleteProduct
}