#!/usr/bin/env tsx

/**
 * 上传本地静态资源到 R2
 *
 * 功能：
 * 1. 上传 public/video 和 public/imgs 目录下的所有文件到 R2
 * 2. 生成替换映射表，用于后续代码替换
 *
 * Usage:
 *   pnpm tsx scripts/upload-assets-to-r2.ts
 */

import { createR2ProviderFromDb } from '@/extensions/storage/db-config-loader';
import * as fs from 'fs';
import * as path from 'path';

// R2 存储路径前缀
const R2_PREFIX = 'petmovie';

// 需要上传的目录
const UPLOAD_DIRS = [
  { local: 'public/video', remote: `${R2_PREFIX}/videos` },
  { local: 'public/imgs', remote: `${R2_PREFIX}/imgs` },
];

// MIME 类型映射
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

// 获取文件的 MIME 类型
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// 递归获取目录下所有文件
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      // 只处理媒体文件
      const ext = path.extname(file).toLowerCase();
      if (MIME_TYPES[ext]) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// 主函数
async function main() {
  console.log('🚀 开始上传本地资源到 R2...\n');

  // 获取 R2 Provider
  console.log('📦 初始化 R2 Provider...');
  const r2Provider = await createR2ProviderFromDb();
  const publicDomain = r2Provider.configs.publicDomain;
  console.log(`✅ R2 Provider 初始化成功，CDN 域名: ${publicDomain}\n`);

  // 存储上传结果映射
  const uploadResults: { localPath: string; r2Url: string; success: boolean }[] = [];

  // 统计
  let totalFiles = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // 遍历每个目录
  for (const dir of UPLOAD_DIRS) {
    const localDir = path.resolve(process.cwd(), dir.local);
    console.log(`\n📂 处理目录: ${dir.local}`);

    const files = getAllFiles(localDir);
    console.log(`   找到 ${files.length} 个文件`);

    for (const filePath of files) {
      totalFiles++;

      // 计算相对路径和 R2 key
      const relativePath = path.relative(localDir, filePath);
      const r2Key = `${dir.remote}/${relativePath}`;
      const expectedUrl = `${publicDomain}/${r2Key}`;

      // 读取文件
      const fileBuffer = fs.readFileSync(filePath);
      const contentType = getMimeType(filePath);

      console.log(`   ⬆️  上传: ${relativePath} (${(fileBuffer.length / 1024).toFixed(1)}KB)`);

      try {
        const result = await r2Provider.uploadFile({
          body: fileBuffer,
          key: r2Key,
          contentType,
          disposition: 'inline',
        });

        if (result.success) {
          successCount++;
          uploadResults.push({
            localPath: `/${dir.local.replace('public', '')}/${relativePath}`,
            r2Url: result.url || expectedUrl,
            success: true,
          });
          console.log(`      ✅ 成功: ${result.url}`);
        } else {
          failCount++;
          uploadResults.push({
            localPath: `/${dir.local.replace('public', '')}/${relativePath}`,
            r2Url: '',
            success: false,
          });
          console.log(`      ❌ 失败: ${result.error}`);
        }
      } catch (error) {
        failCount++;
        uploadResults.push({
          localPath: `/${dir.local.replace('public', '')}/${relativePath}`,
          r2Url: '',
          success: false,
        });
        console.log(`      ❌ 错误: ${error}`);
      }
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 上传统计:');
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${failCount}`);
  console.log(`   跳过: ${skipCount}`);
  console.log('='.repeat(60));

  // 生成替换映射 JSON
  const mappingFile = path.resolve(process.cwd(), 'scripts/r2-url-mapping.json');
  const successfulUploads = uploadResults.filter(r => r.success);

  // 生成映射对象
  const mapping: Record<string, string> = {};
  successfulUploads.forEach(r => {
    mapping[r.localPath] = r.r2Url;
  });

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\n📝 URL 映射已保存到: ${mappingFile}`);

  // 输出用于快速查看的摘要
  console.log('\n📋 上传成功的资源映射:');
  successfulUploads.forEach(r => {
    console.log(`   ${r.localPath} -> ${r.r2Url}`);
  });

  if (failCount > 0) {
    console.log('\n⚠️  有文件上传失败，请检查上面的错误信息');
    process.exit(1);
  }

  console.log('\n🎉 所有文件上传完成！');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
