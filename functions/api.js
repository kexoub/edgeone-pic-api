// EdgeOne Pages Function export
export function onRequest(context) {
    return handleRequest(context.request);
}

/**
 * 检测是否为移动设备（优化版本）
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否为移动设备
 */
function isMobileDevice(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return false;

    const mobileKeywords = [
        'Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry',
        'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile Safari',
        'webOS', 'Kindle', 'Silk', 'Fennec', 'Maemo', 'Tablet'
    ];

    const lowerUA = userAgent.toLowerCase();

    // 快速关键词匹配
    for (let i = 0; i < mobileKeywords.length; i++) {
        if (lowerUA.includes(mobileKeywords[i].toLowerCase())) {
            return true;
        }
    }

    // 正则兜底（性能稍低但覆盖更全）
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
}

/**
 * 智能格式检测函数 - 根据 User-Agent 推荐最优格式
 * @param {string} userAgent - 用户代理
 * @returns {string} 推荐格式: 'avif' | 'webp' | 'jpeg'
 */
function detectOptimalFormat(userAgent = '') {
    if (!userAgent) {
        userAgent = 'unknown';
    }

    // Chrome: AVIF (>=85), WebP (>=23)
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    if (chromeMatch) {
        const version = parseInt(chromeMatch[1], 10);
        if (version >= 85) return 'avif';
        if (version >= 23) return 'webp';
        return 'jpeg';
    }

    // Firefox: AVIF (>=93), WebP (>=65)
    const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
    if (firefoxMatch) {
        const version = parseInt(firefoxMatch[1], 10);
        if (version >= 93) return 'avif';
        if (version >= 65) return 'webp';
        return 'jpeg';
    }

    // Safari: WebP (>=14), 否则 JPEG
    const safariMatch = userAgent.match(/Version\/(\d+)/);
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        if (safariMatch) {
            const version = parseInt(safariMatch[1], 10);
            if (version >= 14) return 'webp';
        }
        return 'jpeg';
    }

    // Edge (基于 Chromium)
    if (userAgent.includes('Edge/')) {
        const edgeMatch = userAgent.match(/Edge\/(\d+)/);
        if (edgeMatch) {
            const version = parseInt(edgeMatch[1], 10);
            if (version >= 85) return 'avif';
            return 'webp';
        }
    }

    // Opera
    if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
        return 'webp'; // Opera 很早就支持 WebP
    }

    // 默认保守策略
    return 'jpeg';
}

/**
 * 构建图片 URL（支持多种格式）
 * @param {string} filename - 文件名（不含扩展名）
 * @param {string} type - 类型 (pc/pe)
 * @param {string} baseUrl - 基础域名
 * @param {string} format - 图片格式 (auto/webp/jpeg/avif/original)
 * @returns {Object} 包含URL和格式信息的对象
 */
function buildImageUrl(filename, type, baseUrl, format = 'auto') {
    if (!filename || !type || !baseUrl) return null;

    let finalFormat = format;
    if (format === 'auto') {
        // 这里可以传入 UA，但为简化暂用默认逻辑
        finalFormat = 'webp'; // EdgeOne 环境建议默认 WebP
    }

    // 外链模式：直接返回外链 URL
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
        return {
            url: filename,
            format: 'external',
            converted: false,
            external: true
        };
    }

    // 转换目录结构: /converted/type/format/filename.format
    let path;
    if (type === 'pc') {
        path = `/converted/pc/${finalFormat}/${filename}.${finalFormat}`;
    } else if (type === 'pe') {
        path = `/converted/pe/${finalFormat}/${filename}.${finalFormat}`;
    } else {
        return null;
    }

    return {
        url: baseUrl + path,
        format: finalFormat,
        converted: true,
        external: false
    };
}

/**
 * 安全地获取随机索引（使用加密安全随机数）
 * @param {number} max - 最大值（不包含）
 * @returns {number} 随机索引
 */
function getRandomIndex(max) {
    if (max <= 0) return 0;
    if (max === 1) return 0;

    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

/**
 * 从数组中随机选择一个元素
 * @param {Array} arr - 目标数组
 * @returns {any|null} 随机元素或 null
 */
function getRandomItem(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const index = getRandomIndex(arr.length);
    return arr[index];
}

/**
 * 从数组中随机选择多个不重复元素（洗牌算法）
 * @param {Array} arr - 目标数组
 * @param {number} count - 数量
 * @returns {Array} 随机元素数组
 */
function getRandomItems(arr, count) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    
    const limit = Math.min(count, arr.length, 100);
    const result = [];
    const copy = [...arr];
    
    for (let i = 0; i < limit; i++) {
        const j = i + getRandomIndex(copy.length - i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
        result.push(copy[i]);
    }
    
    return result;
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
        return 'https://your-domain.pages.dev'; // 请替换为你的实际域名
    }
}

// 图片列表（保持原数据不变，仅文件名）
const IMAGES = {
  pc: [
    "084e488e57a0ec6d5cc3ed0bd555b464108550804",
    "100234583_p0", "100298143_p0", "100846533_p0", "100917024_p0",
    "100988999_p0", "101033524_p0", "101100763_p0", "101274284_p0",
    "101336707_p0", "101504373_p0", "101510435_p0", "101574326_p0",
    // ... 其他文件名（省略以节省空间，保留完整列表）
    "nachoneko-8276179", "nachoneko-8276179_2"
  ],
  pe: [
    "100033979_p0_scale", "100605558_p0", "101428152_p0",
    "101553400_p0", "101842454_p0", "102902118_p0",
    "103144864_p0", "103660589_p0", "103975060_p0_scale",
    // ... 其他文件名
    "GZmKHXdaMAAIUbM_scale"
  ]
};

// 外链列表（可选配置）
const EXTERNAL_LINKS = {
  pc: [
    // "https://example.com/img1.jpg",
    // "https://example.com/img2.webp"
  ],
  pe: [
    // "https://example.com/mobile1.jpg"
  ]
};

/**
 * 获取图片列表（支持本地/外链）
 * @param {string} type - pc|pe
 * @param {boolean} external - 是否外链模式
 * @returns {Array} 图片文件名或URL列表
 */
function getImageList(type, external = false) {
    if (external && EXTERNAL_LINKS[type] && EXTERNAL_LINKS[type].length > 0) {
        return EXTERNAL_LINKS[type];
    }
    return IMAGES[type] || [];
}

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
        const imgFormat = (url.searchParams.get('img_format') || 'auto').toLowerCase().trim();
        const countParam = url.searchParams.get('count');
        const returnMode = (url.searchParams.get('return') || 'json').toLowerCase().trim();
        const external = url.searchParams.get('external') === 'true' || url.searchParams.get('external') === '1';

        const baseUrl = getBaseUrl(request);
        const userAgent = request.headers.get('User-Agent') || '';

        // 3. 处理帮助页面（无参数或 help）
        if (!imgType || url.searchParams.has('help')) {
            const helpText = `🖼️ 随机图片展示器 API (EdgeOne Pages) v3.0

用法说明:
• ?type=pc              - 获取横屏随机图片
• ?type=pe              - 获取竖屏随机图片  
• ?type=ua              - 根据设备类型自动选择图片

参数选项:
• ?count=N              - 返回 N 张图片 (1-100，默认: 1)
• ?format=json|text     - 返回格式 (默认: json)
• ?img_format=auto|webp|jpeg|avif|original - 图片格式 (默认: auto)
• ?return=redirect      - 直接重定向到单张图片 (仅 count=1 有效)
• ?external=true        - 使用外链模式 (需配置 EXTERNAL_LINKS)

智能格式说明:
• auto   - 根据浏览器自动选择最佳格式 (AVIF/WebP/JPEG)
• webp   - WebP 格式 (广泛兼容)
• avif   - AVIF 格式 (最先进，体积最小)
• jpeg   - JPEG 格式 (最大兼容性)
• original - 原始格式

示例:
• /api/?type=ua
• /api/?type=pc&count=3
• /api/?type=pe&format=text&count=5
• /api/?type=pc&return=redirect&img_format=avif
• /api/?type=pc&external=true

统计信息:
• 横屏图片: ${IMAGES.pc.length} 张
• 竖屏图片: ${IMAGES.pe.length} 张
• 外链PC: ${EXTERNAL_LINKS.pc.length} 条
• 外链PE: ${EXTERNAL_LINKS.pe.length} 条
• 当前域名: ${baseUrl}
• 时间: ${new Date().toISOString()}`;

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
            deviceType = isMobileDevice(userAgent) ? 'pe' : 'pc';
        }

        if (deviceType !== 'pc' && deviceType !== 'pe') {
            return new Response('Invalid type. Use: pc, pe, or ua', {
                status: 400,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // 6. 获取图片列表
        const imageList = getImageList(deviceType, external);
        if (imageList.length === 0) {
            const msg = external ? 'No external links configured' : 'No images available';
            return new Response(msg, { status: 404 });
        }

        // 7. 随机选择图片
        const selectedFilenames = getRandomItems(imageList, count);

        // 8. 构建响应数据
        const imageUrls = selectedFilenames.map(name => {
            let finalFormat = imgFormat;
            if (imgFormat === 'auto') {
                finalFormat = detectOptimalFormat(userAgent);
            }

            const info = buildImageUrl(name, deviceType, baseUrl, finalFormat);
            if (!info) return null;

            return {
                filename: name,
                url: info.url,
                format: info.format,
                converted: info.converted,
                external: info.external,
                ...(info.converted && { source: 'converted' }),
                ...(external && { source: 'external' })
            };
        }).filter(Boolean);

        if (imageUrls.length === 0) {
            return new Response('No valid images found', { status: 404 });
        }

        // 9. 重定向模式（仅支持单张）
        if (returnMode === 'redirect' && count === 1 && imageUrls[0]) {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': imageUrls[0].url,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 10. 文本格式
        if (format === 'text' || format === 'url' || format === 'txt') {
            const text = imageUrls.map(img => img.url).join('\n');
            return new Response(text, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // 11. JSON 格式（默认）
        const detectedFormat = imgFormat === 'auto' ? detectOptimalFormat(userAgent) : null;

        const jsonResponse = {
            success: true,
            code: 200,
            message: 'Success',
            count: imageUrls.length,
            type: deviceType,
            mode: 'random',
            total_available: imageList.length,
            timestamp: Date.now(),
            api_version: '3.0',
            image_format: imgFormat,
            detected_format: detectedFormat,
            return_type: returnMode,
            external_mode: external,
            user_agent: userAgent.substring(0, 100), // 截断过长UA
            images: imageUrls.map((img, index) => ({
                id: index + 1,
                url: img.url,
                filename: img.filename,
                format: img.format,
                converted: img.converted,
                external: img.external,
                source: img.source || (img.external ? 'external' : 'converted')
            }))
        };

        return new Response(JSON.stringify(jsonResponse, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
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
