const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { formatCurrency, formatDate, sanitizeFilename } = require('../utils/helpers');
const logger = require('../utils/logger');

const EXPORT_DIR = path.join(__dirname, '../../public/exports');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

class ExcelService {
  // Export products to Excel
  async exportProducts(products, filename = null) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Products');
      
      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Nama Produk', key: 'name', width: 40 },
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Harga', key: 'price', width: 15 },
        { header: 'Stok', key: 'stock', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Shopee Item ID', key: 'shopeeItemId', width: 15 },
        { header: 'Terakhir Sync', key: 'lastSync', width: 20 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      
      // Add data
      products.forEach(product => {
        worksheet.addRow({
          id: product.id,
          sku: product.sku || '-',
          name: product.name,
          category: product.category || '-',
          price: formatCurrency(product.price),
          stock: product.stock,
          status: product.status,
          shopeeItemId: product.shopeeItemId || '-',
          lastSync: product.lastSyncAt ? formatDate(product.lastSyncAt) : '-',
        });
      });
      
      // Generate filename
      const exportFilename = filename || `products_${Date.now()}.xlsx`;
      const filePath = path.join(EXPORT_DIR, sanitizeFilename(exportFilename));
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Products exported to ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error('Export products error:', error);
      throw error;
    }
  }
  
  // Export orders to Excel
  async exportOrders(orders, filename = null) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders');
      
      // Define columns
      worksheet.columns = [
        { header: 'Order SN', key: 'orderSn', width: 20 },
        { header: 'Tanggal', key: 'createTime', width: 18 },
        { header: 'Pembeli', key: 'buyerUsername', width: 20 },
        { header: 'Total', key: 'totalAmount', width: 15 },
        { header: 'Status', key: 'orderStatus', width: 15 },
        { header: 'Kurir', key: 'shippingCarrier', width: 15 },
        { header: 'No Resi', key: 'trackingNumber', width: 20 },
        { header: 'Metode Bayar', key: 'paymentMethod', width: 15 },
      ];
      
      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      
      // Add data
      orders.forEach(order => {
        worksheet.addRow({
          orderSn: order.orderSn,
          createTime: formatDate(order.createTime),
          buyerUsername: order.buyerUsername,
          totalAmount: formatCurrency(order.totalAmount),
          orderStatus: order.orderStatus,
          shippingCarrier: order.shippingCarrier || '-',
          trackingNumber: order.trackingNumber || '-',
          paymentMethod: order.paymentMethod || '-',
        });
      });
      
      const exportFilename = filename || `orders_${Date.now()}.xlsx`;
      const filePath = path.join(EXPORT_DIR, sanitizeFilename(exportFilename));
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Orders exported to ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error('Export orders error:', error);
      throw error;
    }
  }
  
  // Export inventory report
  async exportInventoryReport(data, filename = null) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventory Report');
      
      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Nama Produk', key: 'name', width: 40 },
        { header: 'Stok Saat Ini', key: 'stock', width: 15 },
        { header: 'Stok Minimum', key: 'minStock', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC000' },
      };
      
      data.forEach(item => {
        const row = worksheet.addRow({
          sku: item.sku || '-',
          name: item.name,
          stock: item.stock,
          minStock: 10,
          status: item.stock <= 0 ? 'Habis' : item.stock <= 10 ? 'Rendah' : 'Normal',
        });
        
        // Highlight low stock
        if (item.stock <= 10) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: item.stock <= 0 ? 'FFFF0000' : 'FFFFFF00' },
          };
        }
      });
      
      const exportFilename = filename || `inventory_${Date.now()}.xlsx`;
      const filePath = path.join(EXPORT_DIR, sanitizeFilename(exportFilename));
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Inventory report exported to ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error('Export inventory error:', error);
      throw error;
    }
  }
  
  // Clean old export files
  async cleanOldExports(daysOld = 7) {
    try {
      const files = fs.readdirSync(EXPORT_DIR);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      
      let deleted = 0;
      
      for (const file of files) {
        const filePath = path.join(EXPORT_DIR, file);
        const stat = fs.statSync(filePath);
        
        if (now - stat.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }
      
      logger.info(`Cleaned ${deleted} old export files`);
      
      return deleted;
    } catch (error) {
      logger.error('Clean old exports error:', error);
      throw error;
    }
  }
}

module.exports = new ExcelService();
