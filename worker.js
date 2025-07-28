// 存储监控任务的状态
const tasks = new Map();

// 处理 HTTP 请求
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      // 处理CORS预检请求
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }
      
      // 路由处理
      if (path === '/start' && request.method === 'POST') {
        return handleStart(request);
      } else if (path === '/stop' && request.method === 'POST') {
        return handleStop(request);
      } else if (path === '/status' && request.method === 'GET') {
        return handleStatus(request);
      } else if (path === '/' && request.method === 'GET') {
        return new Response(html, {
          headers: { 
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  },
};

// 处理CORS预检请求
function handleOptions(request) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// 启动监控
async function handleStart(request) {
  const data = await request.json();
  const taskId = crypto.randomUUID();
  
  const task = {
    id: taskId,
    url: data.url,
    interval: data.interval,
    email: data.email,
    checkCount: 0,
    lastCheck: null,
    lastResult: null,
    history: [],
    running: true
  };
  
  tasks.set(taskId, task);
  
  // 开始定期检查
  startMonitoring(taskId);
  
  return new Response(JSON.stringify({ id: taskId }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 停止监控
async function handleStop(request) {
  const data = await request.json();
  const task = tasks.get(data.id);
  
  if (task) {
    task.running = false;
    tasks.delete(data.id);
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 获取状态
async function handleStatus(request) {
  const url = new URL(request.url);
  const taskId = url.searchParams.get('id');
  const task = tasks.get(taskId);
  
  if (!task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
  
  return new Response(JSON.stringify({
    checkCount: task.checkCount,
    lastCheck: task.lastCheck,
    lastResult: task.lastResult,
    history: task.history
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 开始监控任务
function startMonitoring(taskId) {
  const task = tasks.get(taskId);
  if (!task || !task.running) return;
  
  // 模拟检查票务网站
  setTimeout(async () => {
    try {
      task.checkCount++;
      task.lastCheck = new Date().toISOString();
      
      // 这里应该是实际的票务网站检查逻辑
      // 为了示例，我们随机返回结果
      const isAvailable = Math.random() > 0.7;
      const result = {
        status: isAvailable ? 'TICKETS_AVAILABLE' : 'NO_TICKETS',
        details: isAvailable ? '门票现在可用！' : '没有可用门票',
        timestamp: new Date().toISOString()
      };
      
      task.lastResult = result;
      task.history.push(result);
      
      // 如果有票且设置了邮箱，发送通知
      if (isAvailable && task.email) {
        await sendNotification(task.email, task.url);
      }
      
      // 继续下一次检查
      if (task.running) {
        startMonitoring(taskId);
      }
    } catch (err) {
      console.error('监控出错:', err);
      const errorResult = {
        status: 'ERROR',
        details: err.message,
        timestamp: new Date().toISOString()
      };
      task.lastResult = errorResult;
      task.history.push(errorResult);
      
      if (task.running) {
        startMonitoring(taskId);
      }
    }
  }, task.interval);
}

// 发送邮件通知 (需要配置邮件服务)
async function sendNotification(email, url) {
  // 实际实现需要使用邮件API如SendGrid、Mailgun等
  console.log(`发送通知到 ${email}: 门票可用 ${url}`);
}

// 前端HTML (可选)
const html = `
<!DOCTYPE html>
<html>
<head>
    <title>马来西亚演唱会门票监控服务</title>
</head>
<body>
    <h1>马来西亚演唱会门票监控服务</h1>
    <p>后端服务正在运行</p>
    <p>请使用前端界面进行交互</p>
</body>
</html>
`;