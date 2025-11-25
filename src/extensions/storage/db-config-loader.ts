/**
 * Load storage provider configuration from database
 */

import { db } from '@/core/db';
import { config as configTable } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { R2Provider, type R2Configs } from './r2';

/**
 * Load R2 configuration from database and create provider instance
 */
export async function createR2ProviderFromDb(): Promise<R2Provider> {
  const database = db();

  // Fetch all R2 configs in parallel
  const [accountIdRow, accessKeyRow, secretKeyRow, bucketRow, domainRow] =
    await Promise.all([
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_account_id'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_access_key'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_secret_key'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_bucket_name'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_domain'))
        .limit(1),
    ]);

  const accountId = accountIdRow[0]?.value;
  const accessKeyId = accessKeyRow[0]?.value;
  const secretAccessKey = secretKeyRow[0]?.value;
  const bucket = bucketRow[0]?.value;
  const publicDomain = domainRow[0]?.value;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicDomain
  ) {
    throw new Error(
      'R2 storage configuration incomplete in database. Required keys: r2_account_id, r2_access_key, r2_secret_key, r2_bucket_name, r2_domain'
    );
  }

  const configs: R2Configs = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicDomain,
    region: 'auto',
  };

  return new R2Provider(configs);
}
