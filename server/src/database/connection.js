/**
 * 数据库连接配置
 * 
 * 功能说明：
 * - SQL Server 2016连接配置
 * - 连接池管理
 * - 优雅关闭机制
 * 
 * 作者：RealFlow API Team
 * 版本：1.0.0
 */

const sql = require('mssql');

class DatabaseConnection {
    constructor() {
        this.pool = null;
        this.isConnecting = false;
    }

    /**
     * 获取数据库配置
     */
    getConfig() {
        return {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        };
    }

    /**
     * 连接到SQL Server数据库
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (this.pool) {
                console.log('✅ 数据库连接已存在');
                resolve(this.pool);
                return;
            }

            if (this.isConnecting) {
                console.log('⏳ 正在连接数据库...');
                // 等待现有连接完成
                const checkConnection = setInterval(() => {
                    if (this.pool) {
                        clearInterval(checkConnection);
                        resolve(this.pool);
                    }
                }, 100);
                return;
            }

            this.isConnecting = true;
            console.log('🔄 正在连接到SQL Server数据库...');

            sql.connect(this.getConfig())
                .then(pool => {
                    this.pool = pool;
                    this.isConnecting = false;
                    console.log('✅ SQL Server数据库连接成功');
                    resolve(pool);
                })
                .catch(error => {
                    this.isConnecting = false;
                    console.error('❌ SQL Server数据库连接失败:', error.message);
                    reject(error);
                });
        });
    }

    /**
     * 获取连接池
     */
    getPool() {
        return this.pool;
    }

    /**
     * 检查连接状态
     */
    isConnected() {
        return this.pool !== null;
    }

    /**
     * 关闭数据库连接
     */
    close() {
        return new Promise((resolve) => {
            if (this.pool) {
                this.pool.close()
                    .then(() => {
                        console.log('✅ 数据库连接已安全关闭');
                        this.pool = null;
                        resolve();
                    })
                    .catch(error => {
                        console.error('❌ 关闭数据库连接失败:', error.message);
                        this.pool = null;
                        resolve();
                    });
            } else {
                console.log('ℹ️  数据库连接不存在');
                resolve();
            }
        });
    }
}

// 单例模式
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;