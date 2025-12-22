// EdgeOne Pages Function export 
export function onRequest(context) {
    return handleRequest(context.request);
}

// 检测是否为移动设备
function isMobileDevice(userAgent) {
    if (!userAgent) return false;
    var mobileKeywords = [
        'Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry',
        'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile Safari',
        'webOS', 'Kindle', 'Silk', 'Fennec', 'Maemo', 'Tablet'
    ];
    var lowerUserAgent = userAgent.toLowerCase();
    
    // 检查移动设备关键词
    for (var i = 0; i < mobileKeywords.length; i++) {
        if (lowerUserAgent.includes(mobileKeywords[i].toLowerCase())) {
            return true;
        }
    }
    
    // 检查移动设备正则表达式
    var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return mobileRegex.test(userAgent);
}

// 横屏图片列表 (PC)
var pcImages = [
    // ... (保持原有的pcImages数组不变)
];

// 竖屏图片列表 (PE)
var peImages = [
    // ... (保持原有的peImages数组不变)
];

// 从列表中随机选择多张图片（不重复）
function getRandomImages(images, count) {
    if (!images || images.length === 0) {
        throw new Error('图片列表为空');
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

// 构建图片URL
function buildImageUrl(imageName, type) {
    if (type === 'pc') {
        return '/images/pc/' + imageName;
    } else if (type === 'pe') {
        return '/images/pe/' + imageName;
    }
    return null;
}

// 处理设备类型检测
function determineImageType(request, imgType) {
    if (imgType === 'ua') {
        var userAgent = request.headers.get('User-Agent') || '';
        return isMobileDevice(userAgent) ? 'pe' : 'pc';
    }
    return imgType; // 直接返回pc或pe
}

async function handleRequest(request) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
                'Access-Control-Max-Age': '86400',
            }
        });
    }
    
    try {
        var url = new URL(request.url);
        var imgType = url.searchParams.get('type');
        var format = url.searchParams.get('format') || 'json';
        var count = parseInt(url.searchParams.get('count')) || 1;
        var returnType = url.searchParams.get('return') || 'json'; // 新增return参数支持
        
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
            var helpText = '🖼️ 随机图片展示器 (EdgeOne API)\n\n';
            helpText += '使用方法:\n';
            helpText += '• ?type=pc - 获取横屏随机图片\n';
            helpText += '• ?type=pe - 获取竖屏随机图片\n';
            helpText += '• ?type=ua - 根据设备类型自动选择图片\n';
            helpText += '\n可选参数:\n';
            helpText += '• ?format=text - 以文本格式返回URL（每行一个）\n';
            helpText += '• ?count=N - 返回N张图片（1-20）\n';
            helpText += '• ?return=json - 返回JSON格式（默认）\n';
            helpText += '• ?return=redirect - 重定向到单张图片（count=1时有效）\n';
            helpText += '\n示例:\n';
            helpText += '• /api/?type=ua - 自动设备检测，返回JSON\n';
            helpText += '• /api/?type=pc&format=text&count=4 - 4张横屏图片，文本格式\n';
            helpText += '• /api/?type=pe&count=3 - 3张竖屏图片，JSON格式\n';
            helpText += '\n当前项目结构:\n';
            helpText += '• 横屏图片: /images/pc/\n';
            helpText += '• 竖屏图片: /images/pe/\n';
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
        
        // 确定要使用的图片列表
        var finalImageType = determineImageType(request, imgType);
        var imageList = finalImageType === 'pc' ? pcImages : peImages;
        
        // 获取随机图片
        var selectedImages = getRandomImages(imageList, count);
        
        // 如果是单张图片且请求重定向
        if (count === 1 && (returnType === 'redirect' || format === 'redirect')) {
            var randomImage = selectedImages[0];
            var imageUrl = buildImageUrl(randomImage, finalImageType);
            
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
        
        // 构建图片URL数组
        var imageUrls = selectedImages.map(function(image) {
            return buildImageUrl(image, finalImageType);
        });
        
        // 根据format参数返回不同格式
        if (format === 'text' || format === 'url') {
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
        } else {
            // 默认返回JSON格式
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
        }
        
    } catch (error) {
        var errorDetails = '❌ 内部错误\n\n';
        errorDetails += '错误消息: ' + error.message + '\n';
        errorDetails += '错误堆栈: ' + error.stack + '\n';
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
