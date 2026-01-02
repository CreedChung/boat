/**
 * 启动脚本
 * 
 * 功能说明：
 * - 服务器启动入口
 * - 环境检查
 * - 错误处理
 * 
 * 作者：RealFlow API Team
 * 版本：1.0.0
 */

require('dotenv').config();
const app = require('../src/server');

// 检查必需的环境变量
function checkEnvironment() {
    const required = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ 缺少必需的环境变量:');
        missing.forEach(key => {
            console.error(`   - ${key}`);
        });
        console.error('\n请检查 .env 文件配置');
        process.exit(1);
    }
}

// 主函数
function main() {
    console.log('🚀 RealFlow API 启动程序');
    console.log('==========================================');
    console.log(`📍 工作目录: ${process.cwd()}`);
    console.log(`📦 Node.js版本: ${process.version}`);
    console.log(`🗄️  数据库: ${process.env.DB_DATABASE}`);
    console.log(`🖥️  服务器: ${process.env.DB_SERVER}`);
    console.log('==========================================\n');
    
    // 检查环境配置
    checkEnvironment();
    
    console.log('✅ 环境配置检查完成');
    console.log('✅ 应用程序启动完成');
}

// 启动应用
main();

// 导出用于测试
module.exports = app;