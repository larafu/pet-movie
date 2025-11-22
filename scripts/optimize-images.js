#!/usr/bin/env node

/**
 * 图片和视频优化脚本 (Node.js 版本)
 *
 * 使用 sharp 和其他 Node.js 库进行优化
 *
 * 安装依赖:
 * pnpm add -D sharp glob
 *
 * 运行:
 * node scripts/optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const OPTIMIZED_DIR = 'public/optimized';

// 确保输出目录存在
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // 目录已存在
  }
}

// 获取文件大小（人类可读）
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// 优化 PNG 图片
async function optimizePNG(inputPath, outputPath, maxWidth = 1920) {
  console.log(`🖼️  优化: ${inputPath}`);

  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;

  // 生成 WebP 版本
  const webpPath = outputPath.replace('.png', '.webp');
  await sharp(inputPath)
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath);

  // 生成优化的 PNG
  await sharp(inputPath)
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .png({ quality: 80, compressionLevel: 9 })
    .toFile(outputPath);

  const newStats = await fs.stat(outputPath);
  const webpStats = await fs.stat(webpPath);

  console.log(`  ✅ PNG: ${formatBytes(originalSize)} → ${formatBytes(newStats.size)} (${Math.round((1 - newStats.size / originalSize) * 100)}% 减少)`);
  console.log(`  ✅ WebP: ${formatBytes(webpStats.size)} (${Math.round((1 - webpStats.size / originalSize) * 100)}% 减少)`);
}

// 优化 JPEG/JPG 图片
async function optimizeJPG(inputPath, outputPath, maxWidth = 1920) {
  console.log(`🖼️  优化: ${inputPath}`);

  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;

  // 生成 WebP 版本
  const webpPath = outputPath.replace(/\.jpe?g$/i, '.webp');
  await sharp(inputPath)
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath);

  // 生成优化的 JPEG
  await sharp(inputPath)
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);

  const newStats = await fs.stat(outputPath);
  const webpStats = await fs.stat(webpPath);

  console.log(`  ✅ JPEG: ${formatBytes(originalSize)} → ${formatBytes(newStats.size)} (${Math.round((1 - newStats.size / originalSize) * 100)}% 减少)`);
  console.log(`  ✅ WebP: ${formatBytes(webpStats.size)} (${Math.round((1 - webpStats.size / originalSize) * 100)}% 减少)`);
}

async function main() {
  console.log('🎨 开始优化图片资源...\n');

  // 创建输出目录
  await ensureDir(path.join(OPTIMIZED_DIR, 'imgs', 'features'));
  await ensureDir(path.join(OPTIMIZED_DIR, 'imgs', 'cases'));
  await ensureDir(path.join(OPTIMIZED_DIR, 'logos'));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  优化 Logos (最高优先级)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 优化 Logos
  const logos = [
    { input: 'public/logo.png', output: 'public/optimized/logos/logo.png', maxWidth: 400 },
    { input: 'public/logo-light.png', output: 'public/optimized/logos/logo-light.png', maxWidth: 400 },
    { input: 'public/logo-dark.png', output: 'public/optimized/logos/logo-dark.png', maxWidth: 400 },
    { input: 'public/favicon.png', output: 'public/optimized/logos/favicon.png', maxWidth: 64 },
    { input: 'public/icon.png', output: 'public/optimized/logos/icon.png', maxWidth: 512 },
  ];

  for (const logo of logos) {
    try {
      await optimizePNG(logo.input, logo.output, logo.maxWidth);
    } catch (error) {
      console.log(`  ⚠️  跳过: ${logo.input} (${error.message})`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  优化大图片');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 优化 features 图片
  const featureImages = await glob('public/imgs/features/*.png');
  for (const img of featureImages) {
    const filename = path.basename(img);
    try {
      await optimizePNG(img, path.join(OPTIMIZED_DIR, 'imgs', 'features', filename), 1920);
    } catch (error) {
      console.log(`  ⚠️  跳过: ${img} (${error.message})`);
    }
  }

  // 优化主图片
  const mainImages = [
    { input: 'public/imgs/cat.png', output: 'public/optimized/imgs/cat.png' },
    { input: 'public/imgs/dog.png', output: 'public/optimized/imgs/dog.png' },
  ];

  for (const img of mainImages) {
    try {
      await optimizePNG(img.input, img.output, 1200);
    } catch (error) {
      console.log(`  ⚠️  跳过: ${img.input} (${error.message})`);
    }
  }

  // 优化 cases 图片
  const caseImages = await glob('public/imgs/cases/*.png');
  for (const img of caseImages) {
    const filename = path.basename(img);
    try {
      await optimizePNG(img, path.join(OPTIMIZED_DIR, 'imgs', 'cases', filename), 1200);
    } catch (error) {
      console.log(`  ⚠️  跳过: ${img} (${error.message})`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ 图片优化完成！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 下一步:\n');
  console.log('  1. 检查 public/optimized/ 中的文件质量');
  console.log('  2. 备份原文件: mv public/imgs public/imgs.backup');
  console.log('  3. 备份原logos: mv public/*.png public/backup/');
  console.log('  4. 替换文件: cp -r public/optimized/* public/');
  console.log('  5. 运行测试: pnpm build && pnpm start\n');
  console.log('⚠️  视频优化需要 ffmpeg:');
  console.log('  - 运行 ./scripts/optimize-images.sh 来优化视频');
  console.log('  - 或者考虑迁移到 Cloudflare R2\n');
}

main().catch(console.error);
