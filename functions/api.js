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
    "62673771_p0.webp"
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
    "107775488_p0.webp"
];

// 检查数组是否为空
function validateImageArrays() {
    if (!pcImages || pcImages.length === 0) {
        console.error("pcImages数组为空或未定义");
        return false;
    }
    if (!peImages || peImages.length === 0) {
        console.error("peImages数组为空或未定义");
        return false;
    }
    return true;
}

// 从列表中随机选择单张图片
function getRandomImage(images) {
    if (!images || images.length === 0) {
        console.error("getRandomImage: 图片列表为空");
        return null;
    }
    var randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
}

// 从列表中随机选择多张图片（不重复）
function getRandomImages(images, count) {
    if (!images || images.length === 0) {
        console.error("getRandomImages: 图片列表为空");
        return [];
    }
    
    // 如果请求数量大于可用数量，则只返回最大可用数量
    var maxCount = Math.min(count, images.length);
    
    // 复制数组以避免修改原数组
    var shuffled = [...images];
    
    // 随机打乱数组
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 返回前maxCount个元素
    return shuffled.slice(0, maxCount);
}

// 构建图片URL
function buildImageUrl(imageName, type) {
    if (type === 'pc') {
        return '/images/pc/' + imageName;
    } else if (type === 'pe') {
        return '/images/pe/' + imageName;
    }
    return null;
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
        
        // 验证图片数组
        if (!validateImageArrays()) {
            return new Response('❌ 图片列表初始化失败，请检查代码', {
                status: 500,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 如果没有type参数，显示帮助
        if (!imgType) {
            var helpText = '🖼️ 随机图片展示器 API\n\n';
            helpText += '使用方法:\n';
            helpText += '• ?type=pc - 获取横屏随机图片\n';
            helpText += '• ?type=pe - 获取竖屏随机图片\n';
            helpText += '• ?type=ua - 根据设备类型自动选择图片\n';
            helpText += '\n可选参数:\n';
            helpText += '• ?format=text - 以文本格式返回URL（每行一个）\n';
            helpText += '• ?count=N - 返回N张图片（1-10）\n';
            helpText += '\n示例:\n';
            helpText += '• /api/?type=ua\n';
            helpText += '• /api/?type=pc&format=text&count=4\n';
            helpText += '\n图片统计:\n';
            helpText += '• 横屏图片数量: ' + pcImages.length + '\n';
            helpText += '• 竖屏图片数量: ' + peImages.length + '\n';
            
            return new Response(helpText, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        // 确定设备类型
        var deviceType = imgType;
        if (imgType === 'ua') {
            var userAgent = request.headers.get('User-Agent') || '';
            deviceType = isMobileDevice(userAgent) ? 'pe' : 'pc';
        }
        
        // 选择图片列表
        var imageList = deviceType === 'pc' ? pcImages : peImages;
        
        // 验证count参数
        count = Math.max(1, Math.min(10, count));
        
        // 获取图片
        var selectedImages;
        if (count === 1) {
            var singleImage = getRandomImage(imageList);
            if (!singleImage) {
                throw new Error('获取单张图片失败');
            }
            selectedImages = [singleImage];
        } else {
            selectedImages = getRandomImages(imageList, count);
            if (selectedImages.length === 0) {
                throw new Error('获取多张图片失败');
            }
        }
        
        // 构建图片URL数组
        var imageUrls = selectedImages.map(function(image) {
            return buildImageUrl(image, deviceType);
        });
        
        // 根据format参数返回不同格式
        if (format === 'text' || format === 'txt') {
            // 文本格式：每行一个URL
            var textResponse = imageUrls.join('\n');
            return new Response(textResponse, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
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
                type: deviceType,
                total_available: imageList.length,
                timestamp: Date.now(),
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
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } else if (format === 'redirect') {
            // 重定向模式（仅当count=1时有效）
            if (count === 1) {
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': imageUrls[0],
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } else {
                return new Response('重定向模式仅支持单张图片（count=1）', {
                    status: 400,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        } else {
            return new Response('不支持的format参数。可用值：json, text, redirect', {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
    } catch (error) {
        var errorDetails = '❌ 内部错误\n\n';
        errorDetails += '错误消息: ' + error.message + '\n';
        if (error.stack) {
            errorDetails += '错误堆栈: ' + error.stack + '\n';
        }
        errorDetails += '请求地址: ' + request.url + '\n';
        errorDetails += '时间戳: ' + new Date().toISOString() + '\n';
        errorDetails += '图片数组状态: pc=' + (pcImages ? pcImages.length : 0) + 
                       ', pe=' + (peImages ? peImages.length : 0);
        
        return new Response(errorDetails, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
