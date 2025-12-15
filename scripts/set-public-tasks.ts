/**
 * 设置所有成功的图片和视频任务为公开
 * 用于充实 Dashboard 的公开内容
 */

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

async function setPublicTasks() {
  try {
    console.log('开始更新任务公开状态...');

    // 更新所有成功的图片和视频任务为公开
    const result = await db()
      .update(aiTask)
      .set({
        isPublic: true,
      })
      .where(
        and(
          eq(aiTask.status, 'success'), // 只更新成功的任务
          or(
            eq(aiTask.mediaType, 'image'), // 图片
            eq(aiTask.mediaType, 'video')  // 视频
          ),
          isNull(aiTask.deletedAt) // 未删除的
        )
      );

    console.log('✅ 更新完成！');
    // rowCount 可能不存在，取决于数据库驱动
    const rowCount = (result as { rowCount?: number }).rowCount;
    if (rowCount !== undefined) {
      console.log(`影响的行数: ${rowCount}`);
    }

    // 查询统计信息 - 分别查询每种类型
    const imageCount = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.isPublic, true),
          eq(aiTask.status, 'success'),
          eq(aiTask.mediaType, 'image'),
          isNull(aiTask.deletedAt)
        )
      );

    const videoCount = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.isPublic, true),
          eq(aiTask.status, 'success'),
          eq(aiTask.mediaType, 'video'),
          isNull(aiTask.deletedAt)
        )
      );

    console.log('\n📊 公开任务统计:');
    console.log(`  image: ${imageCount.length} 条`);
    console.log(`  video: ${videoCount.length} 条`);
    console.log(`  总计: ${imageCount.length + videoCount.length} 条`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

setPublicTasks();
