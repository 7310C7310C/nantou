let currentGender = 'female';
let currentPage = 0;
let isLoading = false;
let hasMore = true;
let searchTerm = '';
let allUsers = [];
let searchTimeout = null;
let preloadedImages = new Map(); // 存储预加载的图片
let favoriteIds = new Set(); // 当前用户收藏的参与者ID集合
let favoritesLoaded = false; // 是否已加载收藏列表

// 红娘功能相关变量
let isMatchmakerMode = false; // 是否为红娘模式
let currentTargetParticipantId = null; // 当前配对的目标参与者ID
let currentTargetParticipantName = ''; // 当前配对的目标参与者姓名
let matchingParticipants = []; // 配对界面的参与者列表
let currentStarRating = 0; // 当前星级评分
let currentMatchPair = null; // 当前配对的两个人
// 红娘: 已存在配对的参与者ID集合（任意作为 person1 / person2 出现都算）
const matchedParticipantIdSet = new Set();
// 配对列表加载请求令牌（用于避免竞态造成的旧数据闪现）
let matchingRequestToken = 0; // 每次发起 loadMatchingParticipants 时自增

// 通用模态框功能
function showMessageModal(message, title = '提示', showCancel = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('messageModal');
        const titleEl = document.getElementById('messageModalTitle');
        const textEl = document.getElementById('messageModalText');
        const confirmBtn = document.getElementById('messageModalConfirm');
        const cancelBtn = document.getElementById('messageModalCancel');
        const closeBtn = document.getElementById('closeMessageModal');
        
        titleEl.textContent = title;
        textEl.textContent = message;
        cancelBtn.style.display = showCancel ? 'block' : 'none';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
        
        // 点击遮罩关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// 简化的 alert 替代函数
function showAlert(message, title = '提示') {
    return showMessageModal(message, title, false);
}

// 简化的 confirm 替代函数
function showConfirm(message, title = '确认') {
    return showMessageModal(message, title, true);
}

// 更新UI为登出状态
function updateUIForLoggedOutState() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const favoritesBtn = document.getElementById('favoritesBtn');
    const favoritesModal = document.getElementById('favoritesModal');
    const manageMatchesBtn = document.getElementById('manageMatchesBtn');
    const groupMatchingBtn = document.getElementById('groupMatchingBtn');
    const chatMatchingBtn = document.getElementById('chatMatchingBtn');
    const searchInput = document.getElementById('searchInput');
    
    // 重置UI显示状态
    if (loginBtn) loginBtn.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (adminPanelBtn) adminPanelBtn.style.display = 'none';
    if (favoritesBtn) favoritesBtn.style.display = 'none';
    if (manageMatchesBtn) manageMatchesBtn.style.display = 'none';
    if (groupMatchingBtn) groupMatchingBtn.style.display = 'none';
    if (chatMatchingBtn) chatMatchingBtn.style.display = 'none';
    
    // 关闭所有模态框
    if (favoritesModal) favoritesModal.classList.remove('active');
    const matchingModal = document.getElementById('matchingModal');
    const manageMatchesModal = document.getElementById('manageMatchesModal');
    if (matchingModal) matchingModal.classList.remove('active');
    if (manageMatchesModal) manageMatchesModal.classList.remove('active');
    
    // 重置 body overflow
    document.body.style.overflow = 'auto';
    
    // 重置红娘模式状态
    isMatchmakerMode = false;
    
    // 重置搜索框状态
    if (searchInput) {
        searchInput.placeholder = '输入编号…';
        searchInput.setAttribute('pattern', '[0-9]*');
        searchInput.setAttribute('inputmode', 'numeric');
    }
    
    // 重置分页和缓存状态
    currentPage = 0;
    hasMore = true;
    allUsers = [];
    searchTerm = '';
    preloadedImages.clear();
    favoriteIds.clear();
    favoritesLoaded = false;
    genderCache = {
        female: { users: [], page: 0, hasMore: true, searchTerm: '', preloadedImages: new Map() },
        male: { users: [], page: 0, hasMore: true, searchTerm: '', preloadedImages: new Map() }
    };
    
    // 重新加载页面数据
    loadUsers();
}

// 显示通知消息
function showNotification(message, type = 'info') {
    // 使用现有的 showAlert 功能
    showAlert(message);
}

// 处理认证失败的通用函数
function handleAuthError() {
    console.log('认证失败，清理本地存储');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userGender');
    localStorage.removeItem('isSigned');
    
    // 关闭可能打开的模态框
    const favoritesModal = document.getElementById('favoritesModal');
    const matchingModal = document.getElementById('matchingModal');
    const manageMatchesModal = document.getElementById('manageMatchesModal');
    if (favoritesModal) favoritesModal.classList.remove('active');
    if (matchingModal) matchingModal.classList.remove('active');
    if (manageMatchesModal) manageMatchesModal.classList.remove('active');
    
    // 重置 body overflow
    document.body.style.overflow = 'auto';
    
    // 更新UI状态
    updateUIForLoggedOutState();
    
    // 提示用户重新登录
    showNotification('登录已过期，请重新登录');
}

// 按性别缓存数据
let genderCache = {
    female: {
        users: [],
        page: 0,
        hasMore: true,
        searchTerm: '',
        preloadedImages: new Map()
    },
    male: {
        users: [],
        page: 0,
        hasMore: true,
        searchTerm: '',
        preloadedImages: new Map()
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById('femaleBtn').classList.add('active');
    
    // 初始化时禁用性别按钮，直到首次加载完成
    const femaleBtn = document.getElementById('femaleBtn');
    const maleBtn = document.getElementById('maleBtn');
    if (femaleBtn) femaleBtn.disabled = true;
    if (maleBtn) maleBtn.disabled = true;
    
    document.addEventListener('contextmenu', function(e) {
        // 全局阻止长按弹出的原生菜单（Android Chrome 等），但允许在输入/可编辑元素上使用原生菜单
        if (e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) {
            return; // 允许表单控件的原生上下文菜单
        }
        e.preventDefault();
        return false;
    });
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
    document.addEventListener('selectstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
    
    // 监听页面可见性变化，当用户重新回到页面时刷新用户状态
    document.addEventListener('visibilitychange', async function() {
        if (!document.hidden && localStorage.getItem('authToken')) {
            // 页面变为可见且用户已登录时，刷新用户状态
            await refreshCurrentUserToLocalStorage();
            // 更新搜索框状态（因为签到状态可能影响搜索权限）
            updateSearchInputState();
            // 如果当前显示的是"我的喜欢"模态框，刷新它
            const favoritesModal = document.getElementById('favoritesModal');
            if (favoritesModal && favoritesModal.classList.contains('active')) {
                loadFavoritesModal(true);
            }
            // 刷新主页用户列表以更新名称显示
            const currentPageBackup = currentPage;
            const hasMoreBackup = hasMore;
            currentPage = 0;
            hasMore = true;
            await loadUsers();
            // 如果有更多页面，恢复分页状态继续加载
            if (currentPageBackup > 0) {
                currentPage = currentPageBackup;
                hasMore = hasMoreBackup;
            }
        }
    });
    
    setupLoginEvents();
    // 检查登录状态，如果是参与者，则由 checkLoginStatus 内部处理加载
    // 如果不是参与者，则加载默认用户列表
    const isParticipant = await checkLoginStatus();
    if (!isParticipant) {
        loadUsers();
    }
    // 管理后台按钮跳转
    document.getElementById('adminPanelBtn').addEventListener('click', function() {
        window.location.href = '/admin';
    });
});

// 页面加载完成时确保用户状态是最新的
window.addEventListener('load', async function() {
    if (localStorage.getItem('authToken')) {
        await refreshCurrentUserToLocalStorage();
        updateSearchInputState();
    }
});

// 为登录用户设置默认性别筛选（显示异性）
async function setDefaultGenderForUser() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            loadUsers(); // 如果没有token，按默认加载
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const userGender = data.data && data.data.user && data.data.user.gender;
            
            if (userGender) {
                // 根据用户性别设置默认显示异性
                const targetGender = userGender === 'male' ? 'female' : 'male';
                
                // 如果需要切换性别，则切换；否则直接加载当前性别
                if (currentGender !== targetGender) {
                    switchGender(targetGender);
                } else {
                    loadUsers();
                }
            } else {
                // 用户信息中没有性别，按默认加载
                loadUsers();
            }
        } else {
            // 获取用户信息失败，按默认加载
            loadUsers();
        }
    } catch (error) {
        console.log('获取用户信息失败，使用默认设置');
        loadUsers(); // 网络错误等，按默认加载
    }
}

// Helper: update localStorage from /api/auth/me response
async function refreshCurrentUserToLocalStorage() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return null;
    try {
        const resp = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (!resp.ok) {
            // 如果认证失败（401），使用通用错误处理函数
            if (resp.status === 401) {
                handleAuthError();
            }
            return null;
        }
        const json = await resp.json();
        const user = json.data && json.data.user;
        if (user) {
            localStorage.setItem('userRole', user.role || 'participant');
            localStorage.setItem('username', user.username || '');
            localStorage.setItem('userName', user.name || '');
            localStorage.setItem('userId', user.id || '');
            if (user.gender) localStorage.setItem('userGender', user.gender);
            // store sign status
            localStorage.setItem('isSigned', user.is_checked_in ? '1' : '0');
            return user;
        }
    } catch (e) {
        console.error('获取用户信息时发生错误:', e);
        return null;
    }
    return null;
}

// 切换性别
function switchGender(gender) {
    if (currentGender === gender) return;
    
    // 禁用性别切换按钮，防止频繁点击
    const femaleBtn = document.getElementById('femaleBtn');
    const maleBtn = document.getElementById('maleBtn');
    femaleBtn.disabled = true;
    maleBtn.disabled = true;
    
    // 立即显示加载状态
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>加载中……</p></div>';
    
    // 保存当前性别的状态到缓存
    saveCurrentGenderState();
    
    currentGender = gender;
    
    // 清除搜索框内容和状态
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    if (searchInput) {
        searchInput.value = '';
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    searchTerm = '';
    
    // 清除所有性别缓存中的搜索状态，确保切换性别后搜索框保持空白
    Object.keys(genderCache).forEach(key => {
        genderCache[key].searchTerm = '';
    });
    
    // 从缓存加载目标性别的状态
    loadGenderState(gender);
    
    // 更新按钮状态
    femaleBtn.classList.toggle('active', gender === 'female');
    maleBtn.classList.toggle('active', gender === 'male');
    
    // 由于我们清空了搜索状态，需要重新加载该性别的全部用户数据
    // 重置分页状态
    currentPage = 0;
    hasMore = true;
    allUsers = [];
    
    // 重新加载全部数据
    loadUsers().finally(() => {
        // 无论成功还是失败，都重新启用按钮
        femaleBtn.disabled = false;
        maleBtn.disabled = false;
    });
}

// (移除旧版带“加载中...”的搜索处理函数，避免主页搜索出现 loading 文案)

// 保存当前性别状态到缓存
function saveCurrentGenderState() {
    const cache = genderCache[currentGender];
    cache.users = [...allUsers];
    cache.page = currentPage;
    cache.hasMore = hasMore;
    cache.searchTerm = searchTerm;
    cache.preloadedImages = new Map(preloadedImages);
}

// 从缓存加载性别状态
function loadGenderState(gender) {
    const cache = genderCache[gender];
    allUsers = [...cache.users];
    currentPage = cache.page;
    hasMore = cache.hasMore;
    
    // 只有在没有搜索条件时才恢复搜索状态
    if (!searchTerm) {
        searchTerm = cache.searchTerm;
        document.getElementById('searchInput').value = searchTerm;
        document.getElementById('clearBtn').style.display = searchTerm ? 'flex' : 'none';
    }
    
    preloadedImages = new Map(cache.preloadedImages);
}

// 处理搜索输入
function handleSearchInput(input) {
    const role = localStorage.getItem('userRole');
    const isSigned = localStorage.getItem('isSigned') === '1';
    const allowName = ['admin','staff','matchmaker'].includes(role || '') || (role === 'participant' && isSigned);
    if (!allowName) {
        // 未签到的参与者或未登录：只允许数字
        input.value = input.value.replace(/[^0-9]/g, '');
    }
    
    // 显示或隐藏清除按钮
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
    
    // 清除之前的定时器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // 设置防抖延迟，300ms后执行搜索
    searchTimeout = setTimeout(() => {
        searchUsers();
    }, 300);
}

// 清除搜索
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // 检查是否有该性别的原始缓存数据（无搜索条件的数据）
    const cache = genderCache[currentGender];
    if (cache.users.length > 0 && !cache.searchTerm) {
        // 有原始缓存数据，直接恢复显示
        searchTerm = '';
        currentPage = cache.page;
        hasMore = cache.hasMore;
        allUsers = [...cache.users];
        preloadedImages = new Map(cache.preloadedImages);
        displayUsers(allUsers);
    } else {
        // 没有原始缓存数据，重新搜索
        searchUsers();
    }
}

// 搜索用户
function searchUsers() {
    const newSearchTerm = document.getElementById('searchInput').value.trim();
    
    // 如果搜索条件没有变化且当前性别有缓存数据，直接显示
    if (newSearchTerm === searchTerm && genderCache[currentGender].users.length > 0) {
        return;
    }
    
    // 保存当前状态到缓存（如果不是搜索引起的变化）
    if (searchTerm !== newSearchTerm) {
        saveCurrentGenderState();
    }
    
    searchTerm = newSearchTerm;
    currentPage = 0;
    hasMore = true; // 重置分页状态
    allUsers = [];
    
    // 清空预加载的图片缓存
    preloadedImages.clear();
    
    loadUsers();
}

// 加载用户数据
async function loadUsers() {
    if (isLoading || !hasMore) return;
    
    isLoading = true;
    
    // 如果是首页首次加载（第一页且没有已显示的用户），显示加载状态并禁用性别按钮
    if (currentPage === 0 && allUsers.length === 0) {
        const grid = document.getElementById('usersGrid');
        grid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>加载中……</p></div>';
        
        // 禁用性别选择按钮
        const femaleBtn = document.getElementById('femaleBtn');
        const maleBtn = document.getElementById('maleBtn');
        if (femaleBtn) femaleBtn.disabled = true;
        if (maleBtn) maleBtn.disabled = true;
    }
    
    try {
        // 首先刷新当前用户状态（包括签到状态），确保显示最新状态
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            await refreshCurrentUserToLocalStorage();
        }
        
        // 红娘首次加载：预取配对集合用于高亮
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'matchmaker' && matchedParticipantIdSet.size === 0) {
            try { await loadMatchPairsForMatchmaker(); } catch (e) { console.warn('预取配对集合失败(忽略)', e); }
        }
        // 如果是登录的参与者且收藏尚未初始化，先等待初始化（保险：正常流程已在登录后调用 initFavorites，这里是兜底）
        if (authToken && userRole === 'participant' && favoriteIds.size === 0) {
            // 仅当还没有初始化过 (用户刚登录) 时尝试一次
            await initFavorites();
        }
        
        // 检查是否为管理员角色或已签到参与者的姓名搜索
        const isSigned = localStorage.getItem('isSigned') === '1';
        const isAdminRole = ['admin', 'staff', 'matchmaker'].includes(userRole);
        const isSignedParticipant = userRole === 'participant' && isSigned;
        const isNameSearch = (isAdminRole || isSignedParticipant) && searchTerm && isNaN(searchTerm);
        
        // 如果是姓名搜索，则不传递search参数给后端，让后端返回所有数据，前端来过滤
        // 同时需要获取更多数据以确保能找到所有匹配的姓名
        const searchParam = isNameSearch ? '' : searchTerm;
        const limitParam = isNameSearch ? 100 : 10; // 姓名搜索时获取更多数据
        const response = await fetch(`/api/participants?gender=${currentGender}&page=${currentPage}&limit=${limitParam}&search=${encodeURIComponent(searchParam)}`);
        
        if (response.ok) {
            const data = await response.json();
            let users = data.data.participants || [];
            
            // 如果是姓名搜索，在前端进行过滤
            if (isNameSearch) {
                const searchLower = searchTerm.toLowerCase();
                users = users.filter(user => {
                    return user.name && user.name.toLowerCase().includes(searchLower);
                });
                
                // 对于姓名搜索，我们需要模拟分页逻辑
                if (currentPage === 0) {
                    // 第一页，清空现有内容
                    displayUsers(users);
                }
                // 姓名搜索时，假设没有更多数据（因为我们已经过滤了所有结果）
                hasMore = false;
            } else {
                // 普通的编号搜索或无搜索
                if (currentPage === 0) {
                    // 第一页，清空现有内容
                    displayUsers(users);
                } else {
                    // 追加内容
                    appendUsers(users);
                }
                
                // 使用后端返回的分页信息
                hasMore = data.data.pagination.hasMore;
            }
            
            currentPage++;
        } else {
            console.error('加载用户失败');
            showError('加载用户失败');
        }
    } catch (error) {
        console.error('网络错误:', error);
        showError('网络错误');
    } finally {
        isLoading = false;
        
        // 重新启用性别选择按钮
        const femaleBtn = document.getElementById('femaleBtn');
        const maleBtn = document.getElementById('maleBtn');
        if (femaleBtn) femaleBtn.disabled = false;
        if (maleBtn) maleBtn.disabled = false;
    }
}

// 显示用户
function displayUsers(users) {
    const grid = document.getElementById('usersGrid');
    
    if (users.length === 0) {
        if (searchTerm && searchTerm.length > 0) {
            grid.innerHTML = '<div class="no-results">未找到包含 "' + searchTerm + '" 的用户</div>';
        } else {
            grid.innerHTML = '<div class="no-results">暂无用户</div>';
        }
        return;
    }
    
    grid.innerHTML = users.map(user => createUserCard(user)).join('');
    allUsers = users;
    
    // Draw hearts - 确保收藏状态正确
    updateHeartIcons(grid);
    
    // Draw stars for cards that have star buttons (from matching interface)
    const starCanvases = grid.querySelectorAll('.star-canvas');
    starCanvases.forEach(canvas => {
        const filled = canvas.dataset.filled === 'true';
        drawStarIcon(canvas, filled);
    });
    
    // 预加载所有用户的照片
    preloadUserPhotos(users);
    
    // 更新缓存
    saveCurrentGenderState();
}

// 追加用户
function appendUsers(users) {
    const grid = document.getElementById('usersGrid');
    const beforeCount = grid.children.length;
    const userCards = users.map(user => createUserCard(user)).join('');
    grid.insertAdjacentHTML('beforeend', userCards);
    allUsers = allUsers.concat(users);

    // Draw hearts on newly added cards - 确保收藏状态正确
    const cards = Array.from(grid.children);
    for (let i = beforeCount; i < cards.length; i++) {
        updateHeartIcons(cards[i]);
        // Draw stars for cards that have star buttons
        const starCanvases = cards[i].querySelectorAll('.star-canvas');
        starCanvases.forEach(canvas => {
            const filled = canvas.dataset.filled === 'true';
            drawStarIcon(canvas, filled);
        });
    }
    
    // 预加载新添加用户的照片
    preloadUserPhotos(users);
    
    // 更新缓存
    saveCurrentGenderState();
}

// 更新爱心图标显示状态
function updateHeartIcons(container) {
    const elements = container.querySelectorAll ? container.querySelectorAll('.favorite-toggle canvas.heart-icon') : container.querySelector ? [container.querySelector('.favorite-toggle canvas.heart-icon')].filter(Boolean) : [];
    elements.forEach(canvas => {
        const btn = canvas.parentElement;
        const participantId = parseInt(btn.dataset.id, 10);
        const isFavorited = favoriteIds.has(participantId);
        // 确保按钮的 CSS 类与实际收藏状态一致
        btn.classList.toggle('favorited', isFavorited);
        drawHeartIcon(canvas, isFavorited);
    });
}

// 绘制五角星图标
function drawStarIcon(canvas, filled = true) {
    if (!canvas || typeof canvas.getContext !== 'function') {
        return;
    }
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    
    // 实心星稍微大一些，让视觉效果与空心星一致
    const outerRadius = filled ? size * 0.45 : size * 0.4;
    const innerRadius = outerRadius * 0.4;
    
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    
    // 创建五角星路径
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const outerAngle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerAngle = ((i + 0.5) * Math.PI * 2) / 5 - Math.PI / 2;
        
        const outerX = centerX + Math.cos(outerAngle) * outerRadius;
        const outerY = centerY + Math.sin(outerAngle) * outerRadius;
        const innerX = centerX + Math.cos(innerAngle) * innerRadius;
        const innerY = centerY + Math.sin(innerAngle) * innerRadius;
        
        if (i === 0) {
            ctx.moveTo(outerX, outerY);
        } else {
            ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    
    if (filled) {
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        // 给实心星也添加外框线，让视觉大小与空心星一致
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    ctx.restore();
}

// 绘制爱心图标
function drawHeartIcon(canvas, isFavorited) {
    if (!canvas || typeof canvas.getContext !== 'function') {
        return;
    }
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const scale = size / 24;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.scale(scale, scale);

    const path = new Path2D('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
    
    if (isFavorited) {
        ctx.fillStyle = '#ff4d4f';
        ctx.fill(path);
    } else {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / scale; // Keep stroke width constant
        ctx.stroke(path);
    }
    ctx.restore();
}

// 创建用户卡片
function createUserCard(user) {
    const primaryPhoto = user.photos && user.photos.find(photo => photo.is_primary) || (user.photos && user.photos[0]);
    const photoUrl = primaryPhoto ? primaryPhoto.photo_url : '/placeholder.jpg';
    
    // 高亮搜索内容
    const highlightedUsername = highlightSearchTerm(user.username, searchTerm);
    
    const isFavorited = user.is_favorited || favoriteIds.has(user.id);
    const userRole = localStorage.getItem('userRole');
    const userGender = localStorage.getItem('userGender');
    const authToken = localStorage.getItem('authToken');
    // 仅在登录参与者浏览异性列表时显示收藏按钮
    const showFavBtn = authToken && userRole === 'participant' && userGender && userGender !== currentGender;
    const favBtnHtml = showFavBtn ? `<button class="favorite-toggle ${isFavorited ? 'favorited' : ''}" data-id="${user.id}" title="收藏/取消收藏"><canvas class="heart-icon" width="24" height="24"></canvas></button>` : '';
    
    // 红娘模式下显示配对按钮
    const showMatchBtn = userRole === 'matchmaker';
    const isMatchedAlready = showMatchBtn && matchedParticipantIdSet.has(user.id);
    const matchBtnHtml = showMatchBtn ? `<button class="match-btn ${isMatchedAlready ? 'matched-exists' : ''}" data-id="${user.id}" title="配对" onclick="event.stopPropagation(); openMatchingModal(${user.id}, '${user.name}')">配对</button>` : '';
    
    // 对 admin / staff / matchmaker 以及已签到的参与者显示真实姓名，其余显示圣名
    const isSigned = localStorage.getItem('isSigned') === '1';
    const roleShowRealName = ['matchmaker','admin','staff'].includes(userRole || '') || (userRole === 'participant' && isSigned);
    const rawDisplayName = roleShowRealName ? (user.name || '') : (user.baptismal_name || '');
    // 搜索高亮：仅当搜索词存在时在显示名称上一起高亮（允许编号或姓名）
    const highlightedDisplayName = searchTerm ? highlightSearchTerm(rawDisplayName, searchTerm) : rawDisplayName;

    return `
        <div class="user-card" data-id="${user.id}" data-username="${user.username}" data-photos='${JSON.stringify(user.photos || [])}'>
            ${favBtnHtml}
            ${matchBtnHtml}
            <img src="${photoUrl}" alt="用户照片" class="user-photo" onerror="this.src='/placeholder.jpg'">
            <div class="user-info">
                <div class="user-username">${highlightedUsername}</div>
                <div class="user-baptismal">${highlightedDisplayName}</div>
            </div>
        </div>
    `;
}

// 红娘加载所有已有配对，用于首页高亮按钮
async function loadMatchPairsForMatchmaker() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;
    const resp = await fetch('/api/matchmaker/my-recommendations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!resp.ok) {
        if (resp.status === 401) {
            handleAuthError();
        }
        return;
    }
    const data = await resp.json();
    if (!data.success) return;
    (data.data || []).forEach(rec => {
        if (rec.person1_internal_id) matchedParticipantIdSet.add(rec.person1_internal_id);
        if (rec.person2_internal_id) matchedParticipantIdSet.add(rec.person2_internal_id);
    });
}

// 高亮搜索内容
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || searchTerm.length === 0) {
        return text;
    }
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffeb3b; color: #333; padding: 2px 4px; border-radius: 3px;">$1</mark>');
}

// 预加载用户照片
function preloadUserPhotos(users) {
    users.forEach(user => {
        if (user.photos && user.photos.length > 0) {
            user.photos.forEach(photo => {
                if (!preloadedImages.has(photo.photo_url)) {
                    const img = new Image();
                    img.src = photo.photo_url;
                    preloadedImages.set(photo.photo_url, img);
                    // 静默加载，不显示错误
                    img.onerror = function() {
                        // 忽略加载错误
                    };
                }
            });
        }
    });
}

// 调整用户信息位置
function adjustUserInfoPosition() {
    const viewerImage = document.getElementById('viewerImage');
    const viewerUserInfo = document.querySelector('.viewer-user-info');
    
    if (!viewerImage || !viewerUserInfo) return;
    
    const imageRect = viewerImage.getBoundingClientRect();
    const viewerRect = document.getElementById('fullscreenViewer').getBoundingClientRect();
    
    // 计算图片在视窗中的实际位置
    const imageLeft = imageRect.left - viewerRect.left;
    const imageBottom = imageRect.bottom - viewerRect.top;
    
    // 设置用户信息位置，确保在图片内部且有边距
    const margin = 20;
    const bottomMargin = 10;
    const mobileMargin = window.innerWidth <= 768 ? 15 : margin;
    const mobileBottomMargin = window.innerWidth <= 768 ? 8 : bottomMargin;
    
    viewerUserInfo.style.left = Math.max(mobileMargin, imageLeft + mobileMargin) + 'px';
    viewerUserInfo.style.right = Math.max(mobileMargin, viewerRect.width - imageRect.right + mobileMargin) + 'px';
    viewerUserInfo.style.bottom = Math.max(mobileBottomMargin, viewerRect.height - imageBottom + mobileBottomMargin) + 'px';
}

// 显示错误
function showError(message) {
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = `<div class="no-results">${message}</div>`;
}

// 懒加载
function handleScroll() {
    if (isLoading || !hasMore) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 100) {
        loadUsers();
    }
}

// 监听滚动事件
window.addEventListener('scroll', handleScroll);

// 图片查看器相关变量
let currentImages = [];
let currentImageIndex = 0;
let currentUsername = '';
let currentBaptismalName = '';

// 打开图片查看器
function openImageViewer(username, photos, baptismalName) {
    if (!photos || photos.length === 0) {
    showAlert('该用户暂无照片');
        return;
    }

    currentImages = photos;
    currentImageIndex = 0;
    currentUsername = username;
    currentBaptismalName = baptismalName || '';

    const viewer = document.getElementById('fullscreenViewer');
    const viewerImage = document.getElementById('viewerImage');
    const imageCounter = document.getElementById('imageCounter');
    const viewerUsername = document.getElementById('viewerUsername');
    const viewerBaptismal = document.getElementById('viewerBaptismal');
    const viewerLoading = document.getElementById('viewerLoading');

    // 检查第一张图片是否已预加载完成
    const firstPhoto = currentImages[0];
    const preloadedImg = preloadedImages.get(firstPhoto.photo_url);
    const isPreloaded = preloadedImg && preloadedImg.complete;

    if (!isPreloaded) {
        // 显示加载提示
        viewerLoading.style.display = 'block';
        viewerImage.style.display = 'none';
    } else {
        // 已预加载完成，直接显示
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
    }

    viewerImage.src = firstPhoto.photo_url;
    imageCounter.textContent = `1 / ${currentImages.length}`;
    viewerUsername.textContent = username;
    viewerBaptismal.textContent = currentBaptismalName;
    updateNavigationButtons();

    viewer.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 图片加载完成后隐藏加载提示并调整位置
    viewerImage.onload = function() {
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
        adjustUserInfoPosition();
    };
    
    // 图片加载失败时也隐藏加载提示
    viewerImage.onerror = function() {
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
        adjustUserInfoPosition();
    };
}

// 关闭图片查看器
function closeImageViewer() {
    const viewer = document.getElementById('fullscreenViewer');
    viewer.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 显示上一张图片
function showPreviousImage() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateImageViewer();
    }
}

// 显示下一张图片
function showNextImage() {
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        updateImageViewer();
    }
}

// 更新图片查看器
function updateImageViewer() {
    const viewerImage = document.getElementById('viewerImage');
    const imageCounter = document.getElementById('imageCounter');
    const viewerUsername = document.getElementById('viewerUsername');
    const viewerBaptismal = document.getElementById('viewerBaptismal');
    const viewerLoading = document.getElementById('viewerLoading');

    // 检查当前图片是否已预加载完成
    const currentPhoto = currentImages[currentImageIndex];
    const preloadedImg = preloadedImages.get(currentPhoto.photo_url);
    const isPreloaded = preloadedImg && preloadedImg.complete;

    if (!isPreloaded) {
        // 显示加载提示
        viewerLoading.style.display = 'block';
        viewerImage.style.display = 'none';
    } else {
        // 已预加载完成，直接显示
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
    }

    viewerImage.src = currentPhoto.photo_url;
    imageCounter.textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
    viewerUsername.textContent = currentUsername;
    viewerBaptismal.textContent = currentBaptismalName;
    updateNavigationButtons();
    
    // 图片加载完成后隐藏加载提示并调整位置
    viewerImage.onload = function() {
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
        adjustUserInfoPosition();
    };
    
    // 图片加载失败时也隐藏加载提示
    viewerImage.onerror = function() {
        viewerLoading.style.display = 'none';
        viewerImage.style.display = 'block';
        adjustUserInfoPosition();
    };
}

// 更新导航按钮状态
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentImageIndex === 0;
    nextBtn.disabled = currentImageIndex === currentImages.length - 1;
}

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 用户卡片点击事件（事件委托）
    document.getElementById('usersGrid').addEventListener('click', function(e) {
        // 收藏按钮
        const favBtn = e.target.closest('.favorite-toggle');
        if (favBtn) {
            e.stopPropagation();
            toggleFavorite(favBtn.dataset.id, favBtn);
            return;
        }
        const userCard = e.target.closest('.user-card');
        if (userCard) {
            const username = userCard.dataset.username;
            const photos = JSON.parse(userCard.dataset.photos || '[]');
            const baptismalName = userCard.querySelector('.user-baptismal').textContent;
            openImageViewer(username, photos, baptismalName);
        }
    });

    // 上一张/下一张按钮
    document.getElementById('prevBtn').addEventListener('click', showPreviousImage);
    document.getElementById('nextBtn').addEventListener('click', showNextImage);

    // 键盘控制
    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('fullscreenViewer').classList.contains('active')) return;

        switch(e.key) {
            case 'Escape':
                closeImageViewer();
                break;
            case 'ArrowLeft':
                showPreviousImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
        }
    });

    // 窗口大小改变时重新调整位置
    window.addEventListener('resize', function() {
        if (document.getElementById('fullscreenViewer').classList.contains('active')) {
            adjustUserInfoPosition();
        }
    });

    // 点击背景或图片关闭
    document.getElementById('fullscreenViewer').addEventListener('click', function(e) {
        if (e.target === this || e.target.classList.contains('viewer-content') || e.target.id === 'viewerImage') {
            closeImageViewer();
        }
    });

    // 触摸控制（移动端）
    let touchStartX = 0;
    let touchEndX = 0;

    document.getElementById('fullscreenViewer').addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.getElementById('fullscreenViewer').addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 向左滑动，显示下一张
                showNextImage();
            } else {
                // 向右滑动，显示上一张
                showPreviousImage();
            }
        }
    }
});

// 登录相关函数
function setupLoginEvents() {
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeLoginBtn = document.getElementById('closeLoginBtn');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // 打开登录模态框
    loginBtn.addEventListener('click', function() {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // 关闭登录模态框
    closeLoginBtn.addEventListener('click', closeLoginModal);
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            closeLoginModal();
        }
    });

    // 登录表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('.submit-btn');
        
        // 禁用提交按钮
        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';
        loginError.textContent = '';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            

            if (response.ok) {
                // 登录成功
                localStorage.setItem('authToken', data.data.token);
                
                // 安全地获取用户信息
                const userRole = (data.data && data.data.user && data.data.user.role) || 'participant';
                const userUsername = (data.data && data.data.user && data.data.user.username) || username;
                const userName = (data.data && data.data.user && data.data.user.name) || '';
                
                localStorage.setItem('userRole', userRole);
                localStorage.setItem('username', userUsername);
                localStorage.setItem('userName', userName);
                if (data.data && data.data.user && data.data.user.gender) {
                    localStorage.setItem('userGender', data.data.user.gender);
                }
                // store sign status if provided
                if (data.data && data.data.user && typeof data.data.user.is_checked_in !== 'undefined') {
                    localStorage.setItem('isSigned', data.data.user.is_checked_in ? '1' : '0');
                    // 更新搜索框状态（因为签到状态可能影响搜索权限）
                    updateSearchInputState();
                } else {
                    localStorage.setItem('isSigned', '0');
                    updateSearchInputState();
                }
                
                // 根据角色跳转
                if (['admin', 'staff', 'matchmaker'].includes(userRole)) {
                    // 管理员角色跳转到管理后台，带上returnUrl参数
                    window.location.href = '/admin?returnUrl=index';
                } else {
                    // 参与者角色，关闭模态框并更新界面
                    closeLoginModal();
                    updateUserInterface(userUsername, userRole, userName);
                    // ==== 修复：登录前已加载的第一页卡片没有爱心按钮的问题 ====
                    // 场景：未登录状态已经加载了当前性别(默认 female)第一页数据；登录男性参与者后仍然停留在 female，
                    // 此时旧卡片是未登录时渲染的，不包含收藏按钮；随后懒加载第二页才出现按钮，造成“第一页没有爱心”的错觉。
                    // 解决：登录成功（并且角色为 participant）后，先清空当前列表和缓存，再初始化收藏，再重新根据性别规则加载第一页。
                    // 这样第一页会重新以“已登录参与者身份”渲染，收藏按钮（心形）立即出现。
                    genderCache = {
                        female: { users: [], page: 0, hasMore: true, searchTerm: '', preloadedImages: new Map() },
                        male:   { users: [], page: 0, hasMore: true, searchTerm: '', preloadedImages: new Map() }
                    };
                    allUsers = [];
                    currentPage = 0;
                    hasMore = true;
                    preloadedImages.clear();
                    const gridEl = document.getElementById('usersGrid');
                    if (gridEl) gridEl.innerHTML = '';
                    // 先加载收藏，再决定默认展示异性列表
                    await initFavorites();
                    // 获取用户详细信息并设置默认性别筛选
                    await setDefaultGenderForUser();
                }
            } else {
                // 登录失败
                loginError.textContent = data.message || '登录失败，请检查用户名和密码';
            }
        } catch (error) {
            console.error('登录错误:', error);
            loginError.textContent = '网络错误，请重试';
        } finally {
            // 恢复提交按钮
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    });
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // 清空表单
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
}

// 更新搜索框状态（根据角色和签到状态）
function updateSearchInputState() {
    const searchInputEl = document.getElementById('searchInput');
    if (!searchInputEl) return;
    
    const role = localStorage.getItem('userRole') || '';
    const isSigned = localStorage.getItem('isSigned') === '1';
    
    if (['admin','staff','matchmaker'].includes(role) || (role === 'participant' && isSigned)) {
        searchInputEl.placeholder = '输入编号或姓名…';
        searchInputEl.removeAttribute('pattern');
        searchInputEl.removeAttribute('inputmode');
    } else {
        searchInputEl.placeholder = '输入编号…';
        searchInputEl.setAttribute('pattern', '[0-9]*');
        searchInputEl.setAttribute('inputmode', 'numeric');
    }
}

// 更新用户界面
function updateUserInterface(username, role, userName = '') {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const roleBtn = document.getElementById('roleBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const searchInputEl = document.getElementById('searchInput');
    const userInfoItem = document.getElementById('userInfoItem');
    
    // 隐藏登录按钮，显示用户信息
    loginBtn.style.display = 'none';
    userInfo.style.display = 'block';
    
    // 根据角色设置显示文本
    let displayText = '';
    if (['admin', 'staff', 'matchmaker'].includes(role)) {
        // 管理员相关角色显示中文角色名
        const roleMap = {
            'admin': '管理员',
            'staff': '工作人员', 
            'matchmaker': '红娘'
        };
        displayText = roleMap[role] || role;
        adminPanelBtn.style.display = 'block';
    } else {
        // 普通参与者显示姓名
        displayText = userName || username;
        adminPanelBtn.style.display = 'none';
    }
    
    // 设置角色按钮文本
    roleBtn.textContent = displayText;
    
    // 在下拉菜单中显示用户名
    if (userInfoItem && username) {
        userInfoItem.textContent = `账号：${username}`;
        userInfoItem.style.display = 'block';
    }
    
    // 新增: 显示收藏按钮
    showFavoritesButtonIfParticipant(role);
    // 新增: 显示红娘功能按钮
    showMatchmakerButtonsIfMatchmaker(role);
    // 恢复下拉菜单事件绑定
    setupUserDropdown();

    // 根据角色和签到状态调整首页搜索框
    updateSearchInputState();
    
    // 更新功能按钮显示（考虑功能开关 + 本地用户签到状态）
    checkFeatureFlags();
}

// 设置用户下拉菜单
function setupUserDropdown() {
    const roleBtn = document.getElementById('roleBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('logoutBtn');

    // 移除可能已存在的事件监听器
    const newRoleBtn = roleBtn.cloneNode(true);
    roleBtn.parentNode.replaceChild(newRoleBtn, roleBtn);

    // 点击角色按钮显示/隐藏下拉菜单
    newRoleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        newRoleBtn.classList.toggle('active');
        userDropdownMenu.classList.toggle('show');
    });

    // 点击其他地方隐藏下拉菜单
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-dropdown')) {
            newRoleBtn.classList.remove('active');
            userDropdownMenu.classList.remove('show');
        }
    });

    // 登出功能
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('userName');
        localStorage.removeItem('userGender');
        localStorage.removeItem('isSigned');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = '输入编号…';
            searchInput.setAttribute('pattern', '[0-9]*');
            searchInput.setAttribute('inputmode', 'numeric');
        }
        
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const favoritesBtn = document.getElementById('favoritesBtn');
        const favoritesModal = document.getElementById('favoritesModal');
        const manageMatchesBtn = document.getElementById('manageMatchesBtn');
        const groupMatchingBtn = document.getElementById('groupMatchingBtn');
        const chatMatchingBtn = document.getElementById('chatMatchingBtn');
        const matchingModal = document.getElementById('matchingModal');
        const manageMatchesModal = document.getElementById('manageMatchesModal');
        
        // 重置UI显示状态
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        adminPanelBtn.style.display = 'none';
        favoritesBtn.style.display = 'none';
        if (manageMatchesBtn) manageMatchesBtn.style.display = 'none';
        if (groupMatchingBtn) groupMatchingBtn.style.display = 'none';
        if (chatMatchingBtn) chatMatchingBtn.style.display = 'none';
        
        // 关闭所有可能打开的模态框
        if (favoritesModal) favoritesModal.classList.remove('active');
        if (matchingModal) matchingModal.classList.remove('active');
        if (manageMatchesModal) manageMatchesModal.classList.remove('active');
        
        // 重置红娘模式状态
        isMatchmakerMode = false;
        
        // 触发一次功能开关检查以同步状态（server side + local state）
        try { checkFeatureFlags(); } catch(e) { /* ignore */ }
        
        // 清除收藏相关状态
        favoriteIds.clear();
        favoritesLoaded = false;
        
        // 重新加载用户列表以移除爱心图标
        currentPage = 0;
        hasMore = true;
        allUsers = [];
        preloadedImages.clear();
        
        // 清空缓存
        genderCache = {
            female: {
                users: [],
                page: 0,
                hasMore: true,
                searchTerm: '',
                preloadedImages: new Map()
            },
            male: {
                users: [],
                page: 0,
                hasMore: true,
                searchTerm: '',
                preloadedImages: new Map()
            }
        };
        
        // 重新加载当前性别的用户列表
        loadUsers();
        
        // 重新设置登录事件
        setupLoginEvents();
    });
}

// 页面加载时检查登录状态
async function checkLoginStatus() {
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    
    if (authToken && username && userRole) {
        // 如果已登录，更新界面
        updateUserInterface(username, userRole, userName);
        // 为已登录的参与者设置默认性别筛选
        if (userRole === 'participant') {
            // 先初始化收藏状态，再加载用户列表
            await initFavorites();
            await setDefaultGenderForUser();
            return true; // 表示已处理参与者的初始加载
        }
    }
    return false; // 表示未处理，需要调用者进行默认加载
}

// 初始化收藏：获取收藏id集合
async function initFavorites() {
    const authToken = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    if (!authToken || userRole !== 'participant') return;
    try {
        const resp = await fetch('/api/favorites/ids', { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (resp.ok) {
            const data = await resp.json();
            favoriteIds = new Set(data.data.favorite_ids || []);
            // 重新渲染当前列表以显示收藏状态
            const grid = document.getElementById('usersGrid');
            updateHeartIcons(grid);
        }
    } catch (e) {
        console.log('加载收藏失败');
    }
}

// 切换收藏
async function toggleFavorite(participantId, btnEl) {
    const authToken = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    if (!authToken || userRole !== 'participant') {
            showToast('请先以参与者身份登录', 'error');
        return;
    }
    
    // 立即更新UI反馈
    const currentlyFavorited = btnEl.classList.contains('favorited');
    const newFavorited = !currentlyFavorited;
    btnEl.classList.toggle('favorited', newFavorited);
    const canvas = btnEl.querySelector('canvas.heart-icon');
    if (canvas) {
        drawHeartIcon(canvas, newFavorited);
    }
    
    // 更新本地状态
    const id = parseInt(participantId, 10);
    if (newFavorited) {
        favoriteIds.add(id);
    } else {
        favoriteIds.delete(id);
    }
    
    try {
        const resp = await fetch(`/api/favorites/${participantId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!resp.ok) {
            // 检查是否是认证错误
            if (resp.status === 401) {
                handleAuthError();
                return; // 直接返回，不需要回滚
            }
            throw new Error('请求失败');
        }
        const data = await resp.json();
        const favorited = data.data.favorited;
        if (favorited) {
            favoriteIds.add(id);
        } else {
            favoriteIds.delete(id);
        }
        // 确保按钮状态与最终结果一致
        btnEl.classList.toggle('favorited', favorited);
        if (canvas) {
            drawHeartIcon(canvas, favorited);
        }

        // 同步更新主列表对应按钮
        const cardBtn = document.querySelector(`.user-card[data-id='${participantId}'] .favorite-toggle`);
        if (cardBtn && cardBtn !== btnEl) {
            cardBtn.classList.toggle('favorited', favorited);
            const cardCanvas = cardBtn.querySelector('canvas.heart-icon');
            if (cardCanvas) {
                drawHeartIcon(cardCanvas, favorited);
            }
        }

        // 模态同步
        const favModal = document.getElementById('favoritesModal');
        if (favModal && favModal.classList.contains('active')) {
            const grid = document.getElementById('favoritesGrid');
            const emptyEl = document.getElementById('favoritesEmptyModal');
            if (favorited) {
                // 如果不存在则追加
                let exists = grid.querySelector(`.user-card[data-id='${participantId}']`);
                if (!exists) {
                    // 创建卡片
                    const cardBtnParent = cardBtn && cardBtn.closest('.user-card');
                    const btnElParent = btnEl && btnEl.closest('.user-card');
                    const username = (cardBtnParent && cardBtnParent.dataset.username) || (btnElParent && btnElParent.dataset.username) || '';
                    const baptismalEl = cardBtnParent && cardBtnParent.querySelector('.user-baptismal');
                    const baptismal_name = (baptismalEl && baptismalEl.textContent) || '';
                    const photosData = (cardBtnParent && cardBtnParent.dataset.photos) || (btnElParent && btnElParent.dataset.photos) || '[]';
                    const p = { id: id, username: username, baptismal_name: baptismal_name, photos: JSON.parse(photosData) };
                    const photo = (p.photos || []).find(ph => ph.is_primary) || (p.photos || [])[0];
                    const photoUrl = photo ? photo.photo_url : '/placeholder.jpg';
                    const html = `<div class="user-card" data-id="${p.id}" data-username="${p.username}" data-photos='${JSON.stringify(p.photos || [])}'>
                        <button class="favorite-toggle favorited" data-id="${p.id}" title="取消喜欢"><canvas class="heart-icon" width="24" height="24"></canvas></button>
                        <img src="${photoUrl}" class="user-photo" alt="${p.username}" onerror="this.src='/placeholder.jpg'">
                        <div class="user-info"><div class="user-username">${p.username}</div><div class="user-baptismal">${p.baptismal_name || ''}</div></div>
                    </div>`;
                    grid.insertAdjacentHTML('beforeend', html);
                    const canvasNew = grid.querySelector(`.user-card[data-id='${p.id}'] canvas.heart-icon`);
                    if (canvasNew) drawHeartIcon(canvasNew, true);
                }
                if (emptyEl) emptyEl.style.display = 'none';
            } else {
                const card = grid.querySelector(`.user-card[data-id='${participantId}']`);
                if (card) card.remove();
                if (emptyEl && !grid.querySelector('.user-card')) emptyEl.style.display = 'block';
            }
        }
    } catch (e) {
        // 回滚
        btnEl.classList.toggle('favorited', currentlyFavorited);
        if (canvas) {
            drawHeartIcon(canvas, currentlyFavorited);
        }
        if (currentlyFavorited) {
            favoriteIds.add(id);
        } else {
            favoriteIds.delete(id);
        }
        console.error('收藏网络错误', e);
    }
}

// 加载收藏列表（模态）
async function loadFavoritesModal(forceReload = false) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;
    if (!forceReload && favoritesLoaded) return;
    
    // 刷新当前用户状态（包括签到状态），确保显示最新状态
    await refreshCurrentUserToLocalStorage();
    
    // 更新搜索框状态（因为签到状态可能影响搜索权限）
    updateSearchInputState();
    
    const grid = document.getElementById('favoritesGrid');
    const emptyEl = document.getElementById('favoritesEmptyModal');
    try {
        const resp = await fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (resp.ok) {
            const data = await resp.json();
            const arr = data.data.favorites || [];
            favoritesLoaded = true;
            grid.innerHTML = '';
            if (arr.length === 0) {
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            } else if (emptyEl) emptyEl.style.display = 'none';
            const cardsHtml = arr.map(p => {
                const photo = (p.photos || []).find(ph => ph.is_primary) || (p.photos || [])[0];
                const photoUrl = photo ? photo.photo_url : '/placeholder.jpg';
                
                // 获取当前用户角色和签到状态，判断是否显示真实姓名
                const userRole = localStorage.getItem('userRole');
                const isSigned = localStorage.getItem('isSigned') === '1';
                const roleShowRealName = ['matchmaker','admin','staff'].includes(userRole || '') || (userRole === 'participant' && isSigned);
                const displayName = roleShowRealName ? (p.name || '') : (p.baptismal_name || '');
                
                return `<div class=\"user-card\" data-id=\"${p.id}\" data-username=\"${p.username}\" data-photos='${JSON.stringify(p.photos || [])}'>
                    <button class=\"favorite-toggle favorited\" data-id=\"${p.id}\" title=\"取消喜欢\"><canvas class=\"heart-icon\" width=\"24\" height=\"24\"></canvas></button>
                    <img src=\"${photoUrl}\" class=\"user-photo\" alt=\"${p.username}\" onerror=\"this.src='/placeholder.jpg'\">
                    <div class=\"user-info\"><div class=\"user-username\">${p.username}</div><div class=\"user-baptismal\">${displayName}</div></div>
                </div>`;
            }).join('');
            grid.insertAdjacentHTML('beforeend', cardsHtml);
            updateHeartIcons(grid);
        } else if (resp.status === 401) {
            // 认证失败，使用通用错误处理函数
            handleAuthError();
        }
    } catch (e) {
        console.error('加载收藏列表失败', e);
    }
}

function openFavoritesModal() {
    const modal = document.getElementById('favoritesModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    favoritesLoaded = false; // 每次打开刷新
    loadFavoritesModal(true);
}

function closeFavoritesModal() {
    const modal = document.getElementById('favoritesModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function setupFavoritesModal() {
    const btn = document.getElementById('favoritesBtn');
    const modal = document.getElementById('favoritesModal');
    const closeBtn = document.getElementById('closeFavoritesModal');
    const grid = document.getElementById('favoritesGrid');
    if (!btn || !modal) return;
    btn.addEventListener('click', openFavoritesModal);
    if (closeBtn) closeBtn.addEventListener('click', closeFavoritesModal);
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeFavoritesModal();
    });
    // 事件委托：心形 & 打开大图
    grid.addEventListener('click', (e) => {
        const favBtn = e.target.closest('.favorite-toggle');
        if (favBtn) {
            e.stopPropagation();
            toggleFavorite(favBtn.dataset.id, favBtn);
            return;
        }
        const card = e.target.closest('.user-card');
        if (!card) return;
        const username = card.dataset.username;
        const photos = JSON.parse(card.dataset.photos || '[]');
        const baptismalEl = card.querySelector('.user-baptismal');
        const baptismal = (baptismalEl && baptismalEl.textContent) || '';
        openImageViewer(username, photos, baptismal);
    });
}

// ============ 选择最喜欢的五人（分组匹配 / 聊天匹配） ============
function openSelectionsModal() {
    const modal = document.getElementById('selectionsModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadSelectionsModal();
}

function closeSelectionsModal() {
    const modal = document.getElementById('selectionsModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function setupSelectionsModal() {
    const openBtns = [document.getElementById('groupMatchingBtn'), document.getElementById('chatMatchingBtn')];
    openBtns.forEach(b => { if (b) b.addEventListener('click', openSelectionsModal); });
    const closeBtn = document.getElementById('closeSelectionsModal');
    if (closeBtn) closeBtn.addEventListener('click', closeSelectionsModal);
    const modal = document.getElementById('selectionsModal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeSelectionsModal(); });
}

async function loadSelectionsModal() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { showToast('请先登录', 'error'); return; }

    // load favorites and current selections
    try {
        const [favResp, selResp] = await Promise.all([
            fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch('/api/selections', { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        if (!favResp.ok) throw new Error('加载收藏失败');
        if (!selResp.ok) throw new Error('加载选择失败');

        const favJson = await favResp.json();
        const selJson = await selResp.json();
        const favorites = favJson.data.favorites || [];
        const selections = selJson.data || [];

        renderSelectionsTop(selections);
        renderSelectionsGrid(favorites, selections);
        enableSelectionsDrag();
    } catch (e) {
        console.error('加载选择器失败', e);
        showToast('加载选择器失败', 'error');
    }
}

function renderSelectionsTop(selections) {
    const top = document.getElementById('selectionsTop');
    top.innerHTML = '';
    
    // 获取当前用户的角色和签到状态，判断是否显示真实姓名
    const userRole = localStorage.getItem('userRole') || '';
    const isSigned = localStorage.getItem('isSigned') === '1';
    const shouldShowRealName = ['matchmaker','admin','staff'].includes(userRole) || (userRole === 'participant' && isSigned);
    
    for (let i = 1; i <=5; i++) {
        const sel = selections.find(s => Number(s.priority) === i);
        if (sel) {
            // 第一行始终显示账号，第二行根据权限显示真实姓名或圣名
            const username = sel.target_username || `编号 ${sel.target_id}`;
            const displayName = shouldShowRealName ? (sel.target_name || sel.target_baptismal || '') : (sel.target_baptismal || '');
            
            const item = createSelectionTopCard(sel.target_id, username, i, true, sel.target_photo_url || '', displayName);
            top.insertAdjacentHTML('beforeend', item);
        } else {
            const item = createSelectionTopCard(null, '', i, false);
            top.insertAdjacentHTML('beforeend', item);
        }
    }
}

function createSelectionTopCard(id, name, idx, filled, photoUrl = '', baptismal = '') {
    if (!filled) {
        // render empty slot as a user-card styled placeholder
        // use 1x1 transparent gif to avoid any browser default missing-image decoration
        const transparent = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        return `
        <div class="user-card selection-top-card empty" data-index="${idx}">
            <img src="${transparent}" class="user-photo" alt="" aria-hidden="true">
            <div class="selection-index">${idx}</div>
            <div class="empty-center">请选择</div>
        </div>`;
    }
    // filled slot uses same .user-card structure
    const img = photoUrl || '/placeholder.jpg';
    const bapt = baptismal || `编号 ${id}`;
    return `
        <div class="user-card selection-top-card filled" data-index="${idx}" data-id="${id}" draggable="true">
            <button class="selection-remove" aria-label="移除第${idx}位">-</button>
            <img src="${img}" class="user-photo" alt="" onerror="this.src='/placeholder.jpg'" aria-hidden="true">
            <div class="user-info">
                <div class="user-username">${name}</div>
                <div class="user-baptismal">${bapt}</div>
            </div>
            <div class="selection-index">${idx}</div>
        </div>`;
}

function renderSelectionsGrid(favorites, selections) {
    const grid = document.getElementById('selectionsGrid');
    const emptyEl = document.getElementById('selectionsEmptyModal');
    grid.innerHTML = '';
    // hide favorites that are already selected
    const selectedIds = new Set((selections || []).map(s => Number(s.target_id)));
    const available = favorites.filter(f => !selectedIds.has(Number(f.id)));
    if (available.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
    } else {
        if (emptyEl) emptyEl.style.display = 'none';
        const html = available.map(p => {
            const photo = (p.photos || []).find(ph => ph.is_primary) || (p.photos || [])[0];
            const photoUrl = photo ? photo.photo_url : '/placeholder.jpg';
            
            // 根据用户角色和签到状态决定第二行显示内容
            const userRole = localStorage.getItem('userRole') || '';
            const isSigned = localStorage.getItem('isSigned') === '1';
            const shouldShowRealName = ['admin','staff','matchmaker'].includes(userRole) || (userRole === 'participant' && isSigned);
            const secondLineDisplay = shouldShowRealName ? (p.name || p.baptismal_name || '') : (p.baptismal_name || '');
            
            // 添加右上角的添加控件（用于将该收藏加入顶部选择）
            return `<div class="user-card" data-id="${p.id}" data-username="${p.username}" data-photos='${JSON.stringify(p.photos||[])}' data-is-checked-in="${p.is_checked_in || 0}">
                        <button class="select-add" data-id="${p.id}" title="加入选择">+</button>
                        <img src="${photoUrl}" class="user-photo">
                        <div class="user-info"><div class="user-username">${p.username}</div><div class="user-baptismal">${secondLineDisplay}</div></div>
                    </div>`;
        }).join('');
        grid.insertAdjacentHTML('beforeend', html);
        // bind top-slot '+' buttons to scroll/focus the favorites grid for accessibility
        document.querySelectorAll('#selectionsTop .selection-plus').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const firstAdd = document.querySelector('#selectionsGrid .select-add');
                if (firstAdd) {
                    firstAdd.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstAdd.focus();
                }
            });
        });
    }
    // bind remove on top filled cards
    document.querySelectorAll('#selectionsTop .selection-remove').forEach(btn => btn.addEventListener('click', onSelectRemove));
    // bind add buttons on bottom favorites grid
    document.querySelectorAll('#selectionsGrid .select-add').forEach(btn => btn.addEventListener('click', onSelectAdd));
}

async function onSelectAdd(e) {
    // 防止快速重复点击造成冲突：使用本地 pending 预留机制（乐观更新）
    const btn = e.currentTarget;
    const id = Number(btn.dataset.id);
    // 如果该按钮已在 pending 中，则忽略
    if (btn.dataset.pending === '1') return;

    // 检查签到状态
    const bottomCard = document.querySelector(`#selectionsGrid .user-card[data-id='${id}']`);
    const isCheckedIn = bottomCard && bottomCard.dataset.isCheckedIn === '1';
    
    if (!isCheckedIn) {
        showToast('此用户未签到', 'error');
        return;
    }

    const topEmpty = Array.from(document.querySelectorAll('#selectionsTop .selection-top-card.empty'))[0];
    if (!topEmpty) { showToast('已选满 5 位', 'info'); return; }
    const priority = Number(topEmpty.dataset.index);

    const authToken = localStorage.getItem('authToken');

    // 读取一些必要的展示信息用于乐观更新
    const cardUsername = (bottomCard && bottomCard.dataset.username) || '';
    const photosData = (bottomCard && bottomCard.dataset.photos) || '[]';
    const baptismalEl = bottomCard && bottomCard.querySelector('.user-baptismal');
    const baptismal_name = (baptismalEl && baptismalEl.textContent) || '';

    try {
        // 标记为 pending，立即更新 UI（移除底部卡片并占位顶部）以防止并发分配相同 priority
        btn.dataset.pending = '1';
        btn.disabled = true;

        // 移除底部卡片以避免重复点击同一项
        if (bottomCard) bottomCard.remove();

        // 在顶部插入一个 pending 的占位卡片以预留优先级
        const placeholderHtml = createSelectionTopCard(id, cardUsername || '', priority, true, (JSON.parse(photosData)[0] && JSON.parse(photosData)[0].photo_url) || '', baptismal_name).replace('selection-top-card filled', 'selection-top-card filled pending');
        topEmpty.outerHTML = placeholderHtml;

        const resp = await fetch('/api/selections', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type':'application/json' }, body: JSON.stringify({ target_id: id, priority }) });
        if (!resp.ok) throw new Error('添加失败');
        showToast('已添加', 'success');

        // 成功后，清除 pending 标记并刷新 modal 确保数据一致
        // （refresh 会把 pending 状态用服务端数据覆盖）
        await loadSelectionsModal();
    } catch (err) {
        console.error(err);
        showToast('添加失败', 'error');
        // 回滚：如果我们移除了底部卡片，需要把它恢复到 grid 中
        if (!document.querySelector(`#selectionsGrid .user-card[data-id='${id}']`) && bottomCard) {
            const grid = document.getElementById('selectionsGrid');
            grid.insertAdjacentHTML('beforeend', bottomCard.outerHTML);
            // 重新绑定新增按钮
            const newBtn = grid.querySelector(`.user-card[data-id='${id}'] .select-add`);
            if (newBtn) newBtn.addEventListener('click', onSelectAdd);
        }
        // 清理顶部占位（如果仍存在）并刷新 modal
        await loadSelectionsModal();
    } finally {
        // 移除 pending 标识（如果在 UI 刷新后还是存在该按钮，这里保证能交互）
        if (btn) {
            btn.dataset.pending = '0';
            btn.disabled = false;
        }
    }
}

async function onSelectRemove(e) {
    const card = e.currentTarget.closest('.selection-top-card');
    const targetId = Number(card.dataset.id);
    const authToken = localStorage.getItem('authToken');
    try {
        const resp = await fetch('/api/selections', { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type':'application/json' }, body: JSON.stringify({ target_id: targetId }) });
        if (!resp.ok) throw new Error('移除失败');

        // remove the top card in-place
        const topCard = document.querySelector(`#selectionsTop .selection-top-card.filled[data-id='${targetId}']`);
        if (topCard) {
            // replace with an empty slot at the same position to preserve slot count
            const idx = Number(topCard.dataset.index) || 1;
            topCard.outerHTML = createSelectionTopCard(null, '', idx, false);
        }

        // Move subsequent filled cards forward: gather all filled slots, reassign priorities 1..N
        const top = document.getElementById('selectionsTop');
        const filledCards = Array.from(top.querySelectorAll('.selection-top-card.filled'));
        // Recompute indices and ensure they are 1..filledCards.length
        filledCards.forEach((c, i) => {
            c.dataset.index = String(i + 1);
            const idxEl = c.querySelector('.selection-index'); if (idxEl) idxEl.textContent = String(i + 1);
        });

        // Prepare batch update items
        const items = filledCards.map((c, i) => ({ target_id: Number(c.dataset.id), priority: i + 1 }));
        if (items.length > 0) {
            // send single batch update; do not show success toast per request
            const r = await fetch('/api/selections/reorder', { method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type':'application/json' }, body: JSON.stringify({ items }) });
            if (!r.ok) throw new Error('排序更新失败');
        }

        // finally reload modal to keep UI consistent with server
        await loadSelectionsModal();
    } catch (err) {
        console.error(err);
        showToast('移除失败', 'error');
    }
}

function enableSelectionsDrag() {
    const top = document.getElementById('selectionsTop');
    if (!top) return;

    // 销毁之前的Sortable实例（如果存在）
    if (top.sortableInstance) {
        top.sortableInstance.destroy();
    }

    // Helper: update dataset.index and visible index number for all top slots (ensure 1..N where N<=5)
    function refreshTopIndices() {
        const cards = Array.from(top.querySelectorAll('.selection-top-card'));
        cards.forEach((c, i) => {
            const idx = i + 1;
            c.dataset.index = String(idx);
            const idxEl = c.querySelector('.selection-index');
            if (idxEl) idxEl.textContent = String(idx);
        });
    }

    // 使用SortableJS创建拖拽实例
    const sortable = new Sortable(top, {
        // 只允许拖拽已填充的卡片
        filter: '.selection-top-card:not(.filled)',
        
        // 动画配置
        animation: 200,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        
        // 拖拽时的样式
        ghostClass: 'selection-sortable-ghost',
        chosenClass: 'selection-sortable-chosen',
        dragClass: 'selection-sortable-drag',
        
        // 禁用默认的拖拽行为
        forceFallback: false,
        
        // 拖拽手柄 - 整个卡片都可以拖拽
        handle: '.selection-top-card.filled',
        
        // 拖拽开始事件
        onStart: function(evt) {
            evt.item.classList.add('dragging');
        },
        
        // 拖拽结束事件
        onEnd: async function(evt) {
            evt.item.classList.remove('dragging');
            
            // 如果位置没有改变，不需要更新
            if (evt.oldIndex === evt.newIndex) {
                return;
            }
            
            // 更新所有卡片的索引
            refreshTopIndices();
            
            // 准备批量更新数据
            const filledCards = Array.from(top.querySelectorAll('.selection-top-card.filled'));
            const items = filledCards.map((c, i) => ({ 
                target_id: Number(c.dataset.id), 
                priority: i + 1 
            }));

            // 发送更新请求到服务器
            const authToken = localStorage.getItem('authToken');
            try {
                const resp = await fetch('/api/selections/reorder', {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${authToken}`, 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ items })
                });
                
                if (!resp.ok) {
                    throw new Error('排序失败');
                }
                
                // 成功后刷新模态框以反映服务器的权威状态
                await loadSelectionsModal();
            } catch (err) {
                console.error('拖拽排序失败:', err);
                showToast('排序失败', 'error');
                // 如果失败，重新加载模态框以恢复服务器状态
                await loadSelectionsModal();
            }
        },
        
        // 拖拽过程中的事件
        onMove: function(evt) {
            // 只允许在已填充的卡片之间移动
            return evt.related.classList.contains('selection-top-card');
        }
    });

    // 保存实例引用以便后续销毁
    top.sortableInstance = sortable;
}

// 初始化 selections modal
document.addEventListener('DOMContentLoaded', function() {
    setupSelectionsModal();
});

// 显示“我的喜欢”按钮（参与者登录）
function showFavoritesButtonIfParticipant(role) {
    const btn = document.getElementById('favoritesBtn');
    if (role === 'participant') {
        btn.style.display = 'block';
        if (!btn.dataset.inited) {
            setupFavoritesModal();
            btn.dataset.inited = '1';
        }
    } else {
        btn.style.display = 'none';
    }
}

// Toast 提示
// 已移除 toast 功能

// 显示红娘功能按钮
function showMatchmakerButtonsIfMatchmaker(role) {
    const manageMatchesBtn = document.getElementById('manageMatchesBtn');
    if (role === 'matchmaker') {
        isMatchmakerMode = true;
        manageMatchesBtn.style.display = 'block';
        if (!manageMatchesBtn.dataset.inited) {
            setupMatchmakerEvents();
            manageMatchesBtn.dataset.inited = '1';
        }
    } else {
        isMatchmakerMode = false;
        manageMatchesBtn.style.display = 'none';
    }
}

// ==================== 红娘功能相关代码 ====================

// 初始化红娘功能事件
function setupMatchmakerEvents() {
    // 配对管理按钮事件
    document.getElementById('manageMatchesBtn').addEventListener('click', openManageMatchesModal);
    
    // 关闭模态框事件
    document.getElementById('closeMatchingModal').addEventListener('click', closeMatchingModal);
    document.getElementById('closeManageMatchesModal').addEventListener('click', closeManageMatchesModal);
    document.getElementById('closeStarRatingModal').addEventListener('click', closeStarRatingModal);
    
    // 配对搜索事件
    const matchingSearch = document.getElementById('matchingSearch');
    matchingSearch.addEventListener('input', debounce(handleMatchingSearch, 300));
    
    // 星级评分事件
    setupStarRating();
    
    // 模态框点击外部关闭
    document.getElementById('matchingModal').addEventListener('click', function(e) {
        if (e.target === this) closeMatchingModal();
    });
    document.getElementById('manageMatchesModal').addEventListener('click', function(e) {
        if (e.target === this) closeManageMatchesModal();
    });
    document.getElementById('starRatingModal').addEventListener('click', function(e) {
        if (e.target === this) closeStarRatingModal();
    });
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

// 配对按钮点击事件
function openMatchingModal(participantId, participantName) {
    currentTargetParticipantId = participantId;
    currentTargetParticipantName = participantName;
    
    document.getElementById('targetParticipantName').textContent = participantName;
    const modal = document.getElementById('matchingModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('matchingSearch').value = '';
    // 打开时立即清空旧数据，显示 loading，避免上一位对象数据闪现
    const grid = document.getElementById('matchingGrid');
    const empty = document.getElementById('matchingEmpty');
    const loading = document.getElementById('matchingLoading');
    matchingParticipants = [];
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'none';
    if (loading) loading.style.display = 'block';
    loadMatchingParticipants();
}

// 关闭配对模态框
function closeMatchingModal() {
    const modal = document.getElementById('matchingModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentTargetParticipantId = null;
    currentTargetParticipantName = '';
    matchingParticipants = [];
    // 清空搜索框和隐藏清除按钮
    const searchInput = document.getElementById('matchingSearch');
    const clearBtn = document.getElementById('matchingSearchClear');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

// 加载配对参与者列表
async function loadMatchingParticipants(searchQuery = '') {
    if (currentTargetParticipantId == null) return; // 目标已被清空，放弃
    const myToken = ++matchingRequestToken; // 为本次请求生成唯一令牌
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        const url = `/api/matchmaker/participants/${currentTargetParticipantId}/matching${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (myToken !== matchingRequestToken) return; // 已有更新请求在途，丢弃本次结果
        if (response.ok) {
            const data = await response.json();
            // 再次检查竞态
            if (myToken !== matchingRequestToken) return;
            matchingParticipants = data.data;
            renderMatchingParticipants();
        } else if (response.status === 401) {
            handleAuthError();
            return;
        } else {
            throw new Error('加载配对数据失败');
        }
    } catch (error) {
        if (myToken !== matchingRequestToken) return; // 旧请求错误忽略
        console.error('加载配对数据失败:', error);
        showToast('加载配对数据失败：' + error.message, 'error');
        // 失败时也隐藏 loading 并显示空状态
        const loading = document.getElementById('matchingLoading');
        const grid = document.getElementById('matchingGrid');
        const empty = document.getElementById('matchingEmpty');
        if (loading) loading.style.display = 'none';
        grid.style.display = 'none';
        empty.style.display = 'block';
    }
}

// 渲染配对参与者列表
function renderMatchingParticipants() {
    const grid = document.getElementById('matchingGrid');
    const empty = document.getElementById('matchingEmpty');
    const loading = document.getElementById('matchingLoading');
    if (loading) loading.style.display = 'none';
    
    if (matchingParticipants.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    
    // 获取当前搜索关键词
    const searchInput = document.getElementById('matchingSearch');
    const searchKeyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    // 使用标准的用户卡片样式，但需要特殊处理配对界面
    grid.innerHTML = matchingParticipants.map(participant => {
        const hasRecommendation = participant.recommendation_id;
        const stars = participant.stars || 0;
        
        // 创建标准用户对象
        const userObj = {
            id: participant.id,
            username: participant.username,
            name: participant.name,
            baptismal_name: participant.baptismal_name,
            gender: participant.gender,
            photos: participant.photos || []
        };
        
        // 使用标准的createUserCard函数创建卡片
        let cardHtml = createUserCard(userObj);
        
        // 移除收藏按钮和配对按钮，替换为星级按钮
        cardHtml = cardHtml.replace(/<button class="favorite-toggle[^>]*>[\s\S]*?<\/button>/, '');
        cardHtml = cardHtml.replace(/<button class="match-btn[^>]*>[\s\S]*?<\/button>/, '');
        
        // 创建星级按钮，使用canvas绘制五角星
        let starsHtml = '';
        if (hasRecommendation && stars > 0) {
            // 显示对应数量的实心星和剩余的空心星
            for (let i = 0; i < stars; i++) {
                starsHtml += `<canvas class="star-canvas" width="16" height="16" data-filled="true"></canvas>`;
            }
            for (let i = stars; i < 5; i++) {
                starsHtml += `<canvas class="star-canvas" width="16" height="16" data-filled="false"></canvas>`;
            }
        } else {
            // 未配对时显示一颗空心星
            starsHtml = `<canvas class="star-canvas" width="16" height="16" data-filled="false"></canvas>`;
        }
        
        const starBtn = `<button class="star-btn ${hasRecommendation ? 'filled' : 'empty'}" 
                                data-participant-id="${participant.id}" 
                                data-participant-name="${participant.name}"
                                data-current-stars="${stars}"
                                title="${hasRecommendation ? `已配对 ${stars} 星` : '点击评星'}">
                            ${starsHtml}
                        </button>`;
        
        // 在user-card div后添加星级按钮
        cardHtml = cardHtml.replace('<div class="user-card"', `<div class="user-card ${hasRecommendation ? 'matched' : ''}"`);
        cardHtml = cardHtml.replace('<img src=', starBtn + '<img src=');
        
        return cardHtml;
    }).join('');
    
    // 绘制所有星星
    const starCanvases = grid.querySelectorAll('.star-canvas');
    starCanvases.forEach(canvas => {
        const filled = canvas.dataset.filled === 'true';
        drawStarIcon(canvas, filled);
    });
    
    // 如果有搜索关键词，高亮显示
    if (searchKeyword) {
        const cards = grid.querySelectorAll('.user-card');
        cards.forEach(card => {
            const textEls = card.querySelectorAll('.user-username, .user-baptismal');
            highlightSearchInElements(Array.from(textEls), searchKeyword);
        });
    }
    
    // 为配对列表添加点击事件委托
    grid.removeEventListener('click', handleMatchingGridClick);
    grid.addEventListener('click', handleMatchingGridClick);
}

// 处理配对网格点击事件
function handleMatchingGridClick(e) {
    // 如果点击的是星级按钮，处理评星
    const starBtn = e.target.closest('.star-btn');
    if (starBtn) {
        e.stopPropagation();
        const participantId = parseInt(starBtn.dataset.participantId);
        const participantName = starBtn.dataset.participantName;
        const currentStars = parseInt(starBtn.dataset.currentStars) || 0;
        openStarRating(participantId, participantName, currentStars);
        return;
    }
    
    // 如果点击的是卡片其他部分，查看大图
    const card = e.target.closest('.user-card');
    if (card) {
        const participantId = parseInt(card.dataset.id);
        const participant = matchingParticipants.find(p => p.id === participantId);
        if (participant && participant.photos && participant.photos.length > 0) {
            // 使用现有的图片查看器函数
            openImageViewer(participant.username, participant.photos, participant.baptismal_name);
        }
    }
}

// 配对搜索处理
function handleMatchingSearch(event) {
    const searchQuery = event.target.value.trim();
    // 显示/隐藏清除按钮
    const clearBtn = document.getElementById('matchingSearchClear');
    if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'flex' : 'none';
    }
    // 搜索时同样显示 loading，清空旧内容防止闪烁
    const grid = document.getElementById('matchingGrid');
    const empty = document.getElementById('matchingEmpty');
    const loading = document.getElementById('matchingLoading');
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'none';
    if (loading) loading.style.display = 'block';
    loadMatchingParticipants(searchQuery);
}

// 打开星级评分模态框
function openStarRating(participantId, participantName, currentStars = 0) {
    const targetParticipant = matchingParticipants.find(p => p.id === participantId);
    if (!targetParticipant) return;
    
    currentMatchPair = {
        person1_id: currentTargetParticipantId,
        person1_name: currentTargetParticipantName,
        person2_id: participantId,
        person2_name: participantName
    };
    
    currentStarRating = currentStars;
    
    // 设置参与者信息
    const participant1Div = document.getElementById('starRatingParticipant1');
    const participant2Div = document.getElementById('starRatingParticipant2');
    
    // 获取目标参与者的照片
    const targetParticipantData = allUsers.find(u => u.id == currentTargetParticipantId);
    const primaryTargetPhoto = targetParticipantData && targetParticipantData.photos && targetParticipantData.photos.find(p => p.is_primary);
    const targetPhoto = targetParticipantData && targetParticipantData.photos && targetParticipantData.photos.length > 0
        ? (primaryTargetPhoto && primaryTargetPhoto.photo_url) || targetParticipantData.photos[0].photo_url
        : '/images/default-avatar.png';
    
    const primaryParticipantPhoto = targetParticipant.photos && targetParticipant.photos.find(p => p.is_primary);
    const participantPhoto = targetParticipant.photos && targetParticipant.photos.length > 0
        ? (primaryParticipantPhoto && primaryParticipantPhoto.photo_url) || targetParticipant.photos[0].photo_url
        : '/images/default-avatar.png';
    
    participant1Div.innerHTML = `
        <img src="${targetPhoto}" alt="${currentTargetParticipantName}">
        <div class="name">${currentTargetParticipantName}</div>
    `;
    
    participant2Div.innerHTML = `
        <img src="${participantPhoto}" alt="${participantName}">
        <div class="name">${participantName}</div>
    `;
    
    // 设置星级
    updateStarDisplay(currentStars);

    // 没有配对记录（currentStars == 0 && 无 recommendation_id）时隐藏“清除配对”按钮
    const removeBtn = document.getElementById('removeMatchBtn');
    if (removeBtn) {
        const hasRecommendation = !!targetParticipant.recommendation_id || currentStars > 0;
        removeBtn.style.display = hasRecommendation ? 'inline-block' : 'none';
    }

    document.getElementById('starRatingModal').style.display = 'block';
}

// 关闭星级评分模态框
function closeStarRatingModal() {
    document.getElementById('starRatingModal').style.display = 'none';
    currentMatchPair = null;
    currentStarRating = 0;
}

// 设置星级评分事件
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentStarRating = index + 1;
            updateStarDisplay(currentStarRating);
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarDisplay(index + 1, true);
        });
    });
    
    document.querySelector('.star-rating-stars').addEventListener('mouseleave', () => {
        updateStarDisplay(currentStarRating);
    });
    
    // 确认按钮
    document.getElementById('confirmRatingBtn').addEventListener('click', confirmRating);
    
    // 清除配对按钮
    document.getElementById('removeMatchBtn').addEventListener('click', removeMatch);
}

// 更新星级显示
function updateStarDisplay(rating, isHover = false) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// 确认评分
async function confirmRating() {
    if (!currentMatchPair || currentStarRating === 0) {
    await showAlert('请选择星级');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        
        const response = await fetch('/api/matchmaker/recommendations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                person1_id: currentMatchPair.person1_id,
                person2_id: currentMatchPair.person2_id,
                stars: currentStarRating
            })
        });
        
        if (response.ok) {
            showToast('配对成功！', 'success');
            closeStarRatingModal();
            const matchingModalActive = document.getElementById('matchingModal') && document.getElementById('matchingModal').classList.contains('active');
            if (matchingModalActive) {
                loadMatchingParticipants(); // 仅在配对界面时刷新
            } else {
                // 配对管理界面，刷新配对管理数据
                if (typeof loadManageMatches === 'function') {
                    loadManageMatches();
                }
            }
        } else if (response.status === 401) {
            handleAuthError();
            return;
        } else {
            const error = await response.json();
            throw new Error(error.message || '配对失败');
        }
    } catch (error) {
        console.error('配对失败:', error);
    showToast('配对失败：' + error.message, 'error');
    }
}

// 清除配对
async function removeMatch() {
    if (!currentMatchPair) return;
    
    const confirmed = await showConfirm(`确定要清除 ${currentMatchPair.person1_name} 和 ${currentMatchPair.person2_name} 的配对吗？`);
    if (!confirmed) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        
        const response = await fetch('/api/matchmaker/recommendations', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                person1_id: currentMatchPair.person1_id,
                person2_id: currentMatchPair.person2_id
            })
        });
        
        if (response.ok) {
            showToast('配对已清除', 'success');
            closeStarRatingModal();
            loadMatchingParticipants(); // 重新加载配对列表
        } else if (response.status === 401) {
            handleAuthError();
            return;
        } else {
            const error = await response.json();
            throw new Error(error.message || '清除配对失败');
        }
    } catch (error) {
        console.error('清除配对失败:', error);
    showToast('清除配对失败：' + error.message, 'error');
    }
}

// 打开配对管理模态框
async function openManageMatchesModal() {
    document.getElementById('manageMatchesModal').classList.add('active');
    // 初始化加载状态
    const grid = document.getElementById('manageMatchesGrid');
    const empty = document.getElementById('manageMatchesEmpty');
    const loading = document.getElementById('manageMatchesLoading');
    grid.innerHTML = '';
    grid.style.display = 'none';
    empty.style.display = 'none';
    if (loading) loading.style.display = 'block';
    await loadManageMatches();
}

// 关闭配对管理模态框
function closeManageMatchesModal() {
    document.getElementById('manageMatchesModal').classList.remove('active');
    // 清空搜索框和隐藏清除按钮
    const searchInput = document.getElementById('manageMatchesSearch');
    const clearBtn = document.getElementById('manageMatchesSearchClear');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

// 加载配对管理数据
async function loadManageMatches() {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        
        const response = await fetch('/api/matchmaker/my-recommendations', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderManageMatches(data.data);
        } else if (response.status === 401) {
            handleAuthError();
            return;
        } else {
            throw new Error('加载配对管理数据失败');
        }
    } catch (error) {
        console.error('加载配对管理数据失败:', error);
    showToast('加载配对管理数据失败：' + error.message, 'error');
    }
}

// 渲染配对管理列表
function renderManageMatches(matches) {
    const grid = document.getElementById('manageMatchesGrid');
    const empty = document.getElementById('manageMatchesEmpty');
    const loading = document.getElementById('manageMatchesLoading');
    if (loading) loading.style.display = 'none';
    
    if (matches.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    
    grid.innerHTML = matches.map(match => {
        const primaryPerson1Photo = match.person1_photos && match.person1_photos.find(p => p.is_primary);
        const person1Photo = match.person1_photos && match.person1_photos.length > 0
            ? (primaryPerson1Photo && primaryPerson1Photo.photo_url) || match.person1_photos[0].photo_url
            : '/images/default-avatar.png';
        
        const primaryPerson2Photo = match.person2_photos && match.person2_photos.find(p => p.is_primary);
        const person2Photo = match.person2_photos && match.person2_photos.length > 0
            ? (primaryPerson2Photo && primaryPerson2Photo.photo_url) || match.person2_photos[0].photo_url
            : '/images/default-avatar.png';
        
        // 创建星级canvas
        let starsHtml = '';
        for (let i = 0; i < match.stars; i++) {
            starsHtml += `<canvas class="star-canvas" width="20" height="20" data-filled="true"></canvas>`;
        }
        for (let i = match.stars; i < 5; i++) {
            starsHtml += `<canvas class="star-canvas" width="20" height="20" data-filled="false"></canvas>`;
        }
        
        return `
            <div class="match-pair-container" data-id="${match.id}">
                <!-- 第一行：左男右女的卡片 -->
                <div class="match-pair-cards">
                    <div class="match-pair-card">
                        <img class="match-pair-card-image" src="${person1Photo}" alt="${match.person1_name}">
                        <div class="match-pair-card-info">
                            <div class="match-pair-card-name">${match.person1_name}</div>
                            <div class="match-pair-card-username">${match.person1_username}</div>
                        </div>
                    </div>
                    <div class="match-pair-card">
                        <img class="match-pair-card-image" src="${person2Photo}" alt="${match.person2_name}">
                        <div class="match-pair-card-info">
                            <div class="match-pair-card-name">${match.person2_name}</div>
                            <div class="match-pair-card-username">${match.person2_username}</div>
                        </div>
                    </div>
                </div>
                
                <!-- 第二行：圆角矩形的五星评级 -->
                <div class="match-pair-rating-container">
                    <div class="match-pair-rating" 
                         data-person1-id="${match.person1_internal_id}" 
                         data-person2-id="${match.person2_internal_id}" 
                         data-current-stars="${match.stars}" 
                         title="点击星星直接评分">
                        ${starsHtml}
                    </div>
                </div>
                
                <!-- 第三行：删除键 -->
                <div class="match-pair-actions">
                    <button class="btn-remove-match" 
                            onclick="removeMatchById(${match.id}, '${match.person1_name}', '${match.person2_name}')">
                        删除配对
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // 绘制所有星星
    const starCanvases = grid.querySelectorAll('.star-canvas');
    starCanvases.forEach(canvas => {
        const filled = canvas.dataset.filled === 'true';
        drawStarIcon(canvas, filled);
    });

    initInlineManageRating();
}

// 配对管理本地过滤（ID或姓名 / 用户名模糊）
const filterManageMatches = debounce(function() {
    const input = document.getElementById('manageMatchesSearch');
    if (!input) return;
    const keyword = input.value.trim().toLowerCase();
    // 显示/隐藏清除按钮
    const clearBtn = document.getElementById('manageMatchesSearchClear');
    if (clearBtn) {
        clearBtn.style.display = keyword ? 'flex' : 'none';
    }
    // 若还未加载数据，直接触发加载
    const grid = document.getElementById('manageMatchesGrid');
    if (!grid || !grid.children.length) {
        return; // 等第一次加载完成后再过滤（首次打开已自动加载）
    }
    // 遍历 match-pair-container
    const containers = Array.from(grid.querySelectorAll('.match-pair-container'));
    let visibleCount = 0;
    containers.forEach(c => {
        if (!keyword) {
            c.style.display = '';
            // 清除高亮
            clearSearchHighlight(c);
            visibleCount++;
            return;
        }
        const nameEls = Array.from(c.querySelectorAll('.match-pair-card-name,.match-pair-card-username'));
        const names = nameEls.map(el => el.textContent.toLowerCase());
        const idAttr = c.getAttribute('data-id') || '';
        const hit = names.some(t => t.includes(keyword)) || idAttr.includes(keyword);
        c.style.display = hit ? '' : 'none';
        if (hit) {
            visibleCount++;
            // 高亮匹配内容
            highlightSearchInElements(nameEls, keyword);
        } else {
            clearSearchHighlight(c);
        }
    });
    const empty = document.getElementById('manageMatchesEmpty');
    if (empty) empty.style.display = visibleCount === 0 ? 'block' : 'none';
}, 250);

// 初始化配对管理搜索事件（只需绑定一次）
document.addEventListener('DOMContentLoaded', () => {
    const manageSearchInput = document.getElementById('manageMatchesSearch');
    if (manageSearchInput && !manageSearchInput.dataset.bound) {
        manageSearchInput.addEventListener('input', filterManageMatches);
        manageSearchInput.dataset.bound = '1';
    }
    // 绑定清除按钮事件
    const matchingClearBtn = document.getElementById('matchingSearchClear');
    const manageClearBtn = document.getElementById('manageMatchesSearchClear');
    
    if (matchingClearBtn && !matchingClearBtn.dataset.bound) {
        matchingClearBtn.addEventListener('click', () => {
            const input = document.getElementById('matchingSearch');
            if (input) {
                input.value = '';
                matchingClearBtn.style.display = 'none';
                // 触发搜索以重新加载所有数据
                handleMatchingSearch({ target: input });
            }
        });
        matchingClearBtn.dataset.bound = '1';
    }
    
    if (manageClearBtn && !manageClearBtn.dataset.bound) {
        manageClearBtn.addEventListener('click', () => {
            const input = document.getElementById('manageMatchesSearch');
            if (input) {
                input.value = '';
                manageClearBtn.style.display = 'none';
                // 触发过滤以显示所有数据
                filterManageMatches();
            }
        });
        manageClearBtn.dataset.bound = '1';
    }
});

// 搜索高亮辅助函数
function highlightSearchInElements(elements, keyword) {
    if (!keyword) return;
    elements.forEach(el => {
        const originalText = el.dataset.originalText || el.textContent;
        if (!el.dataset.originalText) {
            el.dataset.originalText = originalText;
        }
        const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
        const highlightedText = originalText.replace(regex, '<span class="search-highlight">$1</span>');
        el.innerHTML = highlightedText;
    });
}

function clearSearchHighlight(container) {
    const highlightedEls = container.querySelectorAll('[data-original-text]');
    highlightedEls.forEach(el => {
        if (el.dataset.originalText) {
            el.textContent = el.dataset.originalText;
        }
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 编辑配对星级
function editMatchRating(person1Id, person2Id, person1Name, person2Name, currentStars, person1PhotoFromList = null, person2PhotoFromList = null) {
    // 兼容性：如果传入的ID为空，尝试从最近一次配对管理记录中获取 internal id
    if (!person1Id || !person2Id) {
        console.warn('editMatchRating 缺少ID参数，尝试回退');
        try {
            const lastPairEl = document.querySelector('.match-pair-container');
            if (lastPairEl && lastPairEl.__matchData) {
                person1Id = person1Id || lastPairEl.__matchData.person1_internal_id;
                person2Id = person2Id || lastPairEl.__matchData.person2_internal_id;
            }
        } catch (e) {
            console.warn('回退获取 internal id 失败');
        }
    }
    currentMatchPair = {
        person1_id: person1Id,
        person1_name: person1Name,
        person2_id: person2Id,
        person2_name: person2Name
    };
    
    currentStarRating = currentStars;
    
    // 设置参与者信息
    const participant1Div = document.getElementById('starRatingParticipant1');
    const participant2Div = document.getElementById('starRatingParticipant2');
    
    // 优先使用传入的照片（来自配对管理列表），否则回退到 allUsers
    let person1Photo = person1PhotoFromList;
    let person2Photo = person2PhotoFromList;

    if (!person1Photo || !person2Photo) {
        const person1Data = (typeof allUsers !== 'undefined') ? allUsers.find(u => u.id == person1Id) : null;
        const person2Data = (typeof allUsers !== 'undefined') ? allUsers.find(u => u.id == person2Id) : null;
        
        const primaryPerson1Photo = person1Data && person1Data.photos && person1Data.photos.find(p => p.is_primary);
        person1Photo = person1Photo || (person1Data && person1Data.photos && person1Data.photos.length > 0
            ? (primaryPerson1Photo && primaryPerson1Photo.photo_url) || person1Data.photos[0].photo_url
            : '/images/default-avatar.png');
            
        const primaryPerson2Photo = person2Data && person2Data.photos && person2Data.photos.find(p => p.is_primary);
        person2Photo = person2Photo || (person2Data && person2Data.photos && person2Data.photos.length > 0
            ? (primaryPerson2Photo && primaryPerson2Photo.photo_url) || person2Data.photos[0].photo_url
            : '/images/default-avatar.png');
    }
    
    participant1Div.innerHTML = `
        <img src="${person1Photo}" alt="${person1Name}">
        <div class="name">${person1Name}</div>
    `;
    
    participant2Div.innerHTML = `
        <img src="${person2Photo}" alt="${person2Name}">
        <div class="name">${person2Name}</div>
    `;
    
    // 设置星级
    updateStarDisplay(currentStars);

    // 管理配对编辑时一定存在配对，显示“清除配对”按钮
    const removeBtn = document.getElementById('removeMatchBtn');
    if (removeBtn) removeBtn.style.display = 'inline-block';

    document.getElementById('starRatingModal').style.display = 'block';
}

// 内联配对管理星级评分初始化
function initInlineManageRating() {
    const containers = document.querySelectorAll('.match-pair-rating');
    containers.forEach(container => {
        // 避免重复绑定
        if (container.dataset.inlineBound) return;
        container.dataset.inlineBound = '1';
        const canvases = Array.from(container.querySelectorAll('.star-canvas'));
        canvases.forEach((cv, idx) => {
            cv.style.cursor = 'pointer';
            cv.addEventListener('mouseenter', () => {
                highlightInlineStars(canvases, idx + 1);
            });
            cv.addEventListener('click', async () => {
                const stars = idx + 1;
                const p1 = parseInt(container.dataset.person1Id, 10);
                const p2 = parseInt(container.dataset.person2Id, 10);
                await submitInlineRating(container, p1, p2, stars);
            });
        });
        container.addEventListener('mouseleave', () => {
            const current = parseInt(container.dataset.currentStars || '0', 10);
            highlightInlineStars(canvases, current);
        });
    });
}

function highlightInlineStars(canvases, count) {
    canvases.forEach((cv, i) => {
        cv.dataset.filled = i < count ? 'true' : 'false';
        drawStarIcon(cv, i < count);
    });
}

async function submitInlineRating(container, person1Id, person2Id, stars) {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        const resp = await fetch('/api/matchmaker/recommendations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ person1_id: person1Id, person2_id: person2Id, stars })
        });
        if (!resp.ok) {
            if (resp.status === 401) {
                handleAuthError();
                return;
            }
            const err = await resp.json().catch(()=>({message:'提交失败'}));
            throw new Error(err.message || '提交失败');
        }
        container.dataset.currentStars = stars;
        highlightInlineStars(Array.from(container.querySelectorAll('.star-canvas')), stars);
        showToast(`已更新为 ${stars} 星`, 'success');
    } catch (e) {
        console.error('内联评分失败', e);
        showToast('评分失败：' + e.message, 'error');
    }
}

// Toast 显示函数
function showToast(message, type='info', duration=4000) {
    const container = document.getElementById('toastContainer');
    if (!container) { console.warn('Toast container missing'); return; }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role','status');
    el.innerHTML = `<span style="flex:1;">${message}</span><button class="close" aria-label="关闭" onclick="(function(btn){ const parent=btn.parentElement; parent.classList.add('persist-leave'); setTimeout(()=>parent.remove(),420);})(this)">×</button>`;
    container.appendChild(el);
    let removed = false;
    let hideTimer = setTimeout(startHide, duration);
    function startHide(){
        if (removed) return; removed = true; el.classList.add('persist-leave'); setTimeout(()=> el.remove(), 420);
    }
    // 鼠标悬停暂停
    el.addEventListener('mouseenter', () => { clearTimeout(hideTimer); });
    el.addEventListener('mouseleave', () => { if (!removed) hideTimer = setTimeout(startHide, 1600); });
}

// 根据ID删除配对
async function removeMatchById(matchId, person1Name, person2Name) {
    const confirmed = await showConfirm(`确定要删除 ${person1Name} 和 ${person2Name} 的配对吗？`);
    if (!confirmed) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showToast('请先登录', 'error');
            return;
        }
        
        const response = await fetch(`/api/matchmaker/recommendations/${matchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showToast('配对已删除', 'success');
            loadManageMatches(); // 重新加载配对列表
        } else if (response.status === 401) {
            handleAuthError();
            return;
        } else {
            const error = await response.json();
            throw new Error(error.message || '删除配对失败');
        }
    } catch (error) {
        console.error('删除配对失败:', error);
    showToast('删除配对失败：' + error.message, 'error');
    }
}

// ==================== 功能开关管理 ====================

/**
 * 检查功能开关状态并显示/隐藏对应按钮
 */
async function checkFeatureFlags() {
    try {
        const response = await fetch('/api/feature-flags', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const featureFlags = data.featureFlags;
            
            // 获取按钮元素
            const groupMatchingBtn = document.getElementById('groupMatchingBtn');
            const chatMatchingBtn = document.getElementById('chatMatchingBtn');
            const viewGroupResultBtn = document.getElementById('viewGroupResultBtn');
            const viewChatResultBtn = document.getElementById('viewChatResultBtn');
            
            // 根据功能开关和用户状态显示/隐藏按钮
            const userRole = localStorage.getItem('userRole');
            const isSigned = localStorage.getItem('isSigned') === '1';
            const allowParticipantView = userRole === 'participant' && isSigned;

            if (featureFlags.grouping_enabled && allowParticipantView) {
                groupMatchingBtn.style.display = 'block';
                viewGroupResultBtn.style.display = 'block';
            } else {
                groupMatchingBtn.style.display = 'none';
                viewGroupResultBtn.style.display = 'none';
            }

            if (featureFlags.chat_enabled && allowParticipantView) {
                chatMatchingBtn.style.display = 'block';
                viewChatResultBtn.style.display = 'block';
            } else {
                chatMatchingBtn.style.display = 'none';
                viewChatResultBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('获取功能开关状态失败:', error);
        // 如果获取失败，默认隐藏所有功能按钮
        document.getElementById('groupMatchingBtn').style.display = 'none';
        document.getElementById('chatMatchingBtn').style.display = 'none';
        document.getElementById('viewGroupResultBtn').style.display = 'none';
        document.getElementById('viewChatResultBtn').style.display = 'none';
    }
}

/**
 * 分组匹配按钮点击事件
 */
function handleGroupMatching() {
    // 打开选择最喜欢的人模态（功能已实现）
    openSelectionsModal();
}

/**
 * 聊天匹配按钮点击事件
 */
function handleChatMatching() {
    // 打开选择最喜欢的人模态（功能已实现）
    openSelectionsModal();
}

// 为功能匹配按钮添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const groupMatchingBtn = document.getElementById('groupMatchingBtn');
    const chatMatchingBtn = document.getElementById('chatMatchingBtn');
    const viewGroupResultBtn = document.getElementById('viewGroupResultBtn');
    const viewChatResultBtn = document.getElementById('viewChatResultBtn');
    
    if (groupMatchingBtn) {
        groupMatchingBtn.addEventListener('click', handleGroupMatching);
    }
    
    if (chatMatchingBtn) {
        chatMatchingBtn.addEventListener('click', handleChatMatching);
    }
    
    if (viewGroupResultBtn) {
        viewGroupResultBtn.addEventListener('click', () => openUserResultsModal('grouping'));
    }
    
    if (viewChatResultBtn) {
        viewChatResultBtn.addEventListener('click', () => openUserResultsModal('chat'));
    }
    
    // 设置用户结果模态框事件监听器
    setupUserResultsEventListeners();
    
    // 页面加载时检查功能开关
    checkFeatureFlags();
});

// ==================== 用户结果查看功能 ====================

/**
 * 设置用户结果模态框事件监听器
 */
function setupUserResultsEventListeners() {
    const closeUserResultsModalBtn = document.getElementById('closeUserResultsModal');
    const userResultsBatchSelect = document.getElementById('userResultsBatchSelect');
    const userResultsModal = document.getElementById('userResultsModal');
    
    if (closeUserResultsModalBtn) {
        closeUserResultsModalBtn.addEventListener('click', closeUserResultsModal);
    }
    
    if (userResultsBatchSelect) {
        userResultsBatchSelect.addEventListener('change', loadSelectedUserBatchResult);
    }
    
    if (userResultsModal) {
        userResultsModal.addEventListener('click', (e) => {
            if (e.target === userResultsModal) {
                closeUserResultsModal();
            }
        });
    }
}

/**
 * 打开用户结果查看模态框
 * @param {string} type - 结果类型 ('grouping' 或 'chat')
 */
async function openUserResultsModal(type) {
    const modal = document.getElementById('userResultsModal');
    const titleEl = document.getElementById('userResultsTitle');
    const loadingEl = document.getElementById('userResultsLoading');
    const gridEl = document.getElementById('userResultsGrid');
    const contentEl = document.getElementById('userResultsContent');
    const emptyEl = document.getElementById('userResultsEmpty');
    
    // 检查登录状态
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showToast('请先登录', 'error');
        return;
    }
    
    // 设置标题
    const typeName = type === 'grouping' ? '分组匹配结果' : '聊天匹配结果';
    titleEl.textContent = typeName;
    
    // 存储类型
    modal.dataset.type = type;
    
    // 显示模态框
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 清空显示区域
    gridEl.innerHTML = '';
    contentEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // 加载历史轮次
    await loadUserResultsBatches(type);
}

/**
 * 关闭用户结果查看模态框
 */
function closeUserResultsModal() {
    const modal = document.getElementById('userResultsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 加载用户结果历史轮次
 * @param {string} type - 结果类型
 */
async function loadUserResultsBatches(type) {
    const batchSelect = document.getElementById('userResultsBatchSelect');
    const authToken = localStorage.getItem('authToken');
    
    try {
        const endpoint = type === 'grouping' ? '/api/user/grouping-batches' : '/api/user/chat-batches';
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取历史记录失败');
        }
        
        const data = await response.json();
        
        // 清空选项
        batchSelect.innerHTML = '<option value="">请选择轮次</option>';
        
        if (data.success && data.data.length > 0) {
            data.data.forEach(batch => {
                const option = document.createElement('option');
                option.value = batch.run_batch;
                const date = new Date(batch.created_at).toLocaleString();
                option.textContent = `第 ${batch.run_batch} 轮 (${date})`;
                batchSelect.appendChild(option);
            });
            
            // 默认选中最新轮次
            if (data.data.length > 0) {
                batchSelect.value = data.data[0].run_batch;
                await loadSelectedUserBatchResult();
            }
        } else {
            batchSelect.innerHTML = '<option value="">暂无匹配结果</option>';
            showUserResultsEmpty('暂无匹配结果');
        }
        
    } catch (error) {
        console.error('加载历史轮次失败:', error);
        loadingEl.style.display = 'none';
        showToast('加载历史轮次失败，请稍后重试', 'error');
    }
}

/**
 * 加载选中轮次的用户结果
 */
async function loadSelectedUserBatchResult() {
    const modal = document.getElementById('userResultsModal');
    const type = modal.dataset.type;
    const batchSelect = document.getElementById('userResultsBatchSelect');
    const runBatch = batchSelect.value;
    const gridEl = document.getElementById('userResultsGrid');
    const contentEl = document.getElementById('userResultsContent');
    const titleEl = document.getElementById('userResultsTitle');
    const authToken = localStorage.getItem('authToken');
    
    if (!runBatch) {
        showUserResultsEmpty('请选择轮次');
        return;
    }
    
    try {
        gridEl.innerHTML = '';
        contentEl.innerHTML = '';
        
        const endpoint = type === 'grouping' ? 
            `/api/user/grouping-result?runBatch=${runBatch}` : 
            `/api/user/chat-result?runBatch=${runBatch}`;
            
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // 如果是 404，尝试解析错误消息
            if (response.status === 404) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '未找到匹配结果');
                } catch (parseError) {
                    throw new Error('未找到匹配结果');
                }
            }
            throw new Error('获取结果失败');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 保持原标题不变（已在openUserResultsModal中设置）
            
            if (type === 'grouping') {
                renderUserGroupingResult(data.data);
            } else {
                renderUserChatResult(data.data);
            }
        } else {
            throw new Error(data.message || '获取结果失败');
        }
        
    } catch (error) {
        console.error('加载结果失败:', error);
        // 显示具体的错误信息，而不是通用的"加载失败"
        showUserResultsEmpty(error.message || '加载失败，请稍后重试');
    }
}

/**
 * 渲染用户分组匹配结果
 * @param {Object} resultData - 结果数据
 */
function renderUserGroupingResult(resultData) {
    const contentEl = document.getElementById('userResultsContent');
    const gridEl = document.getElementById('userResultsGrid');
    const { runBatch, groupId, members } = resultData;
    
    if (!members || members.length === 0) {
        showUserResultsEmpty('该轮次暂无分组结果');
        return;
    }
    
    // 清空内容区域
    contentEl.innerHTML = '';
    
    // 创建组信息卡片和组员列表
    const groupInfoCard = `
        <div class="user-group-card">
            <div class="user-group-text">您在第 ${groupId} 组</div>
        </div>
    `;
    
    const memberCards = members.map(member => {
        const photoUrl = member.photo_url || '/images/default-avatar.png';
        const displayName = member.name || member.baptismal_name || member.username;
        
        return `
            <div class="user-card">
                <img src="${photoUrl}" class="user-photo" alt="${displayName}" 
                     onerror="this.src='/images/default-avatar.png'">
                <div class="user-info">
                    <div class="user-username">${member.username}</div>
                    <div class="user-baptismal">${displayName}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // 将组信息卡片放在最前面，然后是组员卡片
    gridEl.innerHTML = groupInfoCard + memberCards;
    
    gridEl.style.display = 'grid';
}

/**
 * 渲染用户聊天匹配结果
 * @param {Object} resultData - 结果数据
 */
function renderUserChatResult(resultData) {
    const contentEl = document.getElementById('userResultsContent');
    const gridEl = document.getElementById('userResultsGrid');
    const { runBatch, targets } = resultData;
    
    if (!targets || targets.length === 0) {
        showUserResultsEmpty('该轮次暂无聊天匹配结果');
        return;
    }
    
    // 创建聊天信息标题和推荐对象列表
    const chatInfoTitle = `
        <div class="user-chat-info">
            <h3>您的推荐聊天名单</h3>
            <p>共推荐 ${targets.length} 位聊天对象</p>
        </div>
    `;
    
    const targetCards = targets.map(target => {
        const photoUrl = target.photo_url || '/images/default-avatar.png';
        const statusText = target.is_completed ? '已聊' : '未聊';
        const statusClass = target.is_completed ? 'completed' : 'pending';
        const displayName = target.name || target.baptismal_name || target.username;
        
        return `
            <div class="user-card ${statusClass}">
                <img src="${photoUrl}" class="user-photo" alt="${displayName}" 
                     onerror="this.src='/images/default-avatar.png'">
                <div class="user-info">
                    <div class="user-username">${target.username}</div>
                    <div class="user-baptismal">${displayName}</div>
                </div>
                <div class="chat-status-badge ${statusClass}">${statusText}</div>
            </div>
        `;
    }).join('');
    
    // 清空内容区域，将标题放在grid中的第一个位置
    contentEl.innerHTML = '';
    gridEl.innerHTML = chatInfoTitle + targetCards;
    
    gridEl.style.display = 'grid';
}

/**
 * 显示空结果
 * @param {string} message - 显示消息
 */
function showUserResultsEmpty(message) {
    const gridEl = document.getElementById('userResultsGrid');
    const contentEl = document.getElementById('userResultsContent');
    const emptyEl = document.getElementById('userResultsEmpty');
    
    gridEl.innerHTML = '';
    gridEl.style.display = 'none';
    contentEl.innerHTML = '';
    emptyEl.textContent = message;
    emptyEl.style.display = 'block';
}
