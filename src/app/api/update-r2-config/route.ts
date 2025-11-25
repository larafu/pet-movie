/**
 * Update R2 Configuration
 * POST /api/update-r2-config
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/db';
import { config } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessKeyId, secretAccessKey, accountId, bucketName, publicDomain } = body;

    const database = db();

    // 更新配置
    const updates = [
      { name: 'r2_access_key', value: accessKeyId },
      { name: 'r2_secret_key', value: secretAccessKey },
      { name: 'r2_account_id', value: accountId },
      { name: 'r2_bucket_name', value: bucketName },
      { name: 'r2_domain', value: publicDomain },
    ];

    for (const { name, value } of updates) {
      if (value) {
        // 尝试更新，如果不存在则插入
        const existing = await database
          .select()
          .from(config)
          .where(eq(config.name, name))
          .limit(1);

        if (existing.length > 0) {
          await database
            .update(config)
            .set({ value, updatedAt: new Date() })
            .where(eq(config.name, name));
        } else {
          await database.insert(config).values({
            name,
            value,
            category: 'storage',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'R2 配置已更新'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
