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

// 图片列表缓存
var imageListCache = {
  pc: null,
  pe: null
};

// 从txt文件获取图片列表
async function getImageList(type) {
  // 如果缓存中有，直接返回
  if (imageListCache[type]) {
    return imageListCache[type];
  }
  
  try {
    var listFile = type === 'pc' ? '/pc_list.txt' : '/pe_list.txt';
    var response = await fetch(listFile);
    
    if (!response.ok) {
      throw new Error(`无法获取${listFile}: ${response.status}`);
    }
    
    var text = await response.text();
    var lines = text.split('\n').filter(function(line) {
      return line.trim() !== '';
    });
    
    // 缓存结果
    imageListCache[type] = lines;
    return lines;
  } catch (error) {
    console.error('获取图片列表失败:', error);
    throw error;
  }
}

// 从列表中随机选择图片
function getRandomImage(images) {
  if (!images || images.length === 0) {
    throw new Error('图片列表为空');
  }
  
  var randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex].trim();
}

async function handleRequest(request) {
  try {
    var url = new URL(request.url);
    var imgType = url.searchParams.get('type');
    
    if (imgType === 'pc') {
      // 获取横屏图片列表并随机选择
      var pcImages = await getImageList('pc');
      var randomImage = getRandomImage(pcImages);
      var imageUrl = '/images/pc/' + randomImage;
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (imgType === 'pe') {
      // 获取竖屏图片列表并随机选择
      var peImages = await getImageList('pe');
      var randomImage = getRandomImage(peImages);
      var imageUrl = '/images/pe/' + randomImage;
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (imgType === 'ua') {
      // 根据User-Agent检测设备类型
      var userAgent = request.headers.get('User-Agent') || '';
      var isMobile = isMobileDevice(userAgent);
      
      if (isMobile) {
        // 移动设备，返回竖屏图片
        var peImages = await getImageList('pe');
        var randomImage = getRandomImage(peImages);
        var imageUrl = '/images/pe/' + randomImage;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        // 桌面设备，返回横屏图片
        var pcImages = await getImageList('pc');
        var randomImage = getRandomImage(pcImages);
        var imageUrl = '/images/pc/' + randomImage;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else {
      // 显示使用说明
      var helpText = '🖼️ 随机图片展示器\n\n';
      helpText += '使用方法:\n';
      helpText += '• ?type=pc - 获取横屏随机图片\n';
      helpText += '• ?type=pe - 获取竖屏随机图片\n';
      helpText += '• ?type=ua - 根据设备类型自动选择图片\n';
      helpText += '\n当前项目结构:\n';
      helpText += '• 横屏图片: /images/pc/\n';
      helpText += '• 竖屏图片: /images/pe/\n';
      helpText += '• 图片列表: /pc_list.txt 和 /pe_list.txt\n';
      
      return new Response(helpText, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
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