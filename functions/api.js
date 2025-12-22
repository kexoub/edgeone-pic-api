// EdgeOne Pages Function export 
export function onRequest(context) {
    return handleRequest(context.request);
}

// 检测是否为移动设备
function isMobileDevice(userAgent) {
    if (!userAgent) return false;
    var lowerUserAgent = userAgent.toLowerCase();
    var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
    return mobileRegex.test(lowerUserAgent);
}

// 精简的横屏图片列表 (PC)
var pcImages = [
    "084e488e57a0ec6d5cc3ed0bd555b464108550804.webp",
    "22833647_p0.webp",
    "29532157_p0.webp",
    "47402965_p0.webp",
    "50619407_p0.webp",
    "53031871_p0_scale.webp",
    "54328446_p0.webp",
    "56471449_p0.webp",
    "56733316_p0.webp",
    "61331263_p0.webp",
    "61424301_p0.webp",
    "61749296_p0.webp",
    "62673771_p0.webp",
    "64458014_p0_scale.webp",
    "64723229_p0.webp",
    "66595782_p0.webp",
    "66897076_p0.webp",
    "67467570_p0_scale.webp",
    "67785155_p0.webp",
    "67993516_p0.webp"
];

// 精简的竖屏图片列表 (PE)
var peImages = [
    "100033979_p0_scale.webp",
    "100605558_p0.webp",
    "101428152_p0.webp",
    "101553400_p0.webp",
    "101842454_p0.webp",
    "102902118_p0.webp",
    "103144864_p0.webp",
    "103660589_p0.webp",
    "103975060_p0_scale.webp",
    "104111187_p0.webp",
    "106637640_p0.webp",
    "107637438_p0.webp",
    "107775488_p0.webp",
    "108255796_p0.webp",
    "108926354_p0_scale.webp",
    "109306068_p0.webp",
    "109576082_p0.webp",
    "109887728_p0_scale.webp",
    "109915862_p0_scale.webp",
    "110210812_p0.webp"
];

// 从列表中随机选择多张图片（不重复）
function getRandomImages(images, count) {
    if (!images || images.length === 0) {
        return []; // 返回空数组而不是抛出错误
    }
    
    // 如果请求数量大于可用数量，则只返回最大可用数量
    var maxCount = Math.min(count, images.length);
    
    // 复制数组以避免修改原数组
    var shuffled = [...images];
    
    // Fisher-Yates洗牌算法
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    
    // 返回前maxCount个元素
    return shuffled.slice(0, maxCount);
}

// 构建完整的图片URL
function buildImageUrl(imageName, type, baseUrl) {
    var path = '';
    if (type === 'pc') {
        path = '/images/pc/' + imageName;
    } else if (type === 'pe') {
        path = '/images/pe/' + imageName;
    } else {
        return null;
    }
    
    // 返回完整URL
    return baseUrl + path;
}

// 获取基础URL（协议+域名+端口）
function getBaseUrl(requestUrl) {
    try {
        var url = new URL(requestUrl);
        return url.origin; // 返回协议+域名+端口
    } catch (e) {
        // 如果解析失败，返回一个默认值
        return 'https://img-pic-api.072168.xyz';
    }
}

async function handleRequest(request) {
    try {
        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }
        
        var url = new URL(request.url);
        var imgType = url.searchParams.get('type');
        var format = url.searchParams.get('format') || 'json';
        var count = parseInt(url.searchParams.get('count')) || 1;
        
        // 获取基础URL
        var baseUrl = getBaseUrl(request.url);
        
        // 验证count参数
        if (isNaN(count) || count < 1) {
            count = 1;
        }
        
        // 限制最大数量以避免性能问题
        var maxAllowedCount = 20;
        if (count > maxAllowedCount) {
            count = maxAllowedCount;
        }
        
        // 处理没有type参数的情况
        if (!imgType) {
            var helpText = '🖼️ 随机图片展示器 API (EdgeOne Pages)\n\n';
            helpText += '使用方法:\n';
            helpText += '• ?type=pc - 获取横屏随机图片\n';
            helpText += '• ?type=pe - 获取竖屏随机图片\n';
            helpText += '• ?type=ua - 根据设备类型自动选择图片\n';
            helpText += '\n可选参数:\n';
            helpText += '• ?format=text - 以文本格式返回URL（每行一个）\n';
            helpText += '• ?count=N - 返回N张图片（1-20）\n';
            helpText += '• ?return=json - 返回JSON格式（默认）\n';
            helpText += '\n示例:\n';
            helpText += '• /api/?type=ua\n';
            helpText += '• /api/?type=pc&format=text&count=4\n';
            helpText += '• /api/?type=pe&count=3\n';
            helpText += '\n当前图片统计:\n';
            helpText += '• 横屏图片数量: ' + pcImages.length + '\n';
            helpText += '• 竖屏图片数量: ' + peImages.length + '\n';
            helpText += '\n注意：返回的是完整的图片URL，可直接使用\n';
            
            return new Response(helpText, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 确定要使用的图片列表
        var finalImageType = imgType;
        if (imgType === 'ua') {
            var userAgent = request.headers.get('User-Agent') || '';
            finalImageType = isMobileDevice(userAgent) ? 'pe' : 'pc';
        }
        
        var imageList = finalImageType === 'pc' ? pcImages : peImages;
        
        // 获取随机图片
        var selectedImages = getRandomImages(imageList, count);
        
        if (selectedImages.length === 0) {
            return new Response('没有找到图片，请检查图片列表配置', {
                status: 404,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 构建完整的图片URL数组
        var imageUrls = selectedImages.map(function(image) {
            return buildImageUrl(image, finalImageType, baseUrl);
        });
        
        // 根据format参数返回不同格式
        if (format === 'text' || format === 'url' || format === 'txt') {
            // 文本格式：每行一个完整的URL
            var textResponse = imageUrls.join('\n');
            
            return new Response(textResponse, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } else if (format === 'json') {
            // JSON格式（默认）
            var jsonResponse = {
                success: true,
                code: 200,
                message: '获取成功',
                count: selectedImages.length,
                type: finalImageType,
                total_available: imageList.length,
                timestamp: Date.now(),
                api_version: '1.0',
                images: imageUrls.map(function(url, index) {
                    return {
                        url: url,
                        filename: selectedImages[index],
                        id: index + 1
                    };
                })
            };
            
            return new Response(JSON.stringify(jsonResponse, null, 2), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } else {
            // 默认返回JSON格式
            var defaultResponse = {
                success: false,
                message: '不支持的format参数。可用值：json, text'
            };
            
            return new Response(JSON.stringify(defaultResponse, null, 2), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
    } catch (error) {
        var errorDetails = '❌ 内部错误\n\n';
        errorDetails += '错误消息: ' + error.message + '\n';
        if (error.stack) {
            errorDetails += '错误堆栈: ' + error.stack.substring(0, 200) + '...\n';
        }
        errorDetails += '请求地址: ' + request.url + '\n';
        errorDetails += '时间戳: ' + new Date().toISOString();
        
        return new Response(errorDetails, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
