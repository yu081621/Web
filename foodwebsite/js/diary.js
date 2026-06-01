// ============================================
// 探店日记页交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化标签切换
    initTabs();
    
    // 初始化关注按钮
    initFollowButtons();
    
    // 初始化日记操作
    initDiaryActions();
});

// 标签切换
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 这里可以添加切换内容的逻辑
            console.log('Switch to tab:', this.textContent);
        });
    });
}

// 关注按钮
function initFollowButtons() {
    const followBtns = document.querySelectorAll('.follow-btn, .btn-follow');
    
    followBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const isFollowed = this.classList.contains('followed');
            
            if (isFollowed) {
                this.classList.remove('followed');
                this.textContent = this.classList.contains('btn-follow') ? '关注' : '+ 关注';
            } else {
                this.classList.add('followed');
                this.textContent = '已关注';
            }
        });
    });
}

// 日记操作
function initDiaryActions() {
    const actionItems = document.querySelectorAll('.action-item');
    
    actionItems.forEach(item => {
        item.addEventListener('click', function() {
            const icon = this.querySelector('span:first-child').textContent;
            
            if (icon === '❤️') {
                // 点赞
                const countSpan = this.querySelector('span:last-child');
                let count = parseInt(countSpan.textContent);
                
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                    countSpan.textContent = count - 1;
                } else {
                    this.classList.add('active');
                    countSpan.textContent = count + 1;
                }
            }
        });
    });
}
