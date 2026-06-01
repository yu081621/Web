// ============================================
// 首页交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 轮播图功能（如果有的话）
    initCarousel();
    
    // 榜单标签切换
    initRankTabs();
    
    // 搜索功能
    initSearch();
});

// 轮播图初始化
function initCarousel() {
    // 这里可以实现首页轮播图逻辑
    console.log('Carousel initialized');
}

// 榜单标签切换
function initRankTabs() {
    const tabs = document.querySelectorAll('.ranking-tabs .tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            // 添加当前active状态
            this.classList.add('active');
            
            // 这里可以添加切换榜单内容的逻辑
            const tabType = this.dataset.tab;
            console.log('Switch to tab:', tabType);
        });
    });
}

// 搜索功能
function initSearch() {
    const searchInput = document.querySelector('.hero-search input');
    const searchBtn = document.querySelector('.hero-search button');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', function() {
            const keyword = searchInput.value.trim();
            if (keyword) {
                window.location.href = `shop.html?search=${encodeURIComponent(keyword)}`;
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
}

// 分类点击
function handleCategoryClick(type) {
    window.location.href = `shop.html?type=${type}`;
}
