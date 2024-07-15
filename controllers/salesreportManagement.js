const moment = require('moment')
const PDFdocument = require('pdfkit')
const Order = require("../models/orderModel")
const PDFDocument = require("pdfkit-table");



const loadSales = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    let deliveredOrders = await Order.find({ 
      orderStatus: { $in: ["Delivered", "Partially Delivered"] }
    })
      .populate("user")
      .populate("items.productId")
      .skip(skip)
      .limit(limit);

    // Filter out cancelled items and add cancelledItemsCount
    deliveredOrders = deliveredOrders.map(order => {
      const deliveredItems = order.items.filter(item => item.status === "Delivered");
      const cancelledItemsCount = order.items.filter(item => item.status === "Cancelled").length;
      return {
        ...order.toObject(),
        items: deliveredItems,
        cancelledItemsCount: cancelledItemsCount
      };
    });

    const totalSalesCount = await Order.countDocuments({ 
      orderStatus: { $in: ["Delivered", "Partially Delivered"] }
    });

    const totalDiscountAmount = deliveredOrders.reduce((acc, order) => {
      const deliveredItemsCount = order.items.length;
      const totalItemsCount = deliveredItemsCount + order.cancelledItemsCount;
      const discountRatio = deliveredItemsCount / totalItemsCount;
      return acc + ((order.couponAmount || 0) * discountRatio);
    }, 0);

    const totalSalesAmount = deliveredOrders.reduce((acc, order) => 
      acc + order.items.reduce((itemAcc, item) => itemAcc + (item.productPrice * item.quantity), 0), 0
    );

    const totalPages = Math.ceil(totalSalesCount / limit);

    res.render("salesreport", {
      orders: deliveredOrders,
      totalSalesCount: totalSalesCount,
      totalDiscountAmount: parseFloat(totalDiscountAmount.toFixed(2)) || 0,
      totalSalesAmount: parseFloat(totalSalesAmount.toFixed(2)) || 0,
      totalPages: totalPages,
      currentPage: page
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};


const filterOrders = async (req, res) => {
  const { filter, startDate, endDate, page = 1, limit = 10 } = req.body;
  const skip = (page - 1) * limit;
  let orders, totalFilteredCount;
  try {
    let query = { 
      orderStatus: { $in: ["Delivered", "Partially Delivered"] }
    };

    if (filter === 'daily') {
      query.orderDate = { $gte: new Date().setHours(0, 0, 0, 0) };
    } else if (filter === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query.orderDate = { $gte: oneWeekAgo };
    } else if (filter === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      query.orderDate = { $gte: oneMonthAgo };
    } else if (filter === 'yearly') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      query.orderDate = { $gte: oneYearAgo };
    } else if (filter === 'custom') {
      query.orderDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      return res.status(400).json({ error: 'Invalid filter type' });
    }

    orders = await Order.find(query)
      .populate('user')
      .populate('items.productId')
      .skip(skip)
      .limit(limit);

    // Filter out cancelled items from each order
    orders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.status !== "Cancelled")
    }));

    totalFilteredCount = await Order.countDocuments(query);

    res.json({
      orders,
      totalFilteredCount,
      totalPages: Math.ceil(totalFilteredCount / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching orders' });
  }
};

const pdfDownload = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.body;
    console.log('Received filter parameters:', req.body);

    let query = { 
      orderStatus: { $in: ["Delivered", "Partially Delivered"] }
    };

    switch (filter) {
      case 'daily':
        query.orderDate = {
          $gte: moment().startOf('day').toDate(),
          $lte: moment().endOf('day').toDate()
        };
        break;
      case 'weekly':
        query.orderDate = {
          $gte: moment().startOf('week').toDate(),
          $lte: moment().endOf('week').toDate()
        };
        break;
      case 'monthly':
        query.orderDate = {
          $gte: moment().startOf('month').toDate(),
          $lte: moment().endOf('month').toDate()
        };
        break;
      case 'yearly':
        query.orderDate = {
          $gte: moment().startOf('year').toDate(),
          $lte: moment().endOf('year').toDate()
        };
        break;
      case 'custom':
        if (startDate && endDate) {
          query.orderDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        } else {
          return res.status(400).send("Start date and end date are required for custom filter");
        }
        break;
      default:
        return res.status(400).send("Invalid filter type");
    }

    let orders = await Order.find(query)
      .populate('user')
      .populate('items.productId');

    // Filter out cancelled items from each order
    orders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.status === "Delivered"),
      cancelledItemsCount: order.items.filter(item => item.status === "Cancelled").length
    }));

    const totalSalesCount = orders.reduce((acc, order) => acc + order.items.length, 0);
    const totalDiscountAmount = orders.reduce((acc, order) => {
      const deliveredItemsCount = order.items.length;
      const totalItemsCount = order.items.length + order.cancelledItemsCount;
      const discountRatio = deliveredItemsCount / totalItemsCount;
      return acc + ((order.couponAmount || 0) * discountRatio);
    }, 0);
    const totalSalesAmount = orders.reduce((acc, order) => 
      acc + order.items.reduce((itemAcc, item) => itemAcc + (item.productPrice * item.quantity), 0), 0
    );

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=sales_report.pdf',
        'Content-Length': pdfData.length
      });
      res.end(pdfData);
    });

    doc.fontSize(16).text('Sales Report (Delivered Items Only)', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Total Delivered Items Count: ${totalSalesCount}`);
    doc.text(`Total Discount Amount: INR ${totalDiscountAmount.toFixed(2)}`);
    doc.text(`Total Sales Amount: INR ${totalSalesAmount.toFixed(2)}`);
    doc.moveDown();

    const tableData = {
      headers: ['Order Date', 'Customer Name', 'Total Amount', 'Discount', 'Delivered Products'],
      rows: orders.map(order => {
        const orderTotal = order.items.reduce((acc, item) => acc + (item.productPrice * item.quantity), 0);
        const deliveredItemsCount = order.items.length;
        const totalItemsCount = order.items.length + order.cancelledItemsCount;
        const discountRatio = deliveredItemsCount / totalItemsCount;
        const orderDiscount = (order.couponAmount || 0) * discountRatio;
        
        return [
          moment(order.orderDate).format('YYYY-MM-DD'),
          order.user.name,
          `INR ${orderTotal.toFixed(2)}`,
          `INR ${orderDiscount.toFixed(2)}`,
          order.items.map(item => item.productId.name).join(', ')
        ];
      })
    };

    doc.table(tableData, {
      prepareHeader: () => doc.fontSize(12).font('Helvetica-Bold'),
      prepareRow: (row, i) => doc.fontSize(10).font('Helvetica')
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
};




module.exports = {
    loadSales,
    filterOrders,
    pdfDownload
  }