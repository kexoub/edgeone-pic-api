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
let imageListCache = {
  pe: null,
  pc: null,
  lastUpdated: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 从文件读取图片列表
async function loadImageList(type) {
  // 检查缓存
  const now = Date.now();
  if (imageListCache[type] && (now - imageListCache.lastUpdated) < CACHE_DURATION) {
    return imageListCache[type];
  }
  
  try {
    // 构建列表文件URL
    const listFileUrl = `/${type}/${type}_list.txt`;
    
    // 获取列表文件
    const response = await fetch(listFileUrl);
    
    if (!response.ok) {
      throw new Error(`无法获取${type}图片列表: ${response.status}`);
    }
    
    const text = await response.text();
    
    // 按行分割并过滤空行
    const imageList = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')); // 支持注释行（以#开头）
    
    // 更新缓存
    imageListCache[type] = imageList;
    imageListCache.lastUpdated = now;
    
    console.log(`加载${type}图片列表成功，共${imageList.length}张图片`);
    return imageList;
  } catch (error) {
    console.error(`加载${type}图片列表失败:`, error);
    
    // 如果缓存中有数据，即使获取失败也返回缓存的数据
    if (imageListCache[type]) {
      console.log('使用缓存的图片列表');
      return imageListCache[type];
    }
    
    throw error;
  }
}

async function handleRequest(request) {
  try {
    var url = new URL(request.url);
    var pathname = url.pathname;
    
    // 根据路径决定图片类型
    if (pathname === '/pc' || pathname === '/pc/') {
      // 从pc目录（横屏图片）随机选择
      var pcImages = await loadImageList('pc');
      
      if (pcImages.length === 0) {
        return new Response('没有可用的横屏图片', { 
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      
      var randomIndex = Math.floor(Math.random() * pcImages.length);
      var imageUrl = '/pc/' + pcImages[randomIndex];
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (pathname === '/pe' || pathname === '/pe/') {
      // 从pe目录（竖屏图片）随机选择
      var peImages = await loadImageList('pe');
      
      if (peImages.length === 0) {
        return new Response('没有可用的竖屏图片', { 
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      
      var randomIndex = Math.floor(Math.random() * peImages.length);
      var imageUrl = '/pe/' + peImages[randomIndex];
      
      // 返回重定向
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else if (pathname === '/ua' || pathname === '/ua/') {
      // 根据User-Agent检测设备类型
      var userAgent = request.headers.get('User-Agent') || '';
      var isMobile = isMobileDevice(userAgent);
      
      if (isMobile) {
        // 移动设备，返回竖屏图片（pe目录）
        var peImages = await loadImageList('pe');
        
        if (peImages.length === 0) {
          return new Response('没有可用的竖屏图片', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        
        var randomIndex = Math.floor(Math.random() * peImages.length);
        var imageUrl = '/pe/' + peImages[randomIndex];
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': imageUrl,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        // 桌面设备，返回横屏图片（pc目录）
        var pcImages = await loadImageList('pc');
        
        if (pcImages.length === 0) {
          return new Response('没有可用的横屏图片', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        
        var randomIndex = Math.floor(Math.random() * pcImages.length);
        var imageUrl = '/pc/' + pcImages[randomIndex];
        
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
      var pcImages = await loadImageList('pc');
      var peImages = await loadImageList('pe');
      
      var helpText = '🖼️ 随机图片展示器\n\n';
      helpText += '使用方法:\n';
      helpText += '• /pc - 获取横屏随机图片\n';
      helpText += '• /pe - 获取竖屏随机图片\n';
      helpText += '• /ua - 根据设备类型自动选择图片\n';
      helpText += '\n当前图片统计:\n';
      helpText += '• 横屏图片 (pc): ' + pcImages.length + ' 张\n';
      helpText += '• 竖屏图片 (pe): ' + peImages.length + ' 张\n';
      helpText += '\n目录结构:\n';
      helpText += '• /pc/ - 横屏图片目录，包含 pc_list.txt\n';
      helpText += '• /pe/ - 竖屏图片目录，包含 pe_list.txt\n';
      
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}