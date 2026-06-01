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
// ============================================
// 店铺编辑相关功能
// ============================================

// 存储店铺数据（实际项目中从后端获取）
let shopData = [
    {
        id: '001',
        name: '蜀味老火锅',
        type: '火锅',
        area: '春熙路',
        score: 4.9,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=100'
    },
    {
        id: '002',
        name: '樱花日料',
        type: '日料',
        area: '太古里',
        score: 4.7,
        status: 'active',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100'
    },
    {
        id: '003',
        name: '意式风情餐厅',
        type: '西餐',
        area: 'IFS',
        score: 4.8,
        status: 'pending',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'
    }
];

// 打开编辑弹窗
function openShopEditModal(shopId) {
    // 查找对应店铺数据
    const shop = shopData.find(item => item.id === shopId);
    if (!shop) return;

    // 填充表单数据
    document.getElementById('editShopId').value = shop.id;
    document.getElementById('editShopName').value = shop.name;
    document.getElementById('editShopType').value = shop.type;
    document.getElementById('editShopArea').value = shop.area;
    document.getElementById('editShopScore').value = shop.score;
    document.getElementById('editShopStatus').value = shop.status;
    document.getElementById('editShopImage').value = shop.image;

    // 显示弹窗
    document.getElementById('shopEditModal').classList.add('active');
}

// 关闭编辑弹窗
function closeShopModal() {
    document.getElementById('shopEditModal').classList.remove('active');
    // 重置表单
    document.getElementById('shopEditForm').reset();
}

// 保存店铺编辑
function saveShopEdit() {
    // 获取表单数据
    const shopId = document.getElementById('editShopId').value;
    const shopName = document.getElementById('editShopName').value;
    const shopType = document.getElementById('editShopType').value;
    const shopArea = document.getElementById('editShopArea').value;
    const shopScore = parseFloat(document.getElementById('editShopScore').value);
    const shopStatus = document.getElementById('editShopStatus').value;
    const shopImage = document.getElementById('editShopImage').value;

    // 简单验证
    if (!shopName || !shopType || !shopArea || isNaN(shopScore)) {
        showToast('请填写完整的店铺信息', 'error');
        return;
    }

    // 更新店铺数据
    const shopIndex = shopData.findIndex(item => item.id === shopId);
    if (shopIndex !== -1) {
        shopData[shopIndex] = {
            ...shopData[shopIndex],
            name: shopName,
            type: shopType,
            area: shopArea,
            score: shopScore,
            status: shopStatus,
            image: shopImage
        };

        // 更新表格显示
        updateShopTable();
        
        // 关闭弹窗并提示
        closeShopModal();
        showToast('店铺信息修改成功', 'success');
    }
}

// 更新店铺表格
function updateShopTable() {
    const tableBody = document.querySelector('#shops-section .data-table tbody');
    if (!tableBody) return;

    // 清空表格
    tableBody.innerHTML = '';

    // 重新渲染表格行
    shopData.forEach(shop => {
        const statusText = {
            'active': '营业中',
            'pending': '审核中',
            'closed': '已停业'
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${shop.id}</td>
            <td>
                <div class="table-shop">
                    <img src="${shop.image}" alt="${shop.name}">
                    <span>${shop.name}</span>
                </div>
            </td>
            <td>${shop.type}</td>
            <td>${shop.area}</td>
            <td>${shop.score}</td>
            <td><span class="status-badge ${shop.status}">${statusText[shop.status] || '未知'}</span></td>
            <td>
                <button class="btn-text" onclick="openShopEditModal('${shop.id}')">编辑</button>
                <button class="btn-text danger" onclick="deleteShop('${shop.id}')">删除</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 初始化店铺表格
function initShopTable() {
    updateShopTable();
    
    // 为删除按钮绑定事件（如果需要）
    document.querySelectorAll('.btn-text.danger').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const shopId = this.getAttribute('data-shop-id');
            if (shopId) {
                deleteShop(shopId);
            }
        });
    });
}

// 在DOM加载完成后初始化店铺表格
document.addEventListener('DOMContentLoaded', function() {
    // 原有初始化逻辑
    initSidebarNav();
    // 新增店铺表格初始化
    initShopTable();
});

// 存储要删除的店铺ID（临时记录）
let deleteShopId = null;

// 打开删除确认弹窗
function deleteShop(shopId) {
    deleteShopId = shopId;
    document.getElementById('deleteModal').classList.add('active');
}

// 关闭删除弹窗
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteShopId = null;
}

// 确认执行删除
document.addEventListener('DOMContentLoaded', function() {
    // 绑定确认删除按钮事件
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (!deleteShopId) return;
        
        // 执行删除
        shopData = shopData.filter(item => item.id !== deleteShopId);
        updateShopTable();
        closeDeleteModal();
        showToast('店铺删除成功', 'info');
    });
});
// ============================================
// 添加店铺功能
// ============================================

// 打开添加店铺弹窗
function openAddShopModal() {
    document.getElementById('shopAddForm').reset();
    document.getElementById('shopAddModal').classList.add('active');
}

// 关闭添加店铺弹窗
function closeAddShopModal() {
    document.getElementById('shopAddModal').classList.remove('active');
}

// 保存新增店铺
function saveAddShop() {
    // 获取表单数据
    const shopName = document.getElementById('addShopName').value.trim();
    const shopType = document.getElementById('addShopType').value;
    const shopArea = document.getElementById('addShopArea').value.trim();
    const shopScore = parseFloat(document.getElementById('addShopScore').value);
    const shopStatus = document.getElementById('addShopStatus').value;
    const shopImage = document.getElementById('addShopImage').value.trim() || 'https://images.unsplash.com/photo-1555126634-323283e099fa?w=100';

    // 表单验证
    if (!shopName) {
        showToast('请输入店铺名称', 'error');
        return;
    }
    if (!shopArea) {
        showToast('请输入所属商圈', 'error');
        return;
    }
    if (isNaN(shopScore) || shopScore < 0 || shopScore > 5) {
        showToast('请输入0-5之间的有效评分', 'error');
        return;
    }
    let newIdNumber = 1;

    if (shopData.length > 0) {
        // 获取最后一条数据的ID，转成数字 +1
        const lastId = shopData[shopData.length - 1].id;
        newIdNumber = parseInt(lastId) + 1;
    }

    // 格式化成 3 位数字：001、002、003...
    const newShopId = newIdNumber.toString().padStart(3, '0');

    // 组装新店铺数据
    const newShop = {
        id: newShopId,
        name: shopName,
        type: shopType,
        area: shopArea,
        score: shopScore,
        status: shopStatus,
        image: shopImage
    };

    // 添加到数据数组
    shopData.push(newShop); // 用 push 加到末尾，ID 顺序更合理

    // 更新表格
    updateShopTable();

    // 关闭弹窗并提示
    closeAddShopModal();
    showToast('店铺添加成功', 'success');
}