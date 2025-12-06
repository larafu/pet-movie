/**
 * 获取已发布的模板列表 API（供前端下拉菜单使用）
 * GET /api/script-templates?category=dog
 *
 * 只返回 status = 'published' 的模板
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';

import { db } from '@/core/db';
import { scriptTemplate } from '@/config/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // dog, cat, other, 或空（获取全部）

    const database = db();

    // 构建查询条件：只查询已发布的模板
    const conditions = [eq(scriptTemplate.status, 'published')];
    if (category) {
      conditions.push(eq(scriptTemplate.category, category));
    }

    // 查询已发布的模板，按排序顺序
    const templates = await database
      .select({
        id: scriptTemplate.id,
        name: scriptTemplate.name,
        nameCn: scriptTemplate.nameCn,
        description: scriptTemplate.description,
        descriptionCn: scriptTemplate.descriptionCn,
        thumbnailUrl: scriptTemplate.thumbnailUrl,
        previewVideoUrl: scriptTemplate.previewVideoUrl,
        category: scriptTemplate.category,
        tags: scriptTemplate.tags, // 返回 tags 字段供前端筛选
        styleId: scriptTemplate.styleId,
        durationSeconds: scriptTemplate.durationSeconds,
        aspectRatio: scriptTemplate.aspectRatio,
        creditsRequired: scriptTemplate.creditsRequired,
      })
      .from(scriptTemplate)
      .where(and(...conditions))
      .orderBy(asc(scriptTemplate.sortOrder), asc(scriptTemplate.createdAt));

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
