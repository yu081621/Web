// ============================================
// 通用交互脚本
// ============================================

// 移动端菜单切换
function toggleMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// 页面滚动时导航栏效果
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
    }
});

// 平滑滚动到指定元素
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 本地存储操作
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('LocalStorage error:', e);
        }
    },
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('LocalStorage error:', e);
            return null;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('LocalStorage error:', e);
        }
    }
};

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute);
}

// 获取URL参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 设置URL参数
function setUrlParam(name, value) {
    const url = new URL(window.location);
    if (value) {
        url.searchParams.set(name, value);
    } else {
        url.searchParams.delete(name);
    }
    window.history.pushState({}, '', url);
}

// 收藏功能
function toggleFavorite(shopId, btn) {
    const favorites = storage.get('favorites') || [];
    const index = favorites.indexOf(shopId);
    
    if (index > -1) {
        favorites.splice(index, 1);
        btn.classList.remove('active');
        showToast('已取消收藏', 'info');
    } else {
        favorites.push(shopId);
        btn.classList.add('active');
        showToast('收藏成功', 'success');
    }
    
    storage.set('favorites', favorites);
}

// 打卡功能
function toggleCheckIn(shopId, btn) {
    const checkIns = storage.get('checkIns') || [];
    const index = checkIns.indexOf(shopId);
    
    if (index > -1) {
        checkIns.splice(index, 1);
        btn.classList.remove('active');
        showToast('已取消打卡', 'info');
    } else {
        checkIns.push(shopId);
        btn.classList.add('active');
        showToast('打卡成功', 'success');
    }
    
    storage.set('checkIns', checkIns);
}

// 加载数据（模拟AJAX）
async function loadData(url, options = {}) {
    try {
        // 这里模拟API请求，实际项目中应该使用fetch
        console.log('Loading data from:', url);
        return { success: true, data: [] };
    } catch (error) {
        console.error('Load data error:', error);
        return { success: false, error: error.message };
    }
}

// 图片懒加载
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化懒加载
    lazyLoadImages();
    
    // 添加淡入动画
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
});

// 导出常用函数
window.utils = {
    debounce,
    throttle,
    storage,
    showToast,
    formatDate,
    getUrlParam,
    setUrlParam,
    toggleFavorite,
    toggleCheckIn,
    loadData,
    scrollToElement
};
