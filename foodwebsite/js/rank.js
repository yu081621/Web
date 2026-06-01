// ============================================
// 排行榜页交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化榜单标签切换
    initRankTabs();
});

// 榜单标签切换
function initRankTabs() {
    const tabs = document.querySelectorAll('.rank-tab');
    const contents = document.querySelectorAll('.rank-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // 添加当前active状态
            this.classList.add('active');
            
            // 显示对应内容
            const targetContent = document.getElementById(`${targetTab}-rank`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // 更新页面标题
            updatePageTitle(this.querySelector('.tab-name').textContent);
        });
    });
}

// 更新页面标题
function updatePageTitle(rankName) {
    const headerTitle = document.querySelector('.page-header h1');
    if (headerTitle) {
        headerTitle.textContent = rankName;
    }
}
