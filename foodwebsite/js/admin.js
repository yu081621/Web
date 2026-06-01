// ============================================
// 管理员后台交互脚本
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // 初始化侧边栏导航
    initSidebarNav();
});

// 显示指定区域
function showSection(sectionName) {
    // 隐藏所有区域
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标区域
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 更新导航状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${sectionName}`) {
            item.classList.add('active');
        }
    });
    
    // 更新页面标题
    const headerTitle = document.querySelector('.admin-header h1');
    if (headerTitle) {
        const titles = {
            'dashboard': '数据概览',
            'shops': '店铺管理',
            'diaries': '日记审核',
            'users': '用户管理',
            'comments': '评论管理',
            'settings': '系统设置'
        };
        headerTitle.textContent = titles[sectionName] || '管理后台';
    }
}

// 初始化侧边栏导航
function initSidebarNav() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const sectionName = href.substring(1);
                showSection(sectionName);
            }
        });
    });
}

// 审核操作
function approveDiary(diaryId) {
    if (confirm('确定要通过这篇日记吗？')) {
        console.log('Approved diary:', diaryId);
        // 这里添加实际的审核通过逻辑
    }
}

function rejectDiary(diaryId) {
    if (confirm('确定要拒绝这篇日记吗？')) {
        console.log('Rejected diary:', diaryId);
        // 这里添加实际的审核拒绝逻辑
    }
}

// 删除操作
function deleteShop(shopId) {
    if (confirm('确定要删除这家店铺吗？此操作不可恢复！')) {
        console.log('Deleted shop:', shopId);
        // 这里添加实际的删除逻辑
    }
}

function deleteUser(userId) {
    if (confirm('确定要禁用这个用户吗？')) {
        console.log('Disabled user:', userId);
        // 这里添加实际的禁用逻辑
    }
}

// 保存设置
function saveSettings() {
    const form = document.querySelector('.settings-form');
    if (form) {
        const formData = new FormData(form);
        console.log('Saving settings...');
        // 这里添加实际的保存逻辑
        alert('设置已保存！');
    }
}
