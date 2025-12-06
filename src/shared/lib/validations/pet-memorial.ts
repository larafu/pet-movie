/**
 * 宠物纪念功能 Zod 验证 Schema
 * Pet Memorial Feature Zod Validation Schemas
 */

import { z } from 'zod';

// ============================================================================
// 基础验证 / Base Validations
// ============================================================================

/**
 * 宠物物种枚举
 */
export const petSpeciesSchema = z.enum([
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'other',
]);

/**
 * 日期字符串验证（ISO 格式）
 */
const dateStringSchema = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'petMemorial.form.invalidDate',
  });

// ============================================================================
// 创建纪念表单验证 / Create Memorial Form Validation
// ============================================================================

export const createMemorialSchema = z.object({
  // 宠物名字 - 必填，1-50字符
  petName: z
    .string()
    .min(1, 'petMemorial.form.petNameRequired')
    .max(50, 'petMemorial.form.petNameTooLong'),

  // 物种 - 可选
  species: petSpeciesSchema.optional(),

  // 生日 - 可选，ISO 日期格式
  birthday: dateStringSchema,

  // 去世日期 - 可选，ISO 日期格式
  dateOfPassing: dateStringSchema,

  // 纪念留言 - 可选，最多500字符
  message: z.string().max(500, 'petMemorial.form.messageTooLong').optional(),

  // 宠物故事 - 可选，最多5000字符
  story: z.string().max(5000, 'petMemorial.form.storyTooLong').optional(),

  // 图片 - 必填，1-6张
  images: z
    .array(z.string().url('petMemorial.form.invalidImageUrl'))
    .min(1, 'petMemorial.error.imageRequired')
    .max(6, 'petMemorial.error.imageLimitExceeded'),

  // 主人名字 - 可选
  ownerFirstName: z
    .string()
    .max(50, 'petMemorial.form.nameTooLong')
    .optional()
    .or(z.literal('')),
  ownerLastName: z
    .string()
    .max(50, 'petMemorial.form.nameTooLong')
    .optional()
    .or(z.literal('')),

  // 地区 - 可选
  city: z
    .string()
    .max(100, 'petMemorial.form.cityTooLong')
    .optional()
    .or(z.literal('')),
  state: z
    .string()
    .max(100, 'petMemorial.form.stateTooLong')
    .optional()
    .or(z.literal('')),

  // 邮箱 - 可选，用于蜡烛通知
  email: z
    .string()
    .email('petMemorial.form.invalidEmail')
    .optional()
    .or(z.literal('')),

  // 是否展示姓名 - 默认 true
  isNameDisplayed: z.boolean().default(true),

  // 是否公开 - 默认 true
  isPublic: z.boolean().default(true),
});

// ============================================================================
// 更新纪念表单验证 / Update Memorial Form Validation
// ============================================================================

export const updateMemorialSchema = createMemorialSchema.partial();

// ============================================================================
// 点蜡烛表单验证 / Light Candle Form Validation
// ============================================================================

export const lightCandleSchema = z.object({
  // 姓名 - 匿名访客时使用，最多100字符
  name: z
    .string()
    .max(100, 'petMemorial.candle.nameTooLong')
    .optional()
    .or(z.literal('')),

  // 邮箱 - 可选
  email: z
    .string()
    .email('petMemorial.candle.invalidEmail')
    .optional()
    .or(z.literal('')),

  // 留言 - 可选，最多500字符
  message: z
    .string()
    .max(500, 'petMemorial.candle.messageTooLong')
    .optional()
    .or(z.literal('')),
});

// ============================================================================
// 生成视频请求验证 / Generate Video Request Validation
// ============================================================================

export const generateVideoSchema = z.object({
  // 视频宽高比
  aspectRatio: z.enum(['16:9', '9:16']),
});

// ============================================================================
// 分页参数验证 / Pagination Params Validation
// ============================================================================

export const paginationSchema = z.object({
  // 每页数量，默认12，最大50
  limit: z.coerce.number().int().min(1).max(50).default(12),

  // 偏移量，默认0
  offset: z.coerce.number().int().min(0).default(0),
});

export const memorialListParamsSchema = paginationSchema.extend({
  /** 通用搜索关键词（模糊搜索宠物名和主人名） */
  search: z.string().optional(),

  /** 排序方式 */
  sort: z.enum(['latest', 'popular']).default('latest'),
});

// ============================================================================
// 类型导出 / Type Exports
// ============================================================================

export type CreateMemorialInput = z.infer<typeof createMemorialSchema>;
export type UpdateMemorialInput = z.infer<typeof updateMemorialSchema>;
export type LightCandleInput = z.infer<typeof lightCandleSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type MemorialListParamsInput = z.infer<typeof memorialListParamsSchema>;
