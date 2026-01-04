/**
 * RealFlow API Server - 主服务器
 * 
 * 功能说明：
 * - Express.js Web服务器
 * - SQL Server 2016数据查询
 * - RESTful API接口
 * 
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 导入数据库模块
const dbConnection = require('./database/connection');
const DatabaseQueries = require('./database/queries');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库查询
const dbQueries = new DatabaseQueries(dbConnection);

// 中间件配置
app.use(cors());
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// API路由定义
// ============================================================================

/**
 * API根路径 - 返回服务信息
 */
app.get('/', (req, res) => {
    res.json({
        service: 'RealFlow API',
        version: '1.0.0',
        nodeVersion: process.version,
        description: 'SQL Server 2016 RealFlow数据查询服务',
        endpoints: {
            'GET /': '服务信息',
            'GET /health': '健康检查',
            'GET /api/realflow-processed': '获取智能处理后的船舶数据（配对开始/结束时间占位符）'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * 健康检查接口
 */
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'OK',
        service: 'RealFlow API',
        version: '1.0.0',
        nodeVersion: process.version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbConnection.isConnected() ? '已连接' : '未连接'
    };
    
    res.json(healthStatus);
});

/**
 * 获取智能处理后的船舶数据
 * 该接口会智能处理开始时间和结束时间的占位符，将它们配对成完整的作业记录
 */
app.get('/api/realflow-processed', (req, res) => {
    // 确保数据库连接
    if (!dbConnection.isConnected()) {
        dbConnection.connect()
            .then(() => executeQuery())
            .catch(error => {
                res.status(500).json({
                    success: false,
                    message: '数据库连接失败',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });
    } else {
        executeQuery();
    }

    function executeQuery() {
        dbQueries.getProcessedShipData()
            .then(result => {
                console.log(`✅ 智能处理查询成功，返回 ${result.count} 条处理后的记录（共 ${result.totalRecords} 条原始记录）`);
                res.json({
                    success: true,
                    data: result.data,
                    count: result.count,
                    totalRecords: result.totalRecords,
                    description: '智能处理后的船舶数据，已配对开始/结束时间占位符',
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                res.status(500).json({
                    success: false,
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            });
    }
});

// ============================================================================
// 错误处理中间件
// ============================================================================

/**
 * 404错误处理
 */
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

/**
 * 全局错误处理中间件
 */
app.use((error, req, res, next) => {
    console.error('❌ 全局错误:', error);
    
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// 服务器启动
// ============================================================================

const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 RealFlow API服务器启动成功');
    console.log('==========================================');
    console.log(`📡 服务地址: http://localhost:${PORT}`);
    console.log(`📊 Node.js版本: ${process.version}`);
    console.log('==========================================');
    console.log('');
    console.log('📋 可用接口:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/realflow-processed`);
    console.log('');
});

// ============================================================================
// 优雅关闭处理
// ============================================================================

/**
 * 处理进程信号
 */
function gracefulShutdown(signal) {
    console.log(`\n📴 收到${signal}信号，开始优雅关闭...`);
    
    // 关闭数据库连接
    dbConnection.close().then(() => {
        // 关闭HTTP服务器
        server.close(() => {
            console.log('✅ HTTP服务器已关闭');
            process.exit(0);
        });
        
        // 强制退出（超时保护）
        setTimeout(() => {
            console.error('❌ 强制退出');
            process.exit(1);
        }, 10000);
    });
}

// 监听进程信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = app;