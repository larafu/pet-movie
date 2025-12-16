/**
 * Random Prompt Model
 * 随机 Prompt 模型层 - 提供 CRUD 操作和随机获取功能
 */

import { and, asc, count, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  randomPrompt,
  RandomPrompt,
  NewRandomPrompt,
} from '@/config/db/schema';

// 类型重新导出
export type { RandomPrompt, NewRandomPrompt };

// 更新类型定义
export type UpdateRandomPrompt = Partial<Omit<NewRandomPrompt, 'id' | 'createdAt'>>;

// 模式枚举
export enum RandomPromptMode {
  IMAGE = 'image',
  VIDEO = 'video',
}

// 状态枚举
export enum RandomPromptStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 添加随机 Prompt
 */
export async function addRandomPrompt(data: NewRandomPrompt): Promise<RandomPrompt | undefined> {
  const [result] = await db().insert(randomPrompt).values(data).returning();
  return result;
}

/**
 * 更新随机 Prompt
 */
export async function updateRandomPrompt(
  id: string,
  data: UpdateRandomPrompt
): Promise<RandomPrompt | undefined> {
  const [result] = await db()
    .update(randomPrompt)
    .set(data)
    .where(eq(randomPrompt.id, id))
    .returning();
  return result;
}

/**
 * 删除随机 Prompt（硬删除）
 */
export async function deleteRandomPrompt(id: string): Promise<boolean> {
  const result = await db()
    .delete(randomPrompt)
    .where(eq(randomPrompt.id, id));
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * 查找单个随机 Prompt
 */
export async function findRandomPrompt({
  id,
}: {
  id: string;
}): Promise<RandomPrompt | undefined> {
  const [result] = await db()
    .select()
    .from(randomPrompt)
    .where(eq(randomPrompt.id, id))
    .limit(1);
  return result;
}

/**
 * 获取随机 Prompt 列表（分页）
 */
export async function getRandomPrompts({
  mode,
  status,
  page = 1,
  limit = 30,
}: {
  mode?: RandomPromptMode;
  status?: RandomPromptStatus;
  page?: number;
  limit?: number;
}): Promise<RandomPrompt[]> {
  const offset = (page - 1) * limit;

  return db()
    .select()
    .from(randomPrompt)
    .where(
      and(
        mode ? eq(randomPrompt.mode, mode) : undefined,
        status ? eq(randomPrompt.status, status) : undefined
      )
    )
    .orderBy(asc(randomPrompt.sortOrder), desc(randomPrompt.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取随机 Prompt 数量
 */
export async function getRandomPromptsCount({
  mode,
  status,
}: {
  mode?: RandomPromptMode;
  status?: RandomPromptStatus;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(randomPrompt)
    .where(
      and(
        mode ? eq(randomPrompt.mode, mode) : undefined,
        status ? eq(randomPrompt.status, status) : undefined
      )
    );
  return result?.count ?? 0;
}

/**
 * 随机获取一条 Prompt（核心功能）
 * 从指定模式的活跃 prompt 中随机选择一条
 */
export async function getOneRandomPrompt(
  mode: RandomPromptMode
): Promise<string | null> {
  // 使用 SQL RANDOM() 函数随机获取一条
  const [result] = await db()
    .select({ prompt: randomPrompt.prompt })
    .from(randomPrompt)
    .where(
      and(
        eq(randomPrompt.mode, mode),
        eq(randomPrompt.status, RandomPromptStatus.ACTIVE)
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(1);

  return result?.prompt ?? null;
}

/**
 * 检查指定模式是否有活跃的 Prompt
 * 用于前端判断是否显示骰子按钮
 */
export async function hasActivePrompts(mode: RandomPromptMode): Promise<boolean> {
  const countResult = await getRandomPromptsCount({
    mode,
    status: RandomPromptStatus.ACTIVE,
  });
  return countResult > 0;
}
