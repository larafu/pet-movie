#!/usr/bin/env tsx

/**
 * 上传博客图片到 R2
 *
 * 将本地图片转换为 WebP 格式并上传到 R2 存储
 *
 * Usage:
 *   pnpm tsx scripts/upload-blog-images.ts
 */

import { getStorageService } from '@/shared/services/storage';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// 需要处理的图片列表
const images = [
  {
    input: '/Users/fusiyao/Documents/GitHub/pet-movie/public/imgs/pet-memorial-portrait.jpg',
    outputKey: 'blog-images/pet-memorial-portrait.webp',
    description: '自定义宠物肖像画',
  },
  {
    input: '/Users/fusiyao/Documents/GitHub/pet-movie/public/imgs/pet-memorial-digital-space.png',
    outputKey: 'blog-images/pet-memorial-digital-space.webp',
    description: '数字纪念空间页面',
  },
  {
    input: '/Users/fusiyao/Documents/GitHub/pet-movie/public/imgs/pet-memorial-memory-box.png',
    outputKey: 'blog-images/pet-memorial-memory-box.webp',
    description: '纪念盒和蜡烛场景',
  },
];

async function uploadBlogImages() {
  console.log('🚀 开始上传博客图片到 R2...\n');

  try {
    // 初始化存储服务
    const storageService = await getStorageService();
    const providerNames = storageService.getProviderNames();

    if (!providerNames.includes('r2')) {
      console.error('❌ R2 Provider 未配置');
      console.error('请先运行: pnpm tsx scripts/check-r2-config.ts');
      process.exit(1);
    }

    console.log('✅ R2 Provider 已就绪\n');

    // 处理每张图片
    for (const image of images) {
      console.log(`📸 处理: ${image.description}`);
      console.log(`   输入: ${path.basename(image.input)}`);
      console.log(`   输出: ${image.outputKey}`);

      // 读取图片
      const buffer = await fs.readFile(image.input);

      // 转换为 WebP (质量 90, 优化压缩)
      const webpBuffer = await sharp(buffer)
        .webp({ quality: 90, effort: 6 })
        .toBuffer();

      const originalSize = (buffer.length / 1024 / 1024).toFixed(2);
      const webpSize = (webpBuffer.length / 1024 / 1024).toFixed(2);
      const savings = (((buffer.length - webpBuffer.length) / buffer.length) * 100).toFixed(1);

      console.log(`   压缩: ${originalSize}MB → ${webpSize}MB (节省 ${savings}%)`);

      // 上传到 R2
      console.log(`   上传中...`);
      const result = await storageService.uploadFile({
        body: webpBuffer,
        key: image.outputKey,
        contentType: 'image/webp',
        provider: 'r2',
      });

      if (result.success) {
        console.log(`   ✅ 上传成功: ${result.url}\n`);
      } else {
        console.error(`   ❌ 上传失败: ${result.error}\n`);
        process.exit(1);
      }
    }

    console.log('\n🎉 所有图片已成功上传到 R2！\n');
    console.log('📝 接下来需要更新博客文章中的图片路径：');
    console.log('');
    images.forEach((img) => {
      console.log(`   ${img.description}:`);
      console.log(`   https://media.petmovie.ai/${img.outputKey}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

uploadBlogImages();
