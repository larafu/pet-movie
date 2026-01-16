/**
 * 创建超级管理员用户脚本
 *
 * 用法:
 *   npx tsx scripts/create-admin.ts --email=admin@example.com --password=yourpassword --name="Admin Name"
 */

import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

import { db } from '@/core/db';
import { user, account, userRole, role } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

async function createAdmin() {
  // 从命令行参数获取配置
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const passwordArg = args.find((arg) => arg.startsWith('--password='));
  const nameArg = args.find((arg) => arg.startsWith('--name='));

  const email = emailArg?.split('=')[1] || 'linghanju0720@gmail.com';
  const password = passwordArg?.split('=')[1] || '07200720';
  const name = nameArg?.split('=')[1] || 'Super Admin';

  console.log(`🚀 创建超级管理员用户...`);
  console.log(`   邮箱: ${email}`);
  console.log(`   名称: ${name}\n`);

  try {
    // 1. 检查用户是否已存在
    const [existingUser] = await db()
      .select()
      .from(user)
      .where(eq(user.email, email));

    let userId: string;

    if (existingUser) {
      console.log(`⚠️  用户已存在: ${email}`);
      userId = existingUser.id;
    } else {
      // 2. 创建用户
      userId = getUuid();
      await db().insert(user).values({
        id: userId,
        name,
        email,
        emailVerified: true,
      });
      console.log(`✓ 创建用户成功`);
    }

    // 3. 检查是否已有凭证账户
    const [existingAccount] = await db()
      .select()
      .from(account)
      .where(eq(account.userId, userId));

    if (existingAccount && existingAccount.providerId === 'credential') {
      // 更新密码
      const hashedPassword = await hash(password, 10);
      await db()
        .update(account)
        .set({ password: hashedPassword })
        .where(eq(account.id, existingAccount.id));
      console.log(`✓ 更新密码成功`);
    } else if (!existingAccount) {
      // 创建凭证账户
      const hashedPassword = await hash(password, 10);
      await db().insert(account).values({
        id: getUuid(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
      });
      console.log(`✓ 创建凭证账户成功`);
    }

    // 4. 获取 super_admin 角色
    const [superAdminRole] = await db()
      .select()
      .from(role)
      .where(eq(role.name, 'super_admin'));

    if (!superAdminRole) {
      console.log(`⚠️  super_admin 角色不存在，请先运行: pnpm rbac:init`);
      process.exit(1);
    }

    // 5. 检查用户是否已有此角色
    const [existingUserRole] = await db()
      .select()
      .from(userRole)
      .where(eq(userRole.userId, userId));

    if (existingUserRole && existingUserRole.roleId === superAdminRole.id) {
      console.log(`ℹ️  用户已拥有 super_admin 角色`);
    } else if (!existingUserRole) {
      // 分配角色
      await db().insert(userRole).values({
        id: getUuid(),
        userId,
        roleId: superAdminRole.id,
      });
      console.log(`✓ 分配 super_admin 角色成功`);
    }

    console.log(`\n✅ 超级管理员创建完成!`);
    console.log(`\n📊 账户信息:`);
    console.log(`   邮箱: ${email}`);
    console.log(`   密码: ${password}`);
    console.log(`   角色: super_admin`);
    console.log(`\n💡 现在可以使用此账户登录系统管理后台。`);
  } catch (error) {
    console.error('\n❌ 创建失败:', error);
    process.exit(1);
  }
}

// 运行脚本
createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
