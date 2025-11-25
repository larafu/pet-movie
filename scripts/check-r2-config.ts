#!/usr/bin/env tsx

/**
 * Check R2 Configuration in Database
 *
 * Usage:
 *   pnpm tsx scripts/check-r2-config.ts
 */

import { db } from '@/core/db';
import { config } from '@/config/db/schema';
import { eq, like } from 'drizzle-orm';

async function checkR2Config() {
  console.log('🔍 Checking R2 Configuration...\n');

  try {
    // Query all R2 related configs
    const r2Configs = await db()
      .select()
      .from(config)
      .where(like(config.name, 'r2_%'))
      .orderBy(config.name);

    if (r2Configs.length === 0) {
      console.log('❌ No R2 configuration found in database\n');
      console.log('💡 Run the following SQL to add R2 config:');
      console.log(`
INSERT INTO config (name, value) VALUES
  ('r2_account_id', 'ebeefca6e5c0795915274bfa4215912e'),
  ('r2_access_key', '843c9bb78c5accbce7d473214b96eb28'),
  ('r2_secret_key', '2c14a564fce698f9c4f21358abb3ba0bef2a7715d7219af7d526fe97fdb43139'),
  ('r2_bucket_name', 'pet-movie-media'),
  ('r2_domain', 'https://media.petmovie.ai')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
      `);
      process.exit(1);
    }

    console.log('✅ R2 Configuration found:\n');
    console.log('┌─────────────────────┬──────────────────────────────────────────────┐');
    console.log('│ Name                │ Value                                        │');
    console.log('├─────────────────────┼──────────────────────────────────────────────┤');

    r2Configs.forEach((cfg) => {
      const name = cfg.name.padEnd(19);
      let value = cfg.value || '';

      // Mask sensitive values
      if (cfg.name === 'r2_secret_key') {
        value = value.substring(0, 8) + '...' + value.substring(value.length - 8);
      } else if (cfg.name === 'r2_access_key') {
        value = value.substring(0, 8) + '...' + value.substring(value.length - 8);
      }

      value = value.padEnd(44);
      console.log(`│ ${name} │ ${value} │`);
    });

    console.log('└─────────────────────┴──────────────────────────────────────────────┘\n');

    // Check required fields
    const requiredFields = ['r2_account_id', 'r2_access_key', 'r2_secret_key', 'r2_bucket_name', 'r2_domain'];
    const configNames = r2Configs.map((c) => c.name);
    const missingFields = requiredFields.filter((field) => !configNames.includes(field));

    if (missingFields.length > 0) {
      console.log('⚠️  Missing required fields:');
      missingFields.forEach((field) => console.log(`   - ${field}`));
      console.log('');
      process.exit(1);
    }

    console.log('✅ All required R2 fields are configured!\n');

    // Test R2 Provider initialization
    console.log('🧪 Testing R2 Provider initialization...\n');

    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const providerNames = storageService.getProviderNames();

    if (providerNames.includes('r2')) {
      console.log('✅ R2 Provider initialized successfully!');
      console.log(`   Available providers: ${providerNames.join(', ')}\n`);
    } else {
      console.log('❌ R2 Provider not initialized');
      console.log(`   Available providers: ${providerNames.join(', ')}\n`);
      process.exit(1);
    }

    console.log('🎉 R2 configuration is ready to use!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking R2 config:', error);
    process.exit(1);
  }
}

checkR2Config();
