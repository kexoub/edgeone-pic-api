
// EdgeOne Pages Function export
export function onRequest(context) {
    return handleRequest(context.request);
}

/**
 * 检测是否为移动设备（增强版）
 */
function isMobileDevice(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return false;

    const lowerUA = userAgent.toLowerCase();
    
    // 优先关键词匹配（更快）
    const mobileKeywords = [
        'mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry',
        'windows phone', 'opera mini', 'iemobile', 'mobile safari',
        'webos', 'kindle', 'silk', 'fennec', 'maemo', 'tablet'
    ];

    for (let keyword of mobileKeywords) {
        if (lowerUA.includes(keyword)) {
            return true;
        }
    }

    // 正则兜底
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
}

/**
 * 真正随机的索引生成（解决缓存和随机性问题）
 */
function getRandomIndex(max) {
    if (max <= 0) return 0;
    if (max === 1) return 0;

    // 方法1: 使用 crypto（推荐）
    try {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    } catch (e) {
        // 方法2: 使用时间戳 + 请求指纹（备用）
        const now = Date.now();
        const random = Math.sin(now) * 10000;
        return Math.floor(Math.abs(random)) % max;
    }
}

/**
 * 获取请求指纹（用于增加随机性）
 */
function getRequestFingerprint(request) {
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown';
    const ua = request.headers.get('User-Agent') || '';
    return `${ip}-${ua.slice(0, 50)}-${Date.now()}`;
}

/**
 * 从数组中随机选择元素（带强制刷新）
 */
function getRandomItem(arr, request) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    
    // 使用请求指纹增加随机性
    const fingerprint = getRequestFingerprint(request);
    const seed = fingerprint.length + Date.now();
    
    // 多种随机源混合
    let index = getRandomIndex(arr.length);
    
    // 如果有多个选择，确保不总是返回同一个
    if (arr.length > 1) {
        // 使用 fingerprint 的哈希来扰动索引
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            hash = (hash << 5) - hash + fingerprint.charCodeAt(i);
            hash = hash & hash; // 转换为32位整数
        }
        const offset = Math.abs(hash) % arr.length;
        index = (index + offset) % arr.length;
    }
    
    return arr[index];
}

/**
 * 构建带缓存破坏参数的 URL
 */
function buildImageUrl(filename, type, baseUrl) {
    if (!filename || !type || !baseUrl) return null;
    
    const path = type === 'pc' ? `/images/pc/${filename}` : `/images/pe/${filename}`;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    // 添加缓存破坏参数
    return `${baseUrl}${path}?v=${timestamp}&r=${random}`;
}

/**
 * 获取基础 URL
 */
function getBaseUrl(request) {
    try {
        const url = new URL(request.url);
        return url.origin;
    } catch (e) {
        return 'https://your-domain.pages.dev'; // 替换为你的实际域名
    }
}

// 图片列表（你的完整列表）
const IMAGES = {
    pc: [
        // 你的所有 PC 图片...
        "084e488e57a0ec6d5cc3ed0bd555b464108550804.webp",
        "100234583_p0.webp",
        // ... 保持你的完整列表
        "nachoneko-8276179.webp"
    ],
    pe: [
        // 你的所有 PE 图片...
        "100033979_p0_scale.webp",
        "100605558_p0.webp",
        // ... 保持你的完整列表
        "GZmKHXdaMAAIUbM_scale.webp"
    ]
};

async function handleRequest(request) {
    // 1. 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Accept',
                'Access-Control-Max-Age': '86400',
            }
        });
    }

    try {
        const url = new URL(request.url);
        const imgType = (url.searchParams.get('type') || '').toLowerCase().trim();
        const format = (url.searchParams.get('format') || 'json').toLowerCase().trim();
        const returnMode = (url.searchParams.get('return') || 'json').toLowerCase().trim();
        const debug = url.searchParams.get('debug'); // 调试参数

        const baseUrl = getBaseUrl(request);
        
        // 2. 帮助页面
        if (!imgType) {
            const help = `🖼️ 随机图片 API (已优化)

用法:
• ?type=pc - 横屏图片
• ?type=pe - 竖屏图片  
• ?type=ua - 自动检测设备
• ?debug  - 显示调试信息

参数:
• ?format=json/text
• ?return=redirect (仅单张)
• ?debug - 显示 UA 和检测结果

统计:
• PC: ${IMAGES.pc.length} 张
• PE: ${IMAGES.pe.length} 张
• 时间: ${new Date().toISOString()}`;
            
            return new Response(help, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        }

        // 3. 获取 User-Agent 和设备检测
        const userAgent = request.headers.get('User-Agent') || 'unknown';
        const realIP = request.headers.get('CF-Connecting-IP') || 
                       request.headers.get('X-Real-IP') || 
                       request.headers.get('X-Forwarded-For') || 'unknown';
        
        let deviceType = imgType;
        
        if (imgType === 'ua') {
            const isMobile = isMobileDevice(userAgent);
            deviceType = isMobile ? 'pe' : 'pc';
            
            // 调试信息
            if (debug) {
                return new Response(JSON.stringify({
                    detected: 'ua',
                    isMobile,
                    deviceType,
                    userAgent: userAgent.substring(0, 100),
                    realIP,
                    timestamp: Date.now()
                }, null, 2), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if (deviceType !== 'pc' && deviceType !== 'pe') {
            return new Response('Invalid type', { status: 400 });
        }

        // 4. 获取随机图片（关键：强制不缓存）
        const imageList = IMAGES[deviceType];
        const randomImage = getRandomItem(imageList, request);
        
        if (!randomImage) {
            return new Response('No images', { status: 404 });
        }

        const imageUrl = buildImageUrl(randomImage, deviceType, baseUrl);

        // 5. 重定向模式
        if (returnMode === 'redirect') {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': imageUrl,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 6. JSON 响应（带强制刷新头）
        const response = {
            success: true,
            code: 200,
            message: 'Success',
            type: deviceType,
            detected_by: imgType === 'ua' ? 'user-agent' : 'manual',
            image: {
                filename: randomImage,
                url: imageUrl
            },
            debug: debug ? {
                userAgent: userAgent.substring(0, 100),
                realIP,
                isMobile: deviceType === 'pe',
                timestamp: Date.now()
            } : undefined
        };

        return new Response(JSON.stringify(response, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                // 🔥 关键：强制不缓存
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                // 添加随机 ETag 防止 CDN 缓存
                'ETag': `"${Math.random().toString(36).substr(2, 9)}"`,
                // 添加时间戳防止代理缓存
                'X-Timestamp': Date.now().toString()
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message,
            timestamp: Date.now()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
