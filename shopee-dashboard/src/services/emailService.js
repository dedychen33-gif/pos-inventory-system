const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    this.from = process.env.SMTP_FROM || 'noreply@shopee-dashboard.com';
  }
  
  // Send email
  async send(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent: ${info.messageId}`);
      
      return info;
    } catch (error) {
      logger.error('Send email error:', error);
      throw error;
    }
  }
  
  // Send low stock alert
  async sendLowStockAlert(products, recipients) {
    const subject = '⚠️ Peringatan Stok Rendah - Shopee Dashboard';
    
    const productList = products.map(p => 
      `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.sku || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: ${p.stock <= 5 ? 'red' : 'orange'};">${p.stock}</td>
      </tr>`
    ).join('');
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b00;">⚠️ Peringatan Stok Rendah</h2>
        <p>Berikut adalah produk dengan stok rendah yang perlu segera diisi ulang:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">SKU</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nama Produk</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Stok</th>
            </tr>
          </thead>
          <tbody>
            ${productList}
          </tbody>
        </table>
        
        <p style="color: #666; font-size: 12px;">
          Email ini dikirim otomatis oleh Shopee Dashboard.
        </p>
      </div>
    `;
    
    for (const recipient of recipients) {
      await this.send(recipient, subject, html);
    }
  }
  
  // Send daily report
  async sendDailyReport(report, recipients) {
    const subject = '📊 Laporan Harian - Shopee Dashboard';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b00;">📊 Laporan Harian</h2>
        <p>Berikut adalah ringkasan penjualan hari ini:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <strong style="color: #666;">Total Order</strong>
              <h3 style="margin: 5px 0; color: #333;">${report.totalOrders}</h3>
            </div>
            <div>
              <strong style="color: #666;">Total Pendapatan</strong>
              <h3 style="margin: 5px 0; color: #28a745;">${report.totalRevenueFormatted}</h3>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <div>
              <strong style="color: #666;">Order Selesai</strong>
              <h3 style="margin: 5px 0; color: #333;">${report.completedOrders}</h3>
            </div>
            <div>
              <strong style="color: #666;">Order Pending</strong>
              <h3 style="margin: 5px 0; color: #ffc107;">${report.pendingOrders}</h3>
            </div>
          </div>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Laporan dihasilkan pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
        </p>
      </div>
    `;
    
    for (const recipient of recipients) {
      await this.send(recipient, subject, html);
    }
  }
  
  // Send sync notification
  async sendSyncNotification(type, status, details, recipients) {
    const isSuccess = status === 'success';
    const subject = `${isSuccess ? '✅' : '❌'} Sync ${type} ${isSuccess ? 'Berhasil' : 'Gagal'}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isSuccess ? '#28a745' : '#dc3545'};">
          ${isSuccess ? '✅' : '❌'} Sync ${type} ${isSuccess ? 'Berhasil' : 'Gagal'}
        </h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Detail:</strong> ${details}</p>
        </div>
      </div>
    `;
    
    for (const recipient of recipients) {
      await this.send(recipient, subject, html);
    }
  }
}

module.exports = new EmailService();
