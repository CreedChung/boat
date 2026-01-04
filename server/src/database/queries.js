/**
 * SQL查询定义
 * 
 * 功能说明：
 * - 定义所有SQL查询语句
 * - 参数化查询防止SQL注入
 * - 查询优化
 * 
 * 版本：1.0.0
 */

// sql module imported but not currently used since we removed getAllData() and getSingleData()
// const sql = require('mssql');

class DatabaseQueries {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    /**
     * 获取处理后的船舶数据（智能处理开始时间和结束时间占位符）
     * 逻辑说明：
     * - 当开始时间存在，结束时间为占位符时，表示作业开始
     * - 当开始时间为占位符，结束时间存在时，表示作业结束
     * - 通过配对这两个记录来确定完整的作业时间段
     */
    getProcessedShipData() {
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
                ORDER BY [序号] ASC
            `;

            this.db.getPool().request().query(query)
                .then(result => {
                    const records = result.recordset;
                    const processedData = this.processTimeSlots(records);

                    resolve({
                        success: true,
                        data: processedData,
                        count: processedData.length,
                        totalRecords: records.length
                    });
                })
                .catch(error => {
                    console.error('❌ 查询处理后数据失败:', error.message);
                    reject({
                        success: false,
                        message: '查询处理后数据失败',
                        error: error.message
                    });
                });
        });
    }

    /**
     * 处理时间段数据，将占位符配对成完整的作业记录
     * @param {Array} records - 原始数据记录
     * @returns {Array} 处理后的数据
     */
    processTimeSlots(records) {
        const processedRecords = [];
        const pendingRecords = []; // 待配对的记录

        for (const record of records) {
            const startTime = record['开始时间'];
            const endTime = record['结束时间'];

            // 调试输出
            console.log(`🔍 检查记录 ${record['序号']}: 开始="${startTime}", 结束="${endTime}"`);

            // 判断是否为占位符（占位符格式为10根横线 "----------"）
            const isStartPlaceholder = !startTime || startTime === '' || startTime === '----------';
            const isEndPlaceholder = !endTime || endTime === '' || endTime === '----------';

            console.log(`🔍 占位符判断: 开始=${isStartPlaceholder}, 结束=${isEndPlaceholder}`);

            if (!isStartPlaceholder && isEndPlaceholder) {
                // 作业开始记录 - 结束时间是占位符
                console.log(`✅ 识别为开始记录，加入待配对队列 - 序号: ${record['序号']}`);
                pendingRecords.push({
                    ...record,
                    status: 'started',
                    startTime: startTime
                });
            } else if (isStartPlaceholder && !isEndPlaceholder) {
                // 作业结束记录 - 开始时间是占位符
                console.log(`✅ 识别为结束记录，尝试配对 - 序号: ${record['序号']}`);
                // 寻找对应的开始记录
                const matchingStartIndex = pendingRecords.findIndex(pending =>
                    pending['航次'] === record['航次'] &&
                    pending['船名'] === record['船名'] &&
                    pending.status === 'started'
                );

                if (matchingStartIndex !== -1) {
                    const startRecord = pendingRecords[matchingStartIndex];
                    console.log(`🎉 配对成功! 开始记录序号: ${startRecord['序号']}, 结束记录序号: ${record['序号']}`);
                    // 创建完整的作业记录
                    const processedRecord = {
                        序号: startRecord['序号'],
                        开始时间: startRecord.startTime,
                        结束时间: endTime,
                        存盘时间: record['存盘时间'],
                        航次: record['航次'],
                        船名: record['船名'],
                        呼号: record['呼号'],
                        油品名: record['油品名'],
                        温度: record['温度'],
                        密度: record['密度'],
                        瞬时流量: record['瞬时流量'],
                        瞬时质量: record['瞬时质量'],
                        累计流量: record['累计流量'],
                        累计质量: record['累计质量'],
                        status: 'completed',
                        duration: this.calculateDuration(startRecord.startTime, endTime)
                    };

                    processedRecords.push(processedRecord);
                    // 移除已配对的记录
                    pendingRecords.splice(matchingStartIndex, 1);
                } else {
                    // 未找到匹配的开始记录，可能是异常数据
                    console.warn(`⚠️  找到结束记录但未找到匹配的开始记录 - 序号: ${record['序号']}, 航次: ${record['航次']}`);
                }
            } else {
                // 跳过所有其他记录（原始完整记录、中间过程记录、异常记录）
                // 只保留配对成功的记录
                console.log(`ℹ️  跳过记录 - 序号: ${record['序号']} (开始时间: ${startTime}, 结束时间: ${endTime})`);
            }
        }

        // 注意：不返回未配对的记录，只返回成功配对的完整记录

        return processedRecords;
    }

    /**
     * 计算时间持续时长
     * @param {string|Date} startTime - 开始时间
     * @param {string|Date} endTime - 结束时间
     * @returns {string} 持续时长（小时:分钟:秒）
     */
    calculateDuration(startTime, endTime) {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const diffMs = end - start;

            if (diffMs <= 0) return '00:00:00';

            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            return `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`;
        } catch (error) {
            console.warn('⚠️  计算持续时长失败:', error.message);
            return null;
        }
    }
}

module.exports = DatabaseQueries;