/**
 * SQL查询定义
 * 
 * 功能说明：
 * - 定义所有SQL查询语句
 * - 参数化查询防止SQL注入
 * - 查询优化
 * 
 * 作者：RealFlow API Team
 * 版本：1.0.0
 */

const sql = require('mssql');

class DatabaseQueries {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    /**
     * 获取所有realflow数据（COMID = 98）
     */
    getAllData() {
        return new Promise((resolve, reject) => {
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

            this.db.getPool().request().query(query)
                .then(result => {
                    resolve({
                        success: true,
                        data: result.recordset,
                        count: result.recordset.length
                    });
                })
                .catch(error => {
                    console.error('❌ 查询所有数据失败:', error.message);
                    reject({
                        success: false,
                        message: '查询数据失败',
                        error: error.message
                    });
                });
        });
    }

    /**
     * 获取单条realflow数据（COMID = 98）
     * @param {number} recordId - 记录序号
     */
    getSingleData(recordId) {
        return new Promise((resolve, reject) => {
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

            this.db.getPool().request()
                .input('id', sql.Int, recordId)
                .query(query)
                .then(result => {
                    if (result.recordset.length === 0) {
                        resolve({
                            success: false,
                            message: '未找到指定记录',
                            recordId: recordId
                        });
                    } else {
                        resolve({
                            success: true,
                            data: result.recordset[0]
                        });
                    }
                })
                .catch(error => {
                    console.error(`❌ 查询单条记录失败 (ID: ${recordId}):`, error.message);
                    reject({
                        success: false,
                        message: '查询单条记录失败',
                        error: error.message,
                        recordId: recordId
                    });
                });
        });
    }
}

module.exports = DatabaseQueries;