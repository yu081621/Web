// ============================================
// 店铺列表页交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化筛选功能
    initFilters();
    
    // 初始化排序功能
    initSort();
    
    // 初始化收藏按钮
    initCollectButtons();
});

// 筛选功能
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filterGroup = this.dataset.filter;
            const filterValue = this.dataset.value;
            
            // 同组其他按钮取消active状态
            document.querySelectorAll(`[data-filter="${filterGroup}"]`).forEach(b => {
                b.classList.remove('active');
            });
            
            // 当前按钮添加active状态
            this.classList.add('active');
            
            // 执行筛选
            applyFilters();
        });
    });
}

// 应用筛选
function applyFilters() {
    const activeFilters = {};
    
    document.querySelectorAll('.filter-btn.active').forEach(btn => {
        activeFilters[btn.dataset.filter] = btn.dataset.value;
    });
    
    console.log('Applying filters:', activeFilters);
    // 这里可以添加实际的筛选逻辑
}

// 排序功能
function initSort() {
    const sortSelect = document.getElementById('sortSelect');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sortType = this.value;
            console.log('Sort by:', sortType);
            // 这里可以添加实际的排序逻辑
        });
    }
}

// 收藏按钮初始化
function initCollectButtons() {
    const collectBtns = document.querySelectorAll('.collect-btn');
    
    collectBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            this.classList.toggle('active');
            const isActive = this.classList.contains('active');
            this.textContent = isActive ? '♥' : '♡';
            
            // 显示提示
            if (window.utils) {
                window.utils.showToast(isActive ? '收藏成功' : '已取消收藏', 'info');
            }
        });
    });
}

// 切换收藏状态
function toggleCollect(btn) {
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    btn.textContent = isActive ? '♥' : '♡';
}
