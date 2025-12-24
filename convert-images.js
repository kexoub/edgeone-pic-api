// convert-images.js
const sharp = require('sharp');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

const FORMATS = ['webp', 'avif', 'jpeg'];
const INPUT_DIR = './images'; // 原图目录
const OUTPUT_BASE = './converted';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 创建目录结构
['pc', 'pe'].forEach(type => {
  FORMATS.forEach(fmt => {
    ensureDir(path.join(OUTPUT_BASE, type, fmt));
  });
});

// 转换函数
async function convertImage(inputPath, outputDir, filename) {
  const name = path.parse(filename).name;

  try {
    const img = sharp(inputPath);

    // WebP
    await img.clone().webp({ quality: 80 }).toFile(path.join(outputDir, 'webp', `${name}.webp`));

    // AVIF
    await img.clone().avif({ quality: 50 }).toFile(path.join(outputDir, 'avif', `${name}.avif`));

    // JPEG（确保一致性）
    await img.clone().jpeg({ quality: 85 }).toFile(path.join(outputDir, 'jpeg', `${name}.jpg`));

    console.log(`✅ ${filename}`);
  } catch (err) {
    console.error(`❌ ${filename}:`, err.message);
  }
}

// 执行转换
['./images/pc/*', './images/pe/*'].forEach(pattern => {
  glob.sync(pattern).forEach(filePath => {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const dir = filePath.includes('/pc/') ? 'pc' : 'pe';
      const outputDir = path.join(OUTPUT_BASE, dir);
      convertImage(filePath, outputDir, path.basename(filePath));
    }
  });
});
