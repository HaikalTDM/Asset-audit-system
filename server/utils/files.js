const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn('Failed to delete file:', err.message);
  }
}

function uploadsRoot() {
  return path.join(__dirname, '..', 'uploads');
}

module.exports = { ensureDir, safeUnlink, uploadsRoot };
