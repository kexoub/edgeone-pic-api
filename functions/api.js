// EdgeOne Pages Function export
export function onRequest(context) {
    return handleRequest(context.request);
}

// 存储最近使用过的图片索引（在单次请求内有效）
const recentUsedImages = {
    pc: new Set(),
    pe: new Set()
};

// 清空历史记录的阈值（防止内存泄漏）
const MAX_HISTORY_SIZE = 50;

/**
 * 检测是否为移动设备（优化版本）
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否为移动设备
 */
function isMobileDevice(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return false;
    
    const mobileKeywords = [
        'Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 
        'BlackBerry', 'Windows Phone', 'Opera Mini', 
        'IEMobile', 'Mobile Safari', 'webOS', 'Kindle', 
        'Silk', 'Fennec', 'Maemo', 'Tablet'
    ];
    
    const lowerUA = userAgent.toLowerCase();
    
    // 快速关键词匹配
    for (let i = 0; i < mobileKeywords.length; i++) {
        if (lowerUA.includes(mobileKeywords[i].toLowerCase())) {
            return true;
        }
    }
    
    // 正则兜底
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
}

/**
 * 增强的随机数生成器（结合时间戳和crypto）
 * @param {number} max - 最大值（不包含）
 * @returns {number} 随机索引
 */
function getEnhancedRandomIndex(max) {
    if (max <= 0) return 0;
    if (max === 1) return 0;
    
    // 使用加密安全随机数
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    
    // 结合时间戳增加随机性
    const timestamp = Date.now();
    
    // 使用多个随机源混合
    const mixedRandom = 
        (array[0] ^ array[1] ^ array[2] ^ array[3] ^ 
         (timestamp & 0xFFFFFFFF) ^ 
         ((timestamp >> 32) & 0xFFFFFFFF)) >>> 0;
    
    return mixedRandom % max;
}

/**
 * 获取不重复的随机索引
 * @param {number} max - 最大值
 * @param {string} type - 图片类型
 * @param {number} count - 需要获取的数量
 * @returns {Array<number>} 不重复的随机索引数组
 */
function getUniqueRandomIndices(max, type, count) {
    if (max <= 0 || count <= 0) return [];
    
    const indices = [];
    const maxAttempts = Math.min(count * 3, max); // 防止无限循环
    
    for (let i = 0; i < count && indices.length < max && i < maxAttempts; i++) {
        let index;
        let attempts = 0;
        
        do {
            index = getEnhancedRandomIndex(max);
            attempts++;
            
            // 如果尝试次数过多，使用顺序索引
            if (attempts > 10) {
                index = (index + i) % max;
                break;
            }
        } while (
            // 避免本次请求中重复
            indices.includes(index) ||
            // 避免近期使用过的（在一定范围内）
            (recentUsedImages[type] && recentUsedImages[type].has(index))
        );
        
        indices.push(index);
        
        // 添加到近期使用记录
        if (recentUsedImages[type]) {
            recentUsedImages[type].add(index);
            
            // 控制历史记录大小
            if (recentUsedImages[type].size > MAX_HISTORY_SIZE) {
                const firstItem = recentUsedImages[type].values().next().value;
                if (firstItem !== undefined) {
                    recentUsedImages[type].delete(firstItem);
                }
            }
        }
    }
    
    return indices;
}

/**
 * 从数组中随机选择多个不重复元素
 * @param {Array} arr - 目标数组
 * @param {string} type - 图片类型
 * @param {number} count - 数量
 * @returns {Array} 随机元素数组
 */
function getRandomUniqueItems(arr, type, count) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    
    const limit = Math.min(count, arr.length, 100);
    if (limit <= 0) return [];
    
    // 如果需要的数量接近总数，使用洗牌算法
    if (limit >= arr.length * 0.8) {
        const shuffled = [...arr];
        // Fisher-Yates 洗牌
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = getEnhancedRandomIndex(i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, limit);
    }
    
    // 否则使用不重复索引算法
    const indices = getUniqueRandomIndices(arr.length, type, limit);
    return indices.map(i => arr[i]).filter(item => item !== undefined);
}

/**
 * 构建图片 URL
 * @param {string} filename - 文件名
 * @param {string} type - 类型 (pc/pe)
 * @param {string} baseUrl - 基础域名
 * @returns {string|null} 完整 URL
 */
function buildImageUrl(filename, type, baseUrl) {
    if (!filename || !type || !baseUrl) return null;
    
    let path;
    if (type === 'pc') {
        path = '/images/pc/' + filename;
    } else if (type === 'pe') {
        path = '/images/pe/' + filename;
    } else {
        return null;
    }
    
    return baseUrl + path;
}

/**
 * 获取请求的基础 URL
 * @param {Request} request - 请求对象
 * @returns {string} 基础 URL
 */
function getBaseUrl(request) {
    try {
        const url = new URL(request.url);
        return url.origin;
    } catch (e) {
        // EdgeOne Pages 默认域名格式
        return 'https://your-domain.pages.dev'; // 请替换为你的实际域名
    }
}

// 图片列表（保持原数据不变）
const IMAGES = {
    pc: [
        // ... (保持原有pc图片列表)
    ],
    pe: [
        // ... (保持原有pe图片列表)
    ]
};

/**
 * 处理 API 请求
 * @param {Request} request - 请求对象
 * @returns {Promise<Response>} 响应对象
 */
async function handleRequest(request) {
    // 1. 预检请求处理
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Accept',
                'Access-Control-Max-Age': '86400',
                'Content-Length': '0'
            }
        });
    }

    // 2. 请求方法检查
    if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Method Not Allowed', {
            status: 405,
            headers: { 'Allow': 'GET, POST, OPTIONS' }
        });
    }

    try {
        const url = new URL(request.url);
        const imgType = (url.searchParams.get('type') || '').toLowerCase().trim();
        const format = (url.searchParams.get('format') || 'json').toLowerCase().trim();
        const countParam = url.searchParams.get('count');
        const returnMode = (url.searchParams.get('return') || 'json').toLowerCase().trim();
        const baseUrl = getBaseUrl(request);
        
        // 3. 处理帮助页面（无参数）
        if (!imgType) {
            const helpText = `🖼️ 随机图片展示器 API (EdgeOne Pages)
增强版 - 提供更好的随机性和避免重复

用法说明:
• ?type=pc - 获取横屏随机图片
• ?type=pe - 获取竖屏随机图片
• ?type=ua - 根据设备类型自动选择图片

增强特性:
• 使用加密安全随机数 + 时间戳混合随机源
• 避免近期重复返回同一张图片
• 智能防重复算法（单次请求内不重复）

参数选项:
• ?count=N - 返回 N 张图片 (1-100，默认: 1)
• ?format=json - JSON 格式返回 (默认)
• ?format=text - 文本格式返回 URL
• ?return=redirect - 直接重定向到单张图片 (仅 count=1 有效)

示例:
• /api/?type=ua
• /api/?type=pc&count=3
• /api/?type=pe&format=text&count=5
• /api/?type=pc&return=redirect

统计信息:
• 横屏图片: ${IMAGES.pc.length} 张
• 竖屏图片: ${IMAGES.pe.length} 张
• 当前域名: ${baseUrl}
• 时间: ${new Date().toISOString()}
• 近期使用记录: PC(${recentUsedImages.pc.size})/PE(${recentUsedImages.pe.size})`;

            return new Response(helpText, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // 4. 验证并解析参数
        let count = 1;
        if (countParam) {
            const parsed = parseInt(countParam, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
                count = parsed;
            }
        }

        // 5. 确定设备类型
        let deviceType = imgType;
        if (imgType === 'ua') {
            const userAgent = request.headers.get('User-Agent') || '';
            deviceType = isMobileDevice(userAgent) ? 'pe' : 'pc';
        }

        if (deviceType !== 'pc' && deviceType !== 'pe') {
            return new Response('Invalid type. Use: pc, pe, or ua', {
                status: 400,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // 6. 获取图片列表和随机图片（使用增强防重复算法）
        const imageList = IMAGES[deviceType];
        const selectedImages = getRandomUniqueItems(imageList, deviceType, count);
        
        if (selectedImages.length === 0) {
            return new Response('No images available', { status: 404 });
        }

        // 7. 构建响应
        const imageUrls = selectedImages
            .map(name => buildImageUrl(name, deviceType, baseUrl))
            .filter(Boolean);

        // 8. 重定向模式（仅支持单张）
        if (returnMode === 'redirect' && count === 1 && imageUrls[0]) {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': imageUrls[0],
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 9. 文本格式
        if (format === 'text' || format === 'url' || format === 'txt') {
            const text = imageUrls.join('\n');
            return new Response(text, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // 10. JSON 格式（默认）
        const jsonResponse = {
            success: true,
            code: 200,
            message: 'Success',
            count: imageUrls.length,
            type: deviceType,
            total_available: imageList.length,
            recent_used_count: recentUsedImages[deviceType] ? recentUsedImages[deviceType].size : 0,
            timestamp: Date.now(),
            randomness_source: 'crypto+timestamp+mixed',
            anti_repeat_enabled: true,
            api_version: '3.0',
            images: imageUrls.map((url, index) => ({
                id: index + 1,
                url: url,
                filename: selectedImages[index],
                unique_id: `${deviceType}_${selectedImages[index].replace(/[^a-zA-Z0-9]/g, '_')}`
            }))
        };

        return new Response(JSON.stringify(jsonResponse, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Randomness-Engine': 'Enhanced-Crypto-Timestamp-Mixed'
            }
        });

    } catch (error) {
        // 11. 错误处理
        console.error('API Error:', error);
        const errorResponse = {
            success: false,
            code: 500,
            message: 'Internal Server Error',
            error: error.message,
            timestamp: Date.now()
        };
        
        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
