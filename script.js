document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const WORKER_URL = "https://workerjs.stanlyng0.workers.dev";
    const eventUrlInput = document.getElementById('event-url');
    const refreshIntervalSelect = document.getElementById('refresh-interval');
    const notificationEmailInput = document.getElementById('notification-email');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusDiv = document.getElementById('status');
    const statusMessage = document.getElementById('status-message');
    const checkCount = document.getElementById('check-count');
    const lastCheck = document.getElementById('last-check');
    const resultsContainer = document.getElementById('results-container');
    
    // 标签页切换
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
    
    // 监控状态
    let monitoring = false;
    let monitorId = null;
    let statusCheckInterval = null;
    
    // 设置Worker URL - 替换为您的Cloudflare Worker URL
    const WORKER_URL = 'https://your-worker-name.your-subdomain.workers.dev';
    
    // 开始监控
    startBtn.addEventListener('click', async function() {
        const eventUrl = eventUrlInput.value.trim();
        const interval = parseInt(refreshIntervalSelect.value) * 60 * 1000; // 转换为毫秒
        const email = notificationEmailInput.value.trim();
        
        if (!eventUrl) {
            showAlert('请输入有效的演唱会页面URL', 'error');
            return;
        }
        
        try {
            const response = await axios.post(`${WORKER_URL}/start`, {
                url: eventUrl,
                interval: interval,
                email: email
            });
            
            monitoring = true;
            monitorId = response.data.id;
            
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            statusDiv.classList.remove('hidden');
            
            showAlert('监控已启动', 'success');
            updateStatus('监控运行中...');
            
            // 初始获取状态
            fetchMonitorStatus();
            
            // 定期更新状态 (每10秒)
            statusCheckInterval = setInterval(fetchMonitorStatus, 10000);
            
        } catch (error) {
            console.error('启动监控失败:', error);
            showAlert('启动监控失败: ' + (error.response?.data?.message || error.message), 'error');
        }
    });
    
    // 停止监控
    stopBtn.addEventListener('click', async function() {
        if (!monitorId) return;
        
        try {
            await axios.post(`${WORKER_URL}/stop`, {
                id: monitorId
            });
            
            monitoring = false;
            monitorId = null;
            
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
            }
            
            showAlert('监控已停止', 'info');
            updateStatus('监控已停止');
            
        } catch (error) {
            console.error('停止监控失败:', error);
            showAlert('停止监控失败: ' + (error.response?.data?.message || error.message), 'error');
        }
    });
    
    // 获取监控状态
    async function fetchMonitorStatus() {
        if (!monitorId) return;
        
        try {
            const response = await axios.get(`${WORKER_URL}/status?id=${monitorId}`);
            const data = response.data;
            
            checkCount.textContent = data.checkCount || 0;
            lastCheck.textContent = data.lastCheck ? formatDate(data.lastCheck) : '-';
            
            if (data.lastResult) {
                updateStatus(`最后检查: ${data.lastResult.status === 'TICKETS_AVAILABLE' ? '门票可用!' : '无票'}`);
            }
            
            // 如果有结果，更新结果标签页
            if (data.history && data.history.length > 0) {
                updateResults(data.history);
            }
            
        } catch (error) {
            console.error('获取监控状态失败:', error);
        }
    }
    
    // 格式化日期
    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN');
    }
    
    // 更新结果标签页
    function updateResults(history) {
        resultsContainer.innerHTML = '';
        
        if (history.length === 0) {
            resultsContainer.innerHTML = '<p>暂无监控数据</p>';
            return;
        }
        
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">时间</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">状态</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">详情</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        // 按时间倒序排列
        history.slice().reverse().forEach(item => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #ddd';
            
            const timeCell = document.createElement('td');
            timeCell.style.padding = '8px';
            timeCell.textContent = formatDate(item.timestamp);
            
            const statusCell = document.createElement('td');
            statusCell.style.padding = '8px';
            statusCell.textContent = translateStatus(item.status);
            
            const detailsCell = document.createElement('td');
            detailsCell.style.padding = '8px';
            detailsCell.textContent = item.details || '-';
            
            // 高亮显示有票的行
            if (item.status === 'TICKETS_AVAILABLE') {
                row.style.backgroundColor = '#d4edda';
            }
            
            row.appendChild(timeCell);
            row.appendChild(statusCell);
            row.appendChild(detailsCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        resultsContainer.appendChild(table);
    }
    
    // 翻译状态
    function translateStatus(status) {
        const statusMap = {
            'TICKETS_AVAILABLE': '有票',
            'NO_TICKETS': '无票',
            'ERROR': '错误'
        };
        return statusMap[status] || status;
    }
    
    // 显示状态消息
    function updateStatus(message) {
        statusMessage.textContent = message;
    }
    
    // 显示警告/通知
    function showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `<strong>${type === 'error' ? '错误' : type === 'success' ? '成功' : '信息'}:</strong> ${message}`;
        
        const container = document.querySelector('.container');
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
});