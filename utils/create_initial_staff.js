#!/usr/bin/env node

/**
 * 一次性脚本：创建初始员工账号
 * 使用方法：node utils/create_initial_staff.js
 */

const { pool, testConnection } = require('../config/database');
const { hashPassword } = require('./password.util');

// 初始员工数据
const initialStaff = [
  {
    username: 'admin01',
    password: 'Nantou2025',
    role: 'admin'
  },
  {
    username: 'staff01',
    password: 'Nantou2025',
    role: 'staff'
  },
  {
    username: 'mk01',
    password: 'Nantou2025',
    role: 'matchmaker'
  }
];

async function createInitialStaff() {
  console.log('🚀 开始创建初始员工账号...\n');

  try {
    // 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 无法连接到数据库，请检查配置');
      process.exit(1);
    }

    // 检查staff_users表是否存在
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'staff_users'
    `);

    if (tables.length === 0) {
      console.error('❌ staff_users表不存在，请先运行数据库迁移脚本');
      process.exit(1);
    }

    console.log('✅ 数据库连接正常，开始创建账号...\n');

    // 创建员工账号
    for (const staff of initialStaff) {
      try {
        // 检查用户是否已存在
        const [existingUsers] = await pool.execute(
          'SELECT id FROM staff_users WHERE username = ?',
          [staff.username]
        );

        if (existingUsers.length > 0) {
          console.log(`⚠️  用户 ${staff.username} 已存在，跳过创建`);
          continue;
        }

        // 加密密码
        const hashedPassword = await hashPassword(staff.password);

        // 插入新用户
        await pool.execute(
          'INSERT INTO staff_users (username, password, role) VALUES (?, ?, ?)',
          [staff.username, hashedPassword, staff.role]
        );

        console.log(`✅ 成功创建 ${staff.role} 账号: ${staff.username}`);
      } catch (error) {
        console.error(`❌ 创建账号 ${staff.username} 失败:`, error.message);
      }
    }

    console.log('\n🎉 初始员工账号创建完成！');
    console.log('\n📋 创建的账号信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    initialStaff.forEach(staff => {
      console.log(`👤 用户名: ${staff.username}`);
      console.log(`🔑 密码: ${staff.password}`);
      console.log(`👨‍💼 角色: ${staff.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    console.log('\n⚠️  安全提醒:');
    console.log('1. 请在生产环境中立即修改这些默认密码');
    console.log('2. 建议启用双因素认证');
    console.log('3. 定期更换密码');

  } catch (error) {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createInitialStaff().catch(error => {
    console.error('❌ 脚本执行出错:', error);
    process.exit(1);
  });
}

module.exports = { createInitialStaff }; 