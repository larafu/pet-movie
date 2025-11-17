/**
 * Crisp Customer Service Initialization Script
 *
 * This script initializes Crisp customer service configuration in the database.
 *
 * Usage:
 *   npx tsx scripts/init-crisp.ts
 */

import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { config } from '@/config/db/schema';

// Crisp 配置
const CRISP_WEBSITE_ID = 'f60d926d-8f84-4c73-a9a0-26ee2a42ac25';

async function initializeCrisp() {
  console.log('🚀 Starting Crisp customer service initialization...\n');

  try {
    // 1. 启用 Crisp
    console.log('📝 Configuring Crisp settings...');

    // 检查 crisp_enabled 是否已存在
    const [existingEnabled] = await db()
      .select()
      .from(config)
      .where(eq(config.name, 'crisp_enabled'));

    if (existingEnabled) {
      // 更新现有配置
      await db()
        .update(config)
        .set({ value: 'true' })
        .where(eq(config.name, 'crisp_enabled'));
      console.log('   ✓ Updated crisp_enabled: true');
    } else {
      // 插入新配置
      await db().insert(config).values({
        name: 'crisp_enabled',
        value: 'true',
      });
      console.log('   ✓ Created crisp_enabled: true');
    }

    // 2. 设置 Website ID
    const [existingWebsiteId] = await db()
      .select()
      .from(config)
      .where(eq(config.name, 'crisp_website_id'));

    if (existingWebsiteId) {
      // 更新现有配置
      await db()
        .update(config)
        .set({ value: CRISP_WEBSITE_ID })
        .where(eq(config.name, 'crisp_website_id'));
      console.log(`   ✓ Updated crisp_website_id: ${CRISP_WEBSITE_ID}`);
    } else {
      // 插入新配置
      await db().insert(config).values({
        name: 'crisp_website_id',
        value: CRISP_WEBSITE_ID,
      });
      console.log(`   ✓ Created crisp_website_id: ${CRISP_WEBSITE_ID}`);
    }

    console.log('\n✅ Crisp customer service configuration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - crisp_enabled: true');
    console.log(`   - crisp_website_id: ${CRISP_WEBSITE_ID}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Restart your development server: pnpm dev');
    console.log('   2. Visit any page on your site');
    console.log('   3. You should see the Crisp chat widget in the bottom-right corner');
    console.log(
      '   4. Log in to Crisp dashboard to configure chat settings and responses\n'
    );
  } catch (error) {
    console.error('\n❌ Error during Crisp initialization:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeCrisp()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
