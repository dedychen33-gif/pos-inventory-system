const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'shopee_dashboard';
  
  const command = `mysqldump -h ${dbHost} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > ${filepath}`;
  
  console.log('Starting database backup...');
  console.log(`Backup file: ${filename}`);
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup failed:', error.message);
        reject(error);
        return;
      }
      
      const stats = fs.statSync(filepath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`Backup completed successfully!`);
      console.log(`File size: ${sizeInMB} MB`);
      console.log(`Location: ${filepath}`);
      
      resolve({
        filename,
        filepath,
        size: stats.size,
        sizeFormatted: `${sizeInMB} MB`,
        timestamp,
      });
    });
  });
};

const cleanOldBackups = async (daysToKeep = 7) => {
  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
  
  let deleted = 0;
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filepath);
      deleted++;
      console.log(`Deleted old backup: ${file}`);
    }
  }
  
  console.log(`Cleaned ${deleted} old backup files`);
  
  return deleted;
};

const restore = async (filename) => {
  const filepath = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }
  
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'shopee_dashboard';
  
  const command = `mysql -h ${dbHost} -u ${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} < ${filepath}`;
  
  console.log('Starting database restore...');
  console.log(`Restoring from: ${filename}`);
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Restore failed:', error.message);
        reject(error);
        return;
      }
      
      console.log('Database restored successfully!');
      
      resolve({ filename, filepath });
    });
  });
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0] || 'backup';
  
  switch (action) {
    case 'backup':
      backup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'clean':
      cleanOldBackups(parseInt(args[1]) || 7)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    case 'restore':
      if (!args[1]) {
        console.error('Please provide backup filename');
        process.exit(1);
      }
      restore(args[1])
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    
    default:
      console.log('Usage: node backup.js [backup|clean|restore] [options]');
      process.exit(0);
  }
}

module.exports = { backup, cleanOldBackups, restore };
