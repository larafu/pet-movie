#!/usr/bin/env tsx

/**
 * 批量替换本地资源路径为 R2 CDN URL
 *
 * Usage:
 *   pnpm tsx scripts/replace-local-urls.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// R2 CDN 域名
const R2_CDN = 'https://media.petmovie.ai/petmovie';

// 需要替换的路径映射
const URL_REPLACEMENTS: [RegExp, string][] = [
  // 视频文件
  [/["'`]\/video\/([^"'`]+)["'`]/g, `"${R2_CDN}/videos/$1"`],
  // 图片文件
  [/["'`]\/imgs\/([^"'`]+)["'`]/g, `"${R2_CDN}/imgs/$1"`],
  // 带括号的 markdown 语法 ![alt](/imgs/xxx)
  [/\(\/video\/([^)]+)\)/g, `(${R2_CDN}/videos/$1)`],
  [/\(\/imgs\/([^)]+)\)/g, `(${R2_CDN}/imgs/$1)`],
];

// 需要处理的文件模式
const FILE_PATTERNS = [
  'src/config/locale/messages/**/*.json',
  'content/posts/**/*.mdx',
];

// 获取所有匹配的文件
function getFiles(patterns: string[]): string[] {
  const files: string[] = [];
  const glob = require('fast-glob');

  for (const pattern of patterns) {
    const matches = glob.sync(pattern, {
      cwd: process.cwd(),
      absolute: true,
    });
    files.push(...matches);
  }

  return files;
}

// 替换文件内容
function replaceInFile(filePath: string): { changed: boolean; replacements: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let totalReplacements = 0;
  const originalContent = content;

  for (const [pattern, replacement] of URL_REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches) {
      totalReplacements += matches.length;
      content = content.replace(pattern, replacement);
    }
  }

  const changed = content !== originalContent;
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { changed, replacements: totalReplacements };
}

// 主函数
async function main() {
  console.log('🔄 开始批量替换本地资源路径...\n');

  const files = getFiles(FILE_PATTERNS);
  console.log(`📂 找到 ${files.length} 个文件需要检查\n`);

  let totalChangedFiles = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const { changed, replacements } = replaceInFile(file);

    if (changed) {
      totalChangedFiles++;
      totalReplacements += replacements;
      console.log(`✅ ${relativePath} (${replacements} 处替换)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 替换统计:');
  console.log(`   检查文件数: ${files.length}`);
  console.log(`   修改文件数: ${totalChangedFiles}`);
  console.log(`   替换次数: ${totalReplacements}`);
  console.log('='.repeat(60));

  console.log('\n🎉 替换完成！');
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
