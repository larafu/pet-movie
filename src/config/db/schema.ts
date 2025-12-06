import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
  ]
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = pgTable('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = pgTable(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = pgTable(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = pgTable(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = pgTable(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = pgTable(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = pgTable(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = pgTable(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const aiTask = pgTable(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    taskId: text('task_id'), // provider task id
    taskInfo: text('task_info'), // provider task info
    taskResult: text('task_result'), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
    // Pet video generation specific fields
    petImageUrl: text('pet_image_url'), // User's uploaded pet image
    templateType: text('template_type'), // 'dog' | 'cat'
    petDescription: text('pet_description'), // AI-identified pet description
    frameImageUrl: text('frame_image_url'), // Evolink generated frame image
    frameTaskId: text('frame_task_id'), // Evolink frame generation task ID
    videoTaskId: text('video_task_id'), // KIE video generation task ID
    tempVideoUrl: text('temp_video_url'), // KIE temporary video URL
    finalVideoUrl: text('final_video_url'), // R2 permanent video URL
    originalVideoUrl: text('original_video_url'), // R2 original video URL (no watermark)
    watermarkedVideoUrl: text('watermarked_video_url'), // R2 watermarked video URL
    durationSeconds: integer('duration_seconds'), // Video duration: 25 or 50
    aspectRatio: text('aspect_ratio'), // Video aspect ratio: '16:9' or '9:16'
    retryCount: integer('retry_count').default(0), // Retry attempt count
    errorLog: text('error_log'), // Error log in JSON format
    isPublic: boolean('is_public').default(false).notNull(), // 是否公开分享 / Is publicly shared
    likeCount: integer('like_count').default(0).notNull(), // 点赞数
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
    // Index for public videos sorted by likes
    index('idx_ai_task_public_likes').on(table.isPublic, table.likeCount),
  ]
);

// 视频点赞表 - Video like table
export const videoLike = pgTable(
  'video_like',
  {
    id: text('id').primaryKey(),
    videoId: text('video_id')
      .notNull()
      .references(() => aiTask.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_video_like_video_id').on(table.videoId),
    index('idx_video_like_user_id').on(table.userId),
    index('idx_video_like_user_video').on(table.userId, table.videoId),
  ]
);

export const videoLikeRelations = relations(videoLike, ({ one }) => ({
  video: one(aiTask, {
    fields: [videoLike.videoId],
    references: [aiTask.id],
  }),
  user: one(user, {
    fields: [videoLike.userId],
    references: [user.id],
  }),
}));

export const chat = pgTable(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
  },
  (table) => [index('idx_chat_user_status').on(table.userId, table.status)]
);

export const chatMessage = pgTable(
  'chat_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    role: text('role').notNull(),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
  },
  (table) => [
    index('idx_chat_message_chat_id').on(table.chatId, table.status),
    index('idx_chat_message_user_id').on(table.userId, table.status),
  ]
);

// Earlybird subscriber table for pre-launch subscriptions
export const earlybirdSubscriber = pgTable(
  'earlybird_subscriber',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    petInfo: text('pet_info'), // Pet name and breed
    creativeDemand: text('creative_demand'), // User's creative requirements
    interestedPrepay: boolean('interested_prepay').default(false).notNull(), // Whether interested in prepay discount
    discountCode: text('discount_code'), // Generated discount code (20% off)
    status: text('status').notNull().default('pending'), // pending, contacted, converted
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    metadata: text('metadata'), // Additional info (JSON)
  },
  (table) => [
    index('idx_earlybird_email').on(table.email),
    index('idx_earlybird_status').on(table.status),
    index('idx_earlybird_prepay').on(table.interestedPrepay),
    index('idx_earlybird_created').on(table.createdAt),
  ]
);

// 社区分享表 - Community share table
// 用户可以将自己的AI生成作品分享到公共社区池
export const communityShare = pgTable(
  'community_share',
  {
    id: text('id').primaryKey(),
    // 关联到AI任务
    aiTaskId: text('ai_task_id')
      .notNull()
      .references(() => aiTask.id, { onDelete: 'cascade' }),
    // 分享用户
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 分享内容
    title: text('title').notNull(), // 分享标题
    description: text('description'), // 分享描述
    // 可见性和统计
    isPublic: boolean('is_public').default(true).notNull(), // 是否公开
    viewCount: integer('view_count').default(0).notNull(), // 浏览次数
    likeCount: integer('like_count').default(0).notNull(), // 点赞数
    shareCount: integer('share_count').default(0).notNull(), // 分享次数
    downloadCount: integer('download_count').default(0).notNull(), // 下载次数
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // 查询用户的分享作品
    index('idx_community_share_user_id').on(table.userId),
    // 查询公开的分享作品，按点赞数排序（热门排序）
    index('idx_community_share_public_likes').on(table.isPublic, table.likeCount),
    // 查询公开的分享作品，按创建时间排序（最新排序）
    index('idx_community_share_public_created').on(table.isPublic, table.createdAt),
    // 确保一个ai_task只能分享一次
    index('idx_community_share_ai_task').on(table.aiTaskId),
  ]
);

// 社区点赞表 - Community like table
// 记录用户对社区分享作品的点赞
export const communityLike = pgTable(
  'community_like',
  {
    id: text('id').primaryKey(),
    // 关联到分享
    shareId: text('share_id')
      .notNull()
      .references(() => communityShare.id, { onDelete: 'cascade' }),
    // 点赞用户
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询用户点赞的作品
    index('idx_community_like_user_id').on(table.userId),
    // 查询某个分享的所有点赞
    index('idx_community_like_share_id').on(table.shareId),
    // 确保一个用户对一个分享只能点赞一次（复合唯一索引）
    index('idx_community_like_user_share').on(table.userId, table.shareId),
  ]
);

// ==================== Relations ====================
// 定义表之间的关系，支持Drizzle的关联查询

export const communityShareRelations = relations(communityShare, ({ one }) => ({
  // 关联用户
  user: one(user, {
    fields: [communityShare.userId],
    references: [user.id],
  }),
  // 关联AI任务
  aiTask: one(aiTask, {
    fields: [communityShare.aiTaskId],
    references: [aiTask.id],
  }),
}));

export const communityLikeRelations = relations(communityLike, ({ one }) => ({
  // 关联分享
  share: one(communityShare, {
    fields: [communityLike.shareId],
    references: [communityShare.id],
  }),
  // 关联用户
  user: one(user, {
    fields: [communityLike.userId],
    references: [user.id],
  }),
}));

// ==================== Custom Script Tables ====================
// 自定义剧本表 - 用于存储用户创建的自定义视频剧本

/**
 * 自定义剧本主表
 * 存储用户创建的完整剧本信息，包括原始输入、Gemini生成的分镜JSON、最终输出等
 */
export const customScript = pgTable(
  'custom_script',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 状态: draft=草稿, creating=创作中, completed=已完成, failed=失败
    status: text('status').notNull().default('draft'),

    // 用户输入
    petImageUrl: text('pet_image_url'), // 用户上传的宠物图片
    userPrompt: text('user_prompt'), // 用户输入的原始提示词
    musicPrompt: text('music_prompt'), // 配乐提示词（可选）
    durationSeconds: integer('duration_seconds').notNull().default(60), // 总时长 60/120
    aspectRatio: text('aspect_ratio').notNull().default('16:9'), // 16:9 / 9:16
    styleId: text('style_id').default('pixar-3d'), // 视觉风格ID
    customStyle: text('custom_style'), // 自定义风格描述（当styleId为custom时使用）

    // Gemini 生成的分镜数据
    scenesJson: text('scenes_json'), // 完整分镜JSON（备份用）
    storyTitle: text('story_title'), // Gemini生成的故事标题

    // 最终输出
    finalVideoUrl: text('final_video_url'), // 拼接后的完整视频URL

    // 积分
    creditsUsed: integer('credits_used').notNull().default(0), // 已消耗积分

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询用户的剧本列表
    index('idx_custom_script_user_status').on(table.userId, table.status),
    // 按创建时间排序
    index('idx_custom_script_created_at').on(table.createdAt),
  ]
);

/**
 * 自定义剧本分镜段落表
 * 存储每个分镜段落的详细信息，包括提示词、首帧图、视频等
 */
export const customScriptScene = pgTable(
  'custom_script_scene',
  {
    id: text('id').primaryKey(),
    scriptId: text('script_id')
      .notNull()
      .references(() => customScript.id, { onDelete: 'cascade' }),
    sceneNumber: integer('scene_number').notNull(), // 段落序号 1,2,3...

    // 提示词
    prompt: text('prompt').notNull(), // 该段落的完整提示词，用于视频生成（可编辑）
    firstFramePrompt: text('first_frame_prompt'), // 首帧图专用提示词（只描述第一个shot的静态画面）
    originalPrompt: text('original_prompt'), // Gemini生成的原始提示词（保留）
    description: text('description'), // 段落说明（中文，给用户看）
    descriptionEn: text('description_en'), // 段落说明（英文，给用户看）

    // 首帧图
    frameStatus: text('frame_status').notNull().default('pending'), // pending/generating/completed/failed
    frameImageUrl: text('frame_image_url'),
    frameTaskId: text('frame_task_id'), // Seedream任务ID

    // 视频
    videoStatus: text('video_status').notNull().default('pending'), // pending/generating/completed/failed
    videoUrl: text('video_url'),
    videoTaskId: text('video_task_id'), // Evolink Sora-2 任务ID

    // 生成进度（0-100）
    frameProgress: integer('frame_progress').default(0), // 首帧图生成进度
    videoProgress: integer('video_progress').default(0), // 视频生成进度

    // 错误日志
    errorLog: text('error_log'),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询某个剧本的所有分镜（按序号排序）
    index('idx_custom_script_scene_script_number').on(table.scriptId, table.sceneNumber),
  ]
);

// 自定义剧本关系定义
export const customScriptRelations = relations(customScript, ({ one, many }) => ({
  user: one(user, {
    fields: [customScript.userId],
    references: [user.id],
  }),
  scenes: many(customScriptScene),
}));

export const customScriptSceneRelations = relations(customScriptScene, ({ one }) => ({
  script: one(customScript, {
    fields: [customScriptScene.scriptId],
    references: [customScript.id],
  }),
}));

// ==================== Script Template Tables ====================
// 脚本模板表 - 用于存储管理员创建的视频模板（类似 dog-hero、cat-hero）
// 支持草稿和正式模板统一管理，通过 status 字段区分

/**
 * 脚本模板主表（含草稿）
 * 存储可复用的视频模板，用户可以选择模板后上传自己的宠物图片生成视频
 * status: draft=草稿, published=已发布, disabled=已禁用
 */
export const scriptTemplate = pgTable(
  'script_template',
  {
    id: text('id').primaryKey(),

    // 状态: draft=草稿, published=已发布, disabled=已禁用
    status: text('status').notNull().default('draft'),

    // 基本信息
    name: text('name').notNull().default(''), // 模板名称，如 "Christmas Dog Rescue"
    nameCn: text('name_cn'), // 中文名称
    description: text('description'), // 模板描述（英文）
    descriptionCn: text('description_cn'), // 模板描述（中文）
    thumbnailUrl: text('thumbnail_url'), // 封面图/预览图
    previewVideoUrl: text('preview_video_url'), // 预览视频URL（合成后的示例视频）

    // 分类和筛选
    category: text('category').notNull().default('dog'), // dog/cat/other
    tags: text('tags'), // JSON数组，用于标签筛选，如 ["christmas", "rescue", "heartwarming"]

    // 视频配置
    styleId: text('style_id').notNull().default('pixar-3d'), // 视觉风格ID
    globalStylePrefix: text('global_style_prefix'), // 全局风格前缀（视觉风格 + 角色一致性描述模板）
    // 角色定义 JSON 数组
    // 格式: [{ id, role, name, nameCn, description, descriptionCn }]
    // - id: 角色标识符，如 "pet", "owner", "firefighter"
    // - role: "primary" | "secondary"
    // - name: 英文名称，如 "Hero Cat"
    // - nameCn: 中文名称，如 "英雄猫咪"
    // - description: 英文详细描述（用于提示词生成）
    // - descriptionCn: 中文详细描述（用于展示）
    charactersJson: text('characters_json'), // 角色定义数组
    characterSheetUrl: text('character_sheet_url'), // 角色参考卡图片URL
    durationSeconds: integer('duration_seconds').notNull().default(60), // 总时长 60/120
    aspectRatio: text('aspect_ratio').notNull().default('16:9'), // 16:9 / 9:16
    musicPrompt: text('music_prompt'), // 配乐提示词

    // 分镜模板数据
    // 草稿状态: { scenes: [{ id, sceneNumber, characterIds, prompt, firstFramePrompt, description, descriptionEn, frameStatus, frameImageUrl, videoStatus, videoUrl }] }
    // 发布状态: { scenes: [{ sceneNumber, characterIds, prompt, firstFramePrompt, description, descriptionEn }] }
    // - characterIds: 该场景首帧图中应出现的角色ID数组，如 ["pet", "owner"]
    scenesJson: text('scenes_json'),

    // 草稿专用字段
    petImageUrl: text('pet_image_url'), // 测试用宠物图片
    mergedVideoUrl: text('merged_video_url'), // 草稿合并后的预览视频

    // 排序（发布后有效）
    sortOrder: integer('sort_order').notNull().default(0), // 排序（越小越靠前）

    // 统计（发布后有效）
    useCount: integer('use_count').notNull().default(0), // 使用次数

    // 积分定价（可选，默认使用全局配置）
    creditsRequired: integer('credits_required'), // 使用此模板所需积分（null则使用默认）

    // 创建者信息
    createdBy: text('created_by')
      .references(() => user.id, { onDelete: 'set null' }), // 创建者（管理员）

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询已发布的模板列表（按分类和排序）
    index('idx_script_template_status_category').on(table.status, table.category, table.sortOrder),
    // 查询创建者的草稿列表
    index('idx_script_template_created_by_status').on(table.createdBy, table.status),
    // 按创建时间排序
    index('idx_script_template_created_at').on(table.createdAt),
  ]
);

// 脚本模板关系定义
export const scriptTemplateRelations = relations(scriptTemplate, ({ one }) => ({
  creator: one(user, {
    fields: [scriptTemplate.createdBy],
    references: [user.id],
  }),
}));

// ==================== Pet Memorial Tables ====================
// 宠物纪念表 - 用于存储用户为逝去爱宠创建的纪念页面

/**
 * 宠物纪念主表
 * 存储用户创建的宠物纪念信息，包括宠物资料、纪念内容、图片等
 * 支持公开展示和视频生成功能
 */
export const petMemorial = pgTable(
  'pet_memorial',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // 宠物信息
    petName: text('pet_name').notNull(), // 宠物名字
    species: text('species'), // 物种: dog/cat/bird/rabbit/hamster/other
    birthday: timestamp('birthday'), // 出生日期
    dateOfPassing: timestamp('date_of_passing'), // 去世日期

    // 纪念内容
    message: text('message'), // 纪念留言（简短，卡片展示用）
    story: text('story'), // 宠物故事（详细，详情页展示）
    images: text('images').notNull().default('[]'), // JSON数组，存储图片URL，最多6张

    // 主人信息（可选展示）
    ownerFirstName: text('owner_first_name'),
    ownerLastName: text('owner_last_name'),
    city: text('city'),
    state: text('state'),
    email: text('email'), // 主人邮箱（用于蜡烛通知）
    isNameDisplayed: boolean('is_name_displayed').notNull().default(true), // 是否展示主人姓名

    // 关联视频（一对一，可选）
    aiTaskId: text('ai_task_id').references(() => aiTask.id, { onDelete: 'set null' }),

    // 状态管理
    status: text('status').notNull().default('approved'), // pending/approved/rejected
    isPublic: boolean('is_public').notNull().default(true), // 是否公开展示

    // 统计字段（冗余，提升查询性能）
    viewCount: integer('view_count').notNull().default(0),
    candleCount: integer('candle_count').notNull().default(0), // 蜡烛数量，应用层维护

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'), // 软删除
  },
  (table) => [
    // 查询用户的纪念列表
    index('idx_pet_memorial_user_id').on(table.userId),
    // 公开纪念墙列表（按创建时间倒序）
    index('idx_pet_memorial_public_list').on(
      table.isPublic,
      table.status,
      table.createdAt
    ),
    // 关联视频查询
    index('idx_pet_memorial_ai_task').on(table.aiTaskId),
    // 搜索优化：宠物名索引（用于模糊搜索）
    index('idx_pet_memorial_pet_name').on(table.petName),
    // 搜索优化：主人名索引（用于模糊搜索）
    index('idx_pet_memorial_owner_name').on(table.ownerFirstName, table.ownerLastName),
  ]
);

/**
 * 宠物纪念蜡烛表
 * 记录访客为纪念"点蜡烛"并留言的信息
 * 支持登录用户和匿名访客
 */
export const petMemorialCandle = pgTable(
  'pet_memorial_candle',
  {
    id: text('id').primaryKey(),
    memorialId: text('memorial_id')
      .notNull()
      .references(() => petMemorial.id, { onDelete: 'cascade' }),

    // 点蜡烛人信息（登录用户 或 匿名访客）
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // 登录用户
    guestName: text('guest_name'), // 匿名访客姓名
    guestEmail: text('guest_email'), // 匿名访客邮箱（可选，用于通知）

    // 留言
    message: text('message'),

    // 审核状态（防止恶意内容）
    isPublished: boolean('is_published').notNull().default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 查询某个纪念的蜡烛列表（按时间倒序）
    index('idx_candle_memorial_list').on(table.memorialId, table.createdAt),
    // 查询用户点过的蜡烛
    index('idx_candle_user').on(table.userId),
  ]
);

// 宠物纪念关系定义
export const petMemorialRelations = relations(petMemorial, ({ one, many }) => ({
  // 关联创建者
  user: one(user, {
    fields: [petMemorial.userId],
    references: [user.id],
  }),
  // 关联AI任务（视频）
  aiTask: one(aiTask, {
    fields: [petMemorial.aiTaskId],
    references: [aiTask.id],
  }),
  // 关联蜡烛列表
  candles: many(petMemorialCandle),
}));

export const petMemorialCandleRelations = relations(
  petMemorialCandle,
  ({ one }) => ({
    // 关联纪念
    memorial: one(petMemorial, {
      fields: [petMemorialCandle.memorialId],
      references: [petMemorial.id],
    }),
    // 关联登录用户（可选）
    user: one(user, {
      fields: [petMemorialCandle.userId],
      references: [user.id],
    }),
  })
);

// 宠物纪念类型导出
export type PetMemorial = typeof petMemorial.$inferSelect;
export type NewPetMemorial = typeof petMemorial.$inferInsert;
export type PetMemorialCandle = typeof petMemorialCandle.$inferSelect;
export type NewPetMemorialCandle = typeof petMemorialCandle.$inferInsert;

