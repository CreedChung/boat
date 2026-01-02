/**
 * 数据库配置
 * 
 * 功能说明：
 * - 数据库连接参数
 * - 连接池配置
 * - 环境变量验证
 * 
 * 作者：RealFlow API Team
 * 版本：1.0.0
 */

class DatabaseConfig {
    /**
     * 获取数据库连接配置
     */
    static getConfig() {
        return {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: process.env.DB_ENCRYPT === 'true',
                trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
            },
            pool: {
                max: parseInt(process.env.DB_POOL_MAX) || 10,
                min: parseInt(process.env.DB_POOL_MIN) || 0,
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
            }
        };
    }

    /**
     * 验证必需的配置参数
     */
    static validate() {
        const required = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
        }
        
        return true;
    }

    /**
     * 获取连接字符串（用于日志）
     */
    static getConnectionString() {
        const config = this.getConfig();
        return `mssql://${config.user}:***@${config.server}/${config.database}`;
    }
}

module.exports = DatabaseConfig;