const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// SQL Server 配置
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
    }
};

// 创建连接池
let pool = null;

// 连接数据库
async function connectDatabase() {
    try {
        pool = await sql.connect(config);
        console.log('成功连接到SQL Server数据库');
    } catch (error) {
        console.error('数据库连接失败:', error.message);
        process.exit(1);
    }
}

// API 路由 - 获取realflow5m数据（COMID = 98）
app.get('/api/realflow-data', async (req, res) => {
    try {
        if (!pool) {
            await connectDatabase();
        }

        const query = `
            SELECT 
                [序号],
                [开始时间],
                [结束时间],
                [存盘时间],
                [航次],
                [船名],
                [呼号],
                [油品名],
                [温度],
                [密度],
                [瞬时流量],
                [瞬时质量],
                [累计流量],
                [累计质量]
            FROM [dbo].[realflow5m]
            WHERE [COMID] = 98
            ORDER BY [序号] DESC
        `;

        const result = await pool.request().query(query);
        
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        console.error('查询数据失败:', error.message);
        res.status(500).json({
            success: false,
            message: '查询数据失败',
            error: error.message
        });
    }
});

// 获取单条记录
app.get('/api/realflow-data/:id', async (req, res) => {
    try {
        if (!pool) {
            await connectDatabase();
        }

        const id = req.params.id;
        const query = `
            SELECT 
                [序号],
                [开始时间],
                [结束时间],
                [存盘时间],
                [航次],
                [船名],
                [呼号],
                [油品名],
                [温度],
                [密度],
                [瞬时流量],
                [瞬时质量],
                [累计流量],
                [累计质量]
            FROM [dbo].[realflow5m]
            WHERE [序号] = @id AND [COMID] = 98
        `;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '未找到指定记录'
            });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('查询单条记录失败:', error.message);
        res.status(500).json({
            success: false,
            message: '查询单条记录失败',
            error: error.message
        });
    }
});

// 根路由
app.get('/', (req, res) => {
    res.json({
        message: 'RealFlow API服务',
        version: '1.0.0',
        endpoints: {
            'GET /api/realflow-data': '获取所有COMID=98的数据',
            'GET /api/realflow-data/:id': '获取指定序号的单条记录'
        }
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`访问 http://localhost:${PORT} 查看API信息`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    if (pool) {
        pool.close().catch(err => {
            console.error('关闭数据库连接失败:', err.message);
        });
    }
    process.exit(0);
});

module.exports = app;