// ============================================
// 收藏/打卡页交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化收藏标签切换
    initCollectTabs();
    
    // 初始化操作按钮
    initActionButtons();
});

// 收藏标签切换
function initCollectTabs() {
    const tabs = document.querySelectorAll('.collect-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 获取标签类型
            const tabType = this.dataset.tab;
            
            // 过滤显示对应类型的收藏
            filterCollectList(tabType);
        });
    });
}

// 过滤收藏列表
function filterCollectList(type) {
    const items = document.querySelectorAll('.collect-item');
    
    items.forEach(item => {
        const status = item.querySelector('.status');
        
        if (type === 'all') {
            item.style.display = 'flex';
        } else if (type === 'want' && status.classList.contains('want')) {
            item.style.display = 'flex';
        } else if (type === 'checked' && status.classList.contains('checked')) {
            item.style.display = 'flex';
        } else if (type === 'favorite' && status.classList.contains('favorite')) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// 操作按钮初始化
function initActionButtons() {
    const removeBtns = document.querySelectorAll('.action-btn.remove');
    
    removeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.collect-item');
            
            if (confirm('确定要移除这个收藏吗？')) {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    item.remove();
                }, 300);
            }
        });
    });
}
