const AWS = require('aws-sdk');
require('dotenv').config();

// 配置AWS SDK
AWS.config.update({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true
});

// 创建S3客户端实例
const s3 = new AWS.S3();

/**
 * 上传照片到Cloudflare R2存储
 * @param {Buffer} fileBuffer - 上传文件的Buffer数据
 * @param {string} fileName - 要保存在R2中的文件名
 * @returns {Promise<string>} 返回文件的可访问URL
 */
async function uploadPhoto(fileBuffer, fileName) {
  try {
    // 执行上传
    await s3.upload({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: getContentType(fileName),
    }).promise();

    // 返回自定义域名的URL
    const fileUrl = `https://${process.env.R2_CUSTOM_DOMAIN}/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw new Error(`文件上传失败: ${error.message}`);
  }
}

/**
 * 根据文件扩展名获取Content-Type
 * @param {string} fileName - 文件名
 * @returns {string} Content-Type
 */
function getContentType(fileName) {
  const extension = fileName.toLowerCase().split('.').pop();
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}

/**
 * 从Cloudflare R2存储删除文件
 * @param {string} fileName - 要删除的文件名
 * @returns {Promise<boolean>} 删除是否成功
 */
async function deletePhoto(fileName) {
  try {
    await s3.deleteObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
    }).promise();

    console.log(`文件 ${fileName} 删除成功`);
    return true;
  } catch (error) {
    console.error(`文件 ${fileName} 删除失败:`, error);
    throw new Error(`文件删除失败: ${error.message}`);
  }
}

module.exports = {
  uploadPhoto,
  deletePhoto,
}; 