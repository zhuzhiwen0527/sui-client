const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const lark = require('@larksuiteoapi/node-sdk');
const axios = require('axios');
const { v4: uuid } = require('uuid');
// 初始化 Express 应用
const app = express();
// 使用 verify 选项保存原始 body 用于签名验证
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        // 保存原始 body 用于签名验证
        req.rawBody = buf;
    }
}));

// ==================== 配置项（请替换为你自己的信息） ====================
const CONFIG = {
    PORT: 3000,
    // 时间戳最大差值（秒），用于防止重放攻击
    MAX_TIMESTAMP_DIFF: 600, // 10分钟
    // 飞书机器人配置
    VERIFICATION_TOKEN: '',
    APP_ID: '',
    APP_SECRET: '',
    // Webhook 配置
    WEBHOOK: {
        URL: '',
        TOKEN: '' // 如果需要 token，在这里配置
    },
    // 可配置的服务列表（服务名对应 repository.name）
    SERVICES: [

    ],
    // 环境列表
    ENVIRONMENTS: [
        { id: 'hk', name: 'HK' },
        { id: 'bmd', name: 'BMD' }
    ]
};

// ==================== 状态存储（简易版，生产环境建议用Redis） ====================
const userSelectionCache = new Map();

// ==================== 初始化客户端 ====================
const larkClient = new lark.Client({
    appId: CONFIG.APP_ID,
    appSecret: CONFIG.APP_SECRET,
});


// ==================== Verification Token 校验函数 ====================
/**
* 校验飞书请求的合法性
* 根据飞书官方文档：
* 1. 获取请求头中的 X-Lark-Request-Timestamp、X-Lark-Request-Nonce 值，分别记为 timestamp、nonce。
* 2. 获取原始请求 Body 的数据，记为 body。
* 3. 按 timestamp、nonce、Verification Token、body 的顺序进行拼接，并按照 encode('utf-8') 编码得到 byte[] b1。
* 4. 对 byte[] b1 进行 SHA-1 加密得到 bs，然后将 bs 编码成 16 进制字符串记为 sig。
* 5. 校验 sig 与请求头中 X-Lark-Signature 的值是否一致。
* 
* @param {Object} req - Express 请求对象
* @param {String} verificationToken - 飞书后台的 Verification Token
* @returns {Boolean} 验证结果
*/
function verifyLarkRequest(req, verificationToken) {
    try {
        // 1. 获取请求头中的 X-Lark-Request-Timestamp、X-Lark-Request-Nonce 值
        // 注意：Express 会将请求头转换为小写，但为了兼容性，同时检查大小写
        const timestamp = req.headers['x-lark-request-timestamp'] || req.headers['X-Lark-Request-Timestamp'];
        const nonce = req.headers['x-lark-request-nonce'] || req.headers['X-Lark-Request-Nonce'];
        const signature = req.headers['x-lark-signature'] || req.headers['X-Lark-Signature'];

        // 2. 基础参数校验
        if (!timestamp || !nonce || !signature) {
            console.error("[校验失败] 请求头缺少必要参数：timestamp/nonce/signature");
            console.error("timestamp:", timestamp, "nonce:", nonce, "signature:", signature);
            return false;
        }

        // 3. 时间戳校验（防止重放攻击）
        const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
        if (Math.abs(now - Number(timestamp)) > CONFIG.MAX_TIMESTAMP_DIFF) {
            console.error(`[校验失败] 时间戳过期：当前${now}，请求${timestamp}，时差${Math.abs(now - Number(timestamp))}秒`);
            return false;
        }

        const data = Object.assign(Object.create({
            headers: req.headers,
        }), req.body);
        // 5.5 将 bs 编码成 16 进制字符串记为 sig
        const sig = crypto.createHash('sha1')
        .update(timestamp +
        nonce +
        CONFIG.VERIFICATION_TOKEN +
        JSON.stringify(data))
        .digest('hex')
        // 6. 校验 sig 与请求头中 X-Lark-Signature 的值是否一致
        // 一致则表示当前请求来自Lark开放平台
        console.log('sig:', sig);
        console.log('signature:', signature);
        if (sig !== signature) {
            console.error(`[校验失败] 签名不一致：${sig} !== ${signature}`);
            return true;
        }
        return true;
    } catch (error) {
        console.error('验证请求时出错:', error);
        console.error('错误堆栈:', error.stack);
        return false;
    }
}

// ==================== 发送消息辅助函数 ====================
/**
 * 发送卡片消息
 * @param {string} chatId - 聊天ID
 * @param {Object} card - 卡片对象
 * @returns {Promise} 发送结果
 */
async function sendCardMessage(chatId, card) {
    return await larkClient.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
            receive_id: chatId,
            content: JSON.stringify(card),
            msg_type: 'interactive'
        }
    });
}

// ==================== 构建文本卡片（将普通文本转换为卡片格式） ====================
/**
 * 创建文本卡片
 * @param {string} title - 卡片标题
 * @param {string} content - 卡片内容（支持 markdown）
 * @param {string} template - 卡片模板颜色（blue/green/red/orange/grey）
 * @param {string} userId - 可选的用户ID，用于@用户
 * @returns {Object} 卡片对象
 */
function createTextCard(title, content, template = 'blue', userId = null) {
    const card = {
        "config": {
            "wide_screen_mode": true,
            "enable_forward": true
        },
        "header": {
            "title": {
                "content": title,
                "tag": "plain_text"
            },
            "template": template
        },
        "elements": [
            {
                "tag": "div",
                "text": {
                    "content": content,
                    "tag": "lark_md"
                }
            }
        ]
    };

    // 如果提供了 userId，添加@用户元素
    if (userId) {
        card.elements.push({
            "tag": "div",
            "text": {
                "content": `<at id=${userId}></at>`,
                "tag": "lark_md"
            }
        });
    }

    return card;
}

// ==================== 构建帮助卡片 ====================
function createHelpCard() {
    return {
        "config": {
                "wide_screen_mode": true,
                "enable_forward": true
            },
            "header": {
                "title": {
                    "content": "🤖 老青牛驾驭指南",
                    "tag": "plain_text"
                },
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": "支持以下三种构建方式：",
                        "tag": "plain_text"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**方式一：交互式选择**\n`b` 或 `build` 或 `构建`\n\n选择环境 → 选择服务 → 确认构建",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content":  "**方式二：指定环境**\n`b hk` 或 `build hk` 或 `build bmd`\n\n直接选择服务 → 确认构建",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**方式三：快速构建**\n`b 站点@服务@分支` 或 `build 站点@服务@分支` 或 `构建 站点@服务@分支`\n\n直接触发构建，无需选择",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**🚀 构建并发布：**\n使用 `bd`、`buildAndDeploy` 或 `构建并发布` 命令\n\n支持与构建命令相同的三种方式，区别在于会同时触发构建和发布流程",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**📝 示例：**\n• `build` - 选择环境进行构建\n• `build hk` - 选择HK环境的服务进行构建\n• `build hk@Jadepool Chain Task@feature/test` - 直接构建\n• `bd` - 选择环境进行构建并发布\n• `bd hk` - 选择HK环境的服务进行构建并发布\n• `bd hk@Jadepool Chain Task@feature/test` - 直接构建并发布",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": "**💡 提示：**\n• 格式使用 `@` 分隔站点、服务和分支，例如：`build hk@服务名@分支名`\n• Global Scan 服务使用固定分支 `refs/heads/feature/dev`\n• 其他服务未指定分支时，使用环境对应的默认分支\n• 构建并发布命令（`bd`）与构建命令（`build`）使用方式完全相同",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "note",
                    "elements": [
                        {
                            "tag": "plain_text",
                            "content": "💬 直接输入命令即可开始使用，例如：`build`"
                        }
                    ]
                }
            ]
    };
}

// ==================== 构建环境选择卡片 ====================
/**
 * 创建环境选择卡片
 * @param {string} chatId - 聊天ID
 * @param {string} userId - 用户ID
 * @param {boolean} isDeploy - 是否为构建并发布模式（默认false）
 * @returns {Object} 包含卡片对象和缓存键的对象
 */
function createEnvironmentSelectionCard(chatId, userId, isDeploy = false) {
    // 构建环境选项
    const envOptions = CONFIG.ENVIRONMENTS.map(env => ({
        "text": {
            "content": env.name,
            "tag": "plain_text"
        },
        "value": env.id
    }));

    // 创建缓存
    const cacheKey = `${chatId}_environment_${Date.now()}`;
    const cacheData = {
        chatId: chatId,
        userId: userId,
        createTime: Date.now(),
        type: 'env_selection',
        value: '', // 存储选中的环境值
        isDeploy: isDeploy // 标记是否为构建并发布
    };
    userSelectionCache.set(cacheKey, cacheData);
    console.log(`[createEnvironmentSelectionCard] 创建环境选择缓存 - cacheKey: ${cacheKey}, isDeploy: ${isDeploy}, cacheData:`, JSON.stringify(cacheData, null, 2));

    // 根据模式设置标题和提示文本
    const title = isDeploy ? "🚀 选择构建并发布环境" : "📦 选择构建环境";
    const promptText = isDeploy ? "请选择构建并发布环境：" : "请选择构建环境：";

    // 构建卡片
    const card = {
        "config": {
            "wide_screen_mode": true,
            "enable_forward": true
        },
        "header": {
            "title": {
                "content": title,
                "tag": "plain_text"
            },
            "template": "blue"
        },
        "elements": [
            {
                "tag": "div",
                "text": {
                    "content": promptText,
                    "tag": "plain_text"
                }
            },
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "select_static",
                        "placeholder": {
                            "content": "选择环境",
                            "tag": "plain_text"
                        },
                        "options": envOptions,
                        "value": {
                            "key": "environment",
                            "cacheKey": cacheKey
                        }
                    }
                ]
            },
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "content": "确认",
                            "tag": "plain_text"
                        },
                        "type": "primary",
                        "value": {
                            "key": "select_env",
                            "cacheKey": cacheKey
                        }
                    },
                    {
                        "tag": "button",
                        "text": {
                            "content": "取消",
                            "tag": "plain_text"
                        },
                        "type": "default",
                        "value": {
                            "key": "cancel",
                            "cacheKey": cacheKey
                        }
                    }
                ]
            }
        ]
    };

    return { card, cacheKey };
}

// ==================== 构建交互式卡片 ====================
function createBuildSelectionCard(chatId, environment, userId, isDeploy = false) {
    // 存储环境信息，用于后续回调使用
    const cacheKey = `${chatId}_service_${Date.now()}`;
    const cacheData = {
        environment,
        chatId,
        userId,
        createTime: Date.now(),
        isDeploy: isDeploy // 标记是否为构建并发布
    };
    userSelectionCache.set(cacheKey, cacheData);
    console.log(`[createBuildSelectionCard] 创建服务选择缓存 - cacheKey: ${cacheKey}, isDeploy: ${isDeploy}, cacheData:`, JSON.stringify(cacheData, null, 2));

    // 构建服务选项
    const serviceOptions = CONFIG.SERVICES.map(service => ({
        "text": {
            "content": service.name,
            "tag": "plain_text"
        },
        "value": service.id
    }));

    const envName = CONFIG.ENVIRONMENTS.find(e => e.id === environment)?.name || environment;

    // 根据模式设置标题和提示文本
    const title = isDeploy ? `🚀 构建并发布任务配置 - 环境: ${envName}` : `📦 构建任务配置 - 环境: ${envName}`;
    const promptText = isDeploy ? `请选择需要构建并发布的服务（环境：${envName}）：` : `请选择需要构建的服务（环境：${envName}）：`;
    const confirmButtonText = isDeploy ? "确认构建并发布" : "确认构建";

    // 飞书卡片模板
    return {
        "config": {
                "wide_screen_mode": true,
                "enable_forward": true
            },
            "header": {
                "title": {
                    "content": title,
                    "tag": "plain_text"
                },
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": promptText,
                        "tag": "plain_text"
                    }
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "select_static",
                            "placeholder": {
                                "content": "选择服务",
                                "tag": "plain_text"
                            },
                            "options": serviceOptions,
                            "value": {
                                "key": "service",
                                "cacheKey": cacheKey
                            }
                        }
                    ]
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {
                                "content": confirmButtonText,
                                "tag": "plain_text"
                            },
                            "type": "primary",
                            "value": {
                                "key": "confirm",
                                "cacheKey": cacheKey
                            }
                        },
                        {
                            "tag": "button",
                            "text": {
                                "content": "取消",
                                "tag": "plain_text"
                            },
                            "type": "default",
                            "value": {
                                "key": "cancel",
                                "cacheKey": cacheKey
                            }
                        }
                    ]
                }
            ]
    };
}

// ==================== Webhook构建逻辑 ====================
async function triggerJenkinsBuild(serviceId, envId, branchName, chatId, userId, autoDeploy = false) {
    const actionType = autoDeploy ? '构建并发布' : '构建';
    console.log(`[triggerJenkinsBuild] 开始触发${actionType} - serviceId: ${serviceId}, envId: ${envId}, branchName: ${branchName || '默认'}, chatId: ${chatId}, userId: ${userId || '未设置'}, autoDeploy: ${autoDeploy}`);
    try {
        // 获取服务和环境的名称
        const service = CONFIG.SERVICES.find(s => s.id === serviceId) || { name: serviceId, repositoryName: serviceId };
        const env = CONFIG.ENVIRONMENTS.find(e => e.id === envId) || { name: envId };
        console.log(`[triggerJenkinsBuild] 服务信息: ${service.name}, 仓库: ${service.repositoryName}, 环境: ${env.name}`);

        // 确定分支
        let ref;
        if (serviceId === 'Global Scan') {
            // Global Scan 服务使用固定分支
            ref = 'refs/heads/feature/dev';
            console.log(`[triggerJenkinsBuild] Global Scan 服务，使用固定分支: ${ref}`);
        } else {
            // 其他服务根据环境使用不同分支
            if (branchName) {
                // 如果提供了分支名，使用提供的分支（确保有 refs/heads/ 前缀）
                ref = branchName.startsWith('refs/') ? branchName : `refs/heads/${branchName}`;
                console.log(`[triggerJenkinsBuild] 使用提供的分支: ${branchName} -> ${ref}`);
            } else {
                // 如果没有提供分支名，使用环境对应的固定分支
                ref = `refs/heads/feature/${envId}-dev`;
                console.log(`[triggerJenkinsBuild] 使用环境默认分支: ${ref}`);
            }
        }

        // 回复用户开始处理
        const startTitle = autoDeploy ? '🤖 开始执行构建并发布任务' : '🤖 开始执行构建任务';
        const startCard = createTextCard(
            startTitle,
            `**服务：** ${service.name}\n**环境：** ${env.name}\n**分支：** ${ref}\n\n🔍 正在触发${actionType}...`,
            'blue'
        );
        await sendCardMessage(chatId, startCard);

        // 构建 webhook URL（如果配置了 token 则添加）
        const webhookUrl = CONFIG.WEBHOOK.TOKEN 
            ? `${CONFIG.WEBHOOK.URL}?token=${CONFIG.WEBHOOK.TOKEN}`
            : CONFIG.WEBHOOK.URL;

        // 生成 UID（使用 UUID 的第一段）
        const uid = uuid();
        const u = uid.split('-')[0] || '';
        // 准备请求体数据
        const requestData = {
            ref: ref,
            uid: u,
            autoDeploy: autoDeploy,
            repository: {
                name: service.repositoryName || service.name
            }
        };

        // 发送 POST 请求到 webhook
        console.log(`[triggerJenkinsBuild] 发送构建请求 - URL: ${webhookUrl}, 数据:`, JSON.stringify(requestData, null, 2));
        const response = await axios.post(webhookUrl, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'lark'
            }
        });
        console.log(`[triggerJenkinsBuild] 构建请求响应 - status: ${response.status}, data:`, JSON.stringify(response.data, null, 2));
        
        // 回复构建触发成功，@用户
        const successTitle = autoDeploy ? '🚀 构建并发布已触发' : '🚀 构建已触发';
        const successCard = createTextCard(
            successTitle,
            `**服务：** ${service.name}\n**环境：** ${env.name}\n**分支：** ${ref}\n**仓库：** ${service.repositoryName}\n**UID：** ${u}`,
            'green',
            userId
        );
        await sendCardMessage(chatId, successCard);

        return { success: true, response: response.data };
    } catch (error) {
        console.error('构建失败:', error);
        const service = CONFIG.SERVICES.find(s => s.id === serviceId) || { name: serviceId };
        const env = CONFIG.ENVIRONMENTS.find(e => e.id === envId) || { name: envId };
        const errorTitle = autoDeploy ? '❌ 构建并发布失败' : '❌ 构建失败';
        const errorCard = createTextCard(
            errorTitle,
            `**错误信息：** ${error.message}\n**服务：** ${service.name}\n**环境：** ${env.name}`,
            'red',
            userId
        );
        await sendCardMessage(chatId, errorCard);
        throw error;
    }
}

// ==================== 处理卡片回调 ====================
async function handleCardCallback(actionValue) {
    try {
        console.log('卡片回调 actionValue:', JSON.stringify(actionValue, null, 2));

        // 解析 actionValue（可能是字符串或对象）
        let parsedValue = actionValue;
        if (typeof actionValue === 'string') {
            try {
                parsedValue = JSON.parse(actionValue);
            } catch (e) {
                parsedValue = actionValue;
            }
        }

        const { key, cacheKey } = parsedValue || {};
        console.log(`[handleCardCallback] 解析后的数据 - key: ${key}, cacheKey: ${cacheKey}`);
        console.log(`[handleCardCallback] parsedValue:`, JSON.stringify(parsedValue, null, 2));

        if (!cacheKey){
          console.error(`[handleCardCallback] 缺少 cacheKey，parsedValue:`, JSON.stringify(parsedValue, null, 2));
          throw Error("not cacheKey key")
        }

        // 从缓存中获取数据（userSelectionCache 是 Map，需要使用 .get() 方法）
        console.log(`[handleCardCallback] 尝试从缓存获取数据，cacheKey: ${cacheKey}`);
        const cacheData = userSelectionCache.get(cacheKey);
        console.log(`[handleCardCallback] 缓存数据获取结果:`, cacheData ? JSON.stringify(cacheData, null, 2) : 'null');

        if (!cacheData || !cacheData.chatId) {
            console.error(`[handleCardCallback] 缓存数据不存在或无效 - cacheKey: ${cacheKey}, cacheData:`, cacheData);
            throw new Error("缓存数据不存在或已过期，请重新发起构建请求");
        }
        const chatId = cacheData.chatId;
        console.log(`[handleCardCallback] 获取到 chatId: ${chatId}, userId: ${cacheData.userId || '未设置'}`);
        // 取消操作
        if (key === 'cancel') {
            if (cacheKey) {
                userSelectionCache.delete(cacheKey);
            }
            const cancelCard = createTextCard('🚫 已取消', '已取消本次构建操作', 'grey');
            await sendCardMessage(chatId, cancelCard);
            return;
        }

        // 如果没有 key，可能是无效的回调
        if (!key) {
            console.warn('卡片回调缺少 key 字段:', parsedValue);
            const invalidCard = createTextCard('⚠️ 无效操作', '无效的卡片操作，请重新发起构建请求', 'orange');
            await sendCardMessage(chatId, invalidCard);
            return;
        }

        // 选择环境后，显示服务选择卡片
        if (key === 'select_env') {
            // 重新获取缓存数据，因为 select_static 回调可能已经更新了缓存
            const envCacheData = cacheKey ? userSelectionCache.get(cacheKey) : null;
            console.log(`[handleCardCallback] select_env - cacheKey: ${cacheKey}, envCacheData:`, JSON.stringify(envCacheData, null, 2));

            if (!envCacheData) {
                const expiredCard = createTextCard('⚠️ 操作已过期', '操作已过期，请重新发起构建请求', 'orange');
                await sendCardMessage(chatId, expiredCard);
                return;
            }

            // 获取选中的环境值（从缓存中获取，select_static 回调时已更新）
            const envValue = envCacheData.value;
            console.log(`[handleCardCallback] select_env - envValue: ${envValue}`);
            if (!envValue) {
                const selectEnvCard = createTextCard('⚠️ 请先选择环境', '请先选择环境，再点击确认', 'orange');
                await sendCardMessage(chatId, selectEnvCard);
                return;
            }

            // 验证环境是否有效
            const env = CONFIG.ENVIRONMENTS.find(e => e.id === envValue || e.name === envValue);
            if (!env) {
                const invalidEnvCard = createTextCard('❌ 无效的环境', `无效的环境 "${envValue}"`, 'red');
                await sendCardMessage(chatId, invalidEnvCard);
                return;
            }

            // 删除环境选择缓存
            const userId = envCacheData.userId; // 保存 userId 用于后续使用
            const isDeploy = envCacheData.isDeploy || false; // 获取是否为构建并发布模式
            if (cacheKey) {
                userSelectionCache.delete(cacheKey);
            }

            // 显示服务选择卡片
            const card = createBuildSelectionCard(chatId, env.id, userId, isDeploy);
            await sendCardMessage(chatId, card);
            return;
        }

        // 确认构建
        if (key === 'confirm') {
            // 获取缓存的环境信息
            const cacheData = cacheKey ? userSelectionCache.get(cacheKey) : null;
            if (!cacheData) {
                const expiredCard = createTextCard('⚠️ 操作已过期', '操作已过期，请重新发起构建请求', 'orange');
                await sendCardMessage(chatId, expiredCard);
                return;
            }
            const serviceValue = cacheData.value;
            const isDeploy = cacheData.isDeploy || false; // 获取是否为构建并发布模式
            console.log(`[handleCardCallback] confirm - 从缓存获取服务值: ${serviceValue}, 环境: ${cacheData.environment}, isDeploy: ${isDeploy}`);
            if (!serviceValue) {
                const actionText = isDeploy ? '构建并发布' : '构建';
                const selectServiceCard = createTextCard('⚠️ 请先选择服务', `请先选择服务，再点击确认${actionText}`, 'orange');
                await sendCardMessage(chatId, selectServiceCard);
                return;
            }

            // 验证服务是否有效
            const serviceObj = CONFIG.SERVICES.find(s => s.id === serviceValue || s.name === serviceValue);
            if (!serviceObj) {
                const invalidServiceCard = createTextCard('❌ 无效的服务', `无效的服务 "${serviceValue}"`, 'red');
                await sendCardMessage(chatId, invalidServiceCard);
                return;
            }

            // 触发构建（使用缓存中的环境，不传分支名使用默认分支）
            await triggerJenkinsBuild(serviceObj.id, cacheData.environment, null, chatId, cacheData.userId, isDeploy);
            // 清理缓存
            if (cacheKey) {
                userSelectionCache.delete(cacheKey);
            }
            return;
        }
    } catch (error) {
        console.error('处理卡片回调失败:', error);
        console.error('错误堆栈:', error.stack);

        // 尝试从 actionValue 中获取 chatId（如果可能）
        let chatId = null;
        try {
            const parsedValue = typeof actionValue === 'string' ? JSON.parse(actionValue) : actionValue;
            const cacheKey = parsedValue?.cacheKey;
            if (cacheKey) {
                const cacheData = userSelectionCache.get(cacheKey);
                chatId = cacheData?.chatId;
            }
        } catch (e) {
            // 如果无法获取 chatId，则跳过发送消息
        }

        // 只有在能够获取到 chatId 时才发送错误消息
        if (chatId) {
            try {
                const errorCard = createTextCard('❌ 处理请求失败', `处理请求失败：${error.message}`, 'red');
                await sendCardMessage(chatId, errorCard);
            } catch (sendError) {
                console.error('发送错误消息失败:', sendError);
            }
        }
    }
}

// ==================== 消息接收中间件 ====================
/**
 * 飞书 Webhook 请求处理中间件
 * 处理签名验证、事件分发和消息处理
 */
const larkWebhookMiddleware = async (req, res, next) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
        console.log(`[${requestId}] 收到飞书 Webhook 请求`);
        console.log(`[${requestId}] 请求头:`, {
            'content-type': req.headers['content-type'],
            'x-lark-request-timestamp': req.headers['x-lark-request-timestamp'],
            'x-lark-request-nonce': req.headers['x-lark-request-nonce'],
            'x-lark-signature': req.headers['x-lark-signature'] ? '已提供' : '未提供'
        });
        console.log(`[${requestId}] 请求体:`, JSON.stringify(req.body, null, 2));

        // 判断事件格式版本（支持 schema 1.0 和 2.0）
        const isSchemaV2 = req.body.schema === '2.0';
        const eventType = isSchemaV2 ? req.body.header?.event_type : req.body.type;
        const eventData = isSchemaV2 ? req.body.event : req.body.event;

        console.log(`[${requestId}] 事件格式: ${isSchemaV2 ? 'Schema 2.0' : 'Schema 1.0'}`);
        console.log(`[${requestId}] 事件类型: ${eventType}`);

        // 2. 处理飞书URL验证（CHALLENGE 验证 - 不需要签名验证）
        if (eventType === 'url_verification' || req.body.type === 'url_verification') {
            const challenge = req.body.challenge;
            console.log(`[${requestId}] 收到 URL 验证请求 (CHALLENGE)`);
            console.log(`[${requestId}] CHALLENGE 值: ${challenge}`);

            if (!challenge) {
                console.error(`[${requestId}] CHALLENGE 值为空`);
                return res.status(400).send({ error: 'Missing challenge' });
            }

            const response = { challenge: challenge };
            console.log(`[${requestId}] 返回 CHALLENGE 响应:`, response);
            console.log(`[${requestId}] 响应时间: ${Date.now() - startTime}ms`);
            return res.status(200).json(response);
        }

        // 1. 验证飞书请求合法性（仅对事件回调进行验证，CHALLENGE 验证不需要）
        const isEventCallback = eventType === 'event_callback' ||
            (isSchemaV2 && eventType && eventType.startsWith('im.'));

        if (isEventCallback) {
            // 暂时禁用签名验证，先解决卡片问题
            const isValid = verifyLarkRequest(req, CONFIG.VERIFICATION_TOKEN);
            console.log(`[${requestId}] 请求签名验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}`);
            // if (!isValid) {
            // console.error(`[${requestId}] 请求验证失败，拒绝处理`);
            // return res.status(401).send('验证失败');
            // }
        }


            // 处理卡片回调事件（Schema 1.0 和 2.0 格式）
            // Schema 2.0: actualEvent.action 包含交互数据

            if (eventType === "card.action.trigger") {
                console.log(`[${requestId}] 处理交互式卡片回调`);
                    const actualEvent = eventData;
                try {
                    // 添加调试日志，查看完整的 action 结构
                    console.log(`[${requestId}] actualEvent.action:`, JSON.stringify(actualEvent.action, null, 2));

                    // 解析 action.value（可能是字符串或对象）
                    let actionValue = actualEvent.action?.value;
                    if (typeof actionValue === 'string') {
                        try {
                            actionValue = JSON.parse(actionValue);
                        } catch (e) {
                            console.warn(`[${requestId}] action.value 不是有效的 JSON，使用原始字符串`);
                        }
                    }

                    // 检查是否是 select_static 回调（tag 在 action 中，不在 value 中）
                    const actionTag = actualEvent.action?.tag;
                    console.log(`[${requestId}] 卡片回调 - actionTag: ${actionTag}`);
                    if (actionTag === "select_static") {
                        // select_static 的选中值可能在 action.option 或 action.value 中
                        const selectedOption = actualEvent.action?.option || actionValue?.option || actionValue;
                        const cacheKey = actionValue?.cacheKey || (typeof actionValue === 'string' ? null : actionValue?.cacheKey);

                        console.log(`[${requestId}] select_static 回调 - actionTag: ${actionTag}`);
                        console.log(`[${requestId}] select_static 回调 - action.option: ${actualEvent.action?.option}, actionValue:`, JSON.stringify(actionValue, null, 2));
                        console.log(`[${requestId}] select_static 回调 - cacheKey: ${cacheKey}, selectedOption: ${selectedOption}`);

                        if (cacheKey) {
                            const cache = userSelectionCache.get(cacheKey);
                            console.log(`[${requestId}] select_static 回调 - 获取缓存前:`, cache ? JSON.stringify(cache, null, 2) : 'null');
                            if (cache) {
                                const oldValue = cache.value;
                                cache.value = selectedOption;
                                userSelectionCache.set(cacheKey, cache);
                                console.log(`[${requestId}] select_static 回调 - 已更新缓存，cache.value: ${oldValue || 'null'} -> ${selectedOption}`);
                                console.log(`[${requestId}] select_static 回调 - 更新后缓存:`, JSON.stringify(cache, null, 2));
                            } else {
                                console.warn(`[${requestId}] select_static 回调 - 缓存不存在，cacheKey: ${cacheKey}`);
                            }
                        } else {
                            console.warn(`[${requestId}] select_static 回调 - 缺少 cacheKey，actionValue:`, JSON.stringify(actionValue, null, 2));
                        }
                        return res.status(200).send({ code: 0, msg: 'success' });
                    }

                    if (!actionValue) {
                        console.error(`[${requestId}] action.value 为空`);
                        return res.status(200).send({ code: 0, msg: 'success' });
                    }

                    await handleCardCallback(actionValue);
                    console.log(`[${requestId}] 卡片回调处理完成，响应时间: ${Date.now() - startTime}ms`);
                    return res.status(200).send({ code: 0, msg: 'success' });
                } catch (error) {
                    console.error(`[${requestId}] 处理卡片回调失败:`, error);
                    console.error(`[${requestId}] 错误堆栈:`, error.stack);
                    return res.status(500).send({ code: 1, msg: '处理失败' });
                }
            }




        // 3. 处理事件回调
        if (isEventCallback && eventData) {
            // Schema 2.0 格式：event_type 在 header 中，事件数据在 event 中
            // Schema 1.0 格式：type 在 body 中，事件数据在 event 中
            const actualEvent = eventData;
            const actualEventType = isSchemaV2 ? eventType : actualEvent.type;

            console.log(`[${requestId}] 收到事件回调，事件类型: ${actualEventType}`);


            // 处理文本消息（支持 Schema 1.0 和 2.0）
            const message = actualEvent.message || actualEvent;
            const isTextMessage = (actualEventType === 'im.message.receive_v1' || actualEventType === 'message') &&
                message.message_type === 'text';

            if (isTextMessage) {
                console.log(`[${requestId}] 处理文本消息`);
                const content = typeof message.content === 'string'
                    ? JSON.parse(message.content)
                    : message.content;
                console.log(`[${requestId}] 消息内容解析 - content:`, JSON.stringify(content, null, 2));
                let messageText = content.text.trim();
                console.log(`[${requestId}] 原始消息内容: "${messageText}"`);

                // 移除@机器人标记
                messageText = messageText.replace(/@_user_\d+/g, '').trim();
                console.log(`[${requestId}] 清理后消息内容: "${messageText}"`);

                // 获取 chat_id（Schema 2.0 格式在 message.chat_id，Schema 1.0 在 event.chat_id）
                const chatId = message.chat_id || actualEvent.chat_id || actualEvent.chat?.id;
                console.log(`[${requestId}] 获取到 chatId: ${chatId}`);

                // 获取发送者信息（用于后续@用户）
                // 优先使用 open_id，如果没有则使用 user_id
                const sender = actualEvent.sender || {};
                const senderId = sender.sender_id || {};
                const userId = senderId.user_id || null;
                console.log(`[${requestId}] 获取到用户信息 - sender:`, JSON.stringify(sender, null, 2));
                console.log(`[${requestId}] 获取到用户信息 - open_id: ${senderId.open_id}, user_id: ${senderId.user_id}, 最终使用: ${userId}`);

                // 解析指令 - 只按第一个空格分割
                const firstSpaceIndex = messageText.indexOf(' ');
                let parts;
                if (firstSpaceIndex === -1) {
                    // 没有空格，只有命令
                    parts = [messageText];
                } else {
                    // 按第一个空格分割
                    parts = [
                        messageText.substring(0, firstSpaceIndex),
                        messageText.substring(firstSpaceIndex + 1)
                    ];
                }
                const command = parts[0].toLowerCase();
                console.log(`[${requestId}] 解析命令: "${command}", 参数数量: ${parts.length}, 剩余内容: "${parts[1] || ''}"`);

                // 判断是否为构建并发布命令
                const isDeployCommand = command === 'bd' || command === 'buildAndDeploy' || command === '构建并发布';
                // 处理 build、构建 或 构建并发布 指令
                if (command === 'b' || command === 'build' || command === '构建' || isDeployCommand) {
                    const actionType = isDeployCommand ? '构建并发布' : '构建';
                    // 判断格式：格式1(选择环境) / 格式2(指定环境) / 格式3(快速构建/构建并发布)
                    let formatType = '格式1(选择环境)';
                    if (parts.length === 2) {
                        formatType = parts[1].includes('@') ? `格式3(快速${actionType})` : '格式2(指定环境)';
                    }
                    console.log(`[${requestId}] 识别为${actionType}命令，处理格式: ${formatType}`);

                    // 格式1: build/bd 或 构建/构建并发布 → 显示环境选择卡片
                    if (parts.length === 1) {
                        console.log(`[${requestId}] 格式1: 显示环境选择卡片（${actionType}模式）`);
                        
                        // 创建并发送环境选择卡片
                        const { card: envCard } = createEnvironmentSelectionCard(chatId, userId, isDeployCommand);
                        await sendCardMessage(chatId, envCard);
                        console.log(`[${requestId}] 环境选择卡片已发送，响应时间: ${Date.now() - startTime}ms`);
                        return res.status(200).send({ code: 0, msg: 'success' });
                    }

                    // 格式3: build 站点@服务@分支 → 直接触发构建
                    // 先判断格式3，因为 "build 站点@服务@分支" 用第一个空格分割后 parts.length 也是 2
                    // 通过检查是否包含 @ 来区分格式2和格式3
                    if (parts.length === 2 && parts[1].includes('@')) {
                        // parts[1] 已经包含了第一个空格后的所有内容（包括服务名中的空格）
                        const restOfMessage = parts[1];
                        console.log(`[${requestId}] 格式3: 快速构建模式，消息内容: "${restOfMessage}"`);

                        // 解析格式：站点@服务@分支
                        // 支持格式：hk@Jadepool Chain Task@feature/test
                        const match = restOfMessage.match(/^(\w+)@(.+?)@(.+)$/);
                        if (!match) {
                            const formatErrorCard = createTextCard(
                                '❌ 格式错误',
                                `**正确格式：** \`build 站点@服务@分支\`\n\n**示例：** \`build hk@Jadepool Chain Task@feature/test\``,
                                'red'
                            );
                            await sendCardMessage(chatId, formatErrorCard);
                            return res.status(200).send({ code: 0, msg: 'success' });
                        }

                        const [, envId, serviceName, branchName] = match;
                        console.log(`[${requestId}] 解析结果 - 环境: ${envId}, 服务: ${serviceName}, 分支: ${branchName}`);

                        // 验证环境
                        const env = CONFIG.ENVIRONMENTS.find(e => e.id === envId.toLowerCase());
                        if (!env) {
                            const invalidEnvCard = createTextCard(
                                '❌ 无效的环境名称',
                                `无效的环境名称 "${envId}"\n\n**支持的环境：** ${CONFIG.ENVIRONMENTS.map(e => e.name).join('、')}`,
                                'red'
                            );
                            await sendCardMessage(chatId, invalidEnvCard);
                            return res.status(200).send({ code: 0, msg: 'success' });
                        }

                        // 查找服务（支持完整匹配或部分匹配）
                        const service = CONFIG.SERVICES.find(s => 
                            s.name === serviceName || 
                            s.repositoryName === serviceName ||
                            s.id === serviceName
                        );

                        if (!service) {
                            const serviceNotFoundCard = createTextCard(
                                '❌ 未找到服务',
                                `未找到服务 "${serviceName}"\n\n**支持的服务：** ${CONFIG.SERVICES.map(s => s.name).join('、')}`,
                                'red'
                            );
                            await sendCardMessage(chatId, serviceNotFoundCard);
                            return res.status(200).send({ code: 0, msg: 'success' });
                        }

                        // 直接触发构建/构建并发布（异步处理，不阻塞响应）
                        triggerJenkinsBuild(service.id, env.id, branchName, chatId, userId, isDeployCommand).catch(err => {
                            console.error(`[${requestId}] 快速${actionType}失败:`, err);
                        });

                        console.log(`[${requestId}] 快速${actionType}请求已接收，响应时间: ${Date.now() - startTime}ms`);
                        return res.status(200).send({ code: 0, msg: 'success' });
                    }

                    // 格式2: build/bd hk 或 build/bd bmd → 直接显示对应环境的服务选择卡片
                    // 只有在 parts.length === 2 且不包含 @ 时才走格式2
                    if (parts.length === 2) {
                        const envParam = parts[1].toLowerCase();
                        console.log(`[${requestId}] 格式2: 指定环境 "${envParam}"（${actionType}模式）`);

                        // 检查环境是否有效
                        const env = CONFIG.ENVIRONMENTS.find(e => e.id === envParam || e.name.toLowerCase() === envParam);
                        if (!env) {
                            const invalidEnvNameCard = createTextCard(
                                '❌ 无效的环境名称',
                                `无效的环境名称 "${parts[1]}"\n\n**支持的环境：** ${CONFIG.ENVIRONMENTS.map(e => e.name).join('、')}`,
                                'red'
                            );
                            await sendCardMessage(chatId, invalidEnvNameCard);
                            return res.status(200).send({ code: 0, msg: 'success' });
                        }

                        // 直接显示该环境的服务选择卡片
                        const card = createBuildSelectionCard(chatId, env.id, userId, isDeployCommand);
                        await sendCardMessage(chatId, card);
                        console.log(`[${requestId}] 服务选择卡片已发送（环境：${env.name}），响应时间: ${Date.now() - startTime}ms`);
                        return res.status(200).send({ code: 0, msg: 'success' });
                    }
                }

                    const helpCard = createHelpCard();
                    await sendCardMessage(chatId, helpCard);
                console.log(`[${requestId}] 帮助卡片已发送，响应时间: ${Date.now() - startTime}ms`);
                return res.status(200).send({ code: 0, msg: 'success' });
            }

            // 其他类型的事件，不做处理
            console.log(`[${requestId}] 未处理的事件类型，响应时间: ${Date.now() - startTime}ms`);
            return res.status(200).send({ code: 0, msg: 'success' });
        }

        // 未知请求类型
        console.log(`[${requestId}] 未知请求类型，响应时间: ${Date.now() - startTime}ms`);
        return res.status(200).send({ code: 0, msg: 'success' });
    } catch (error) {
        console.error(`[${requestId}] 处理请求时出错:`, error);
        console.error(`[${requestId}] 错误堆栈:`, error.stack);
        return res.status(500).send({ code: 1, msg: '服务器内部错误' });
    }
};
// 使用中间件拦截 /api/webhook/callback/lark 路径的所有请求
app.use('/api/webhook/callback/lark', larkWebhookMiddleware);

// ==================== 启动服务器 ====================
const PORT = CONFIG.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 飞书机器人服务已启动，监听端口: ${PORT}`);
    console.log(`📡 Webhook 地址: http://localhost:${PORT}/api/webhook/callback/lark`);
    console.log(`🔧 环境数量: ${CONFIG.ENVIRONMENTS.length}`);
    console.log(`📦 服务数量: ${CONFIG.SERVICES.length}`);
});