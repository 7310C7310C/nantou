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
    
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
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
            const userGender = data.data?.user?.gender;
            
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

// 切换性别
function switchGender(gender) {
    if (currentGender === gender) return;
    
    // 保存当前性别的状态到缓存
    saveCurrentGenderState();
    
    currentGender = gender;
    
    // 从缓存加载目标性别的状态
    loadGenderState(gender);
    
    // 更新按钮状态
    document.getElementById('femaleBtn').classList.toggle('active', gender === 'female');
    document.getElementById('maleBtn').classList.toggle('active', gender === 'male');
    
    // 检查是否有缓存数据
    const cache = genderCache[gender];
    if (cache.users.length > 0 && cache.searchTerm === searchTerm) {
        // 有缓存数据且搜索条件相同，直接显示
        displayUsers(cache.users);
    // 保险：刷新心形图标（尤其是刚登录后从另一性别切回）
    const grid = document.getElementById('usersGrid');
    if (grid) updateHeartIcons(grid);
    } else {
        // 没有缓存数据或搜索条件不同，重新加载
        loadUsers();
    }
}

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
    // 只允许输入数字
    input.value = input.value.replace(/[^0-9]/g, '');
    
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
    hasMore = true;
    allUsers = [];
    
    // 清空预加载的图片缓存
    preloadedImages.clear();
    
    loadUsers();
}

// 加载用户数据
async function loadUsers() {
    if (isLoading || !hasMore) return;
    
    isLoading = true;
    
    try {
        // 如果是参与者且收藏尚未初始化，先等待初始化（保险：正常流程已在登录后调用 initFavorites，这里是兜底）
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'participant' && favoriteIds.size === 0) {
            // 仅当还没有初始化过 (用户刚登录) 时尝试一次
            await initFavorites();
        }
        const response = await fetch(`/api/participants?gender=${currentGender}&page=${currentPage}&limit=10&search=${encodeURIComponent(searchTerm)}`);
        
        if (response.ok) {
            const data = await response.json();
            const users = data.data.participants || [];
            
            if (currentPage === 0) {
                // 第一页，清空现有内容
                displayUsers(users);
            } else {
                // 追加内容
                appendUsers(users);
            }
            
            // 使用后端返回的分页信息
            hasMore = data.data.pagination.hasMore;
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
    const primaryPhoto = user.photos && user.photos.find(photo => photo.is_primary) || user.photos?.[0];
    const photoUrl = primaryPhoto ? primaryPhoto.photo_url : '/placeholder.jpg';
    
    // 高亮搜索内容
    const highlightedUsername = highlightSearchTerm(user.username, searchTerm);
    
    const isFavorited = user.is_favorited || favoriteIds.has(user.id);
    const userRole = localStorage.getItem('userRole');
    const userGender = localStorage.getItem('userGender');
    // 仅在登录参与者浏览异性列表时显示收藏按钮
    const showFavBtn = userRole === 'participant' && userGender && userGender !== currentGender;
    const favBtnHtml = showFavBtn ? `<button class="favorite-toggle ${isFavorited ? 'favorited' : ''}" data-id="${user.id}" title="收藏/取消收藏"><canvas class="heart-icon" width="24" height="24"></canvas></button>` : '';
    return `
        <div class="user-card" data-id="${user.id}" data-username="${user.username}" data-photos='${JSON.stringify(user.photos || [])}'>
            ${favBtnHtml}
            <img src="${photoUrl}" alt="用户照片" class="user-photo" onerror="this.src='/placeholder.jpg'">
            <div class="user-info">
                <div class="user-username">${highlightedUsername}</div>
                <div class="user-baptismal">${user.baptismal_name || ''}</div>
            </div>
        </div>
    `;
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
        alert('该用户暂无照片');
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
            
            // 调试信息
            console.log('登录响应数据:', data);

            if (response.ok) {
                // 登录成功
                localStorage.setItem('authToken', data.data.token);
                
                // 安全地获取用户信息
                const userRole = data.data?.user?.role || 'participant';
                const userUsername = data.data?.user?.username || username;
                const userName = data.data?.user?.name || '';
                
                localStorage.setItem('userRole', userRole);
                localStorage.setItem('username', userUsername);
                localStorage.setItem('userName', userName);
                if (data.data?.user?.gender) {
                    localStorage.setItem('userGender', data.data.user.gender);
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

// 更新用户界面
function updateUserInterface(username, role, userName = '') {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const roleBtn = document.getElementById('roleBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
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
    // 新增: 显示收藏按钮
    showFavoritesButtonIfParticipant(role);
    // 恢复下拉菜单事件绑定
    setupUserDropdown();
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
        
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const favoritesBtn = document.getElementById('favoritesBtn');
        const favoritesDrawer = document.getElementById('favoritesDrawer');
        
        // 重置UI显示状态
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        adminPanelBtn.style.display = 'none';
        favoritesBtn.style.display = 'none';
        favoritesDrawer.classList.remove('open');
        
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
        alert('请先以参与者身份登录');
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

        // 抽屉同步
        if (document.getElementById('favoritesDrawer').classList.contains('open')) {
            if (favorited) {
                const exists = document.querySelector(`.favorite-item[data-id='${participantId}']`);
                if (!exists) {
                    favoritesLoaded = false;
                    await loadFavoritesList(true);
                }
            } else {
                const item = document.querySelector(`.favorite-item[data-id='${participantId}']`);
                if (item) item.remove();
                const listEl = document.getElementById('favoritesList');
                if (!listEl.querySelector('.favorite-item')) {
                    document.getElementById('favoritesEmpty').style.display = 'block';
                }
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

// 加载收藏列表详细数据
async function loadFavoritesList(forceReload = false) {
    const drawer = document.getElementById('favoritesDrawer');
    const listEl = document.getElementById('favoritesList');
    const emptyEl = document.getElementById('favoritesEmpty');
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return;
    if (!forceReload && favoritesLoaded) return; // 已加载且非强制
    try {
        const resp = await fetch('/api/favorites', { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (resp.ok) {
            const data = await resp.json();
            const arr = data.data.favorites || [];
            favoritesLoaded = true;
            
            // 清除旧内容
            listEl.querySelectorAll('.favorite-item').forEach(i => i.remove());
            
            if (arr.length === 0) {
                emptyEl.style.display = 'block';
                return;
            } else {
                emptyEl.style.display = 'none';
            }
            
            const newItems = arr.map(p => {
                const photo = (p.photos || []).find(ph => ph.is_primary) || (p.photos || [])[0];
                const photoUrl = photo ? photo.photo_url : '/placeholder.jpg';
                const favorited = favoriteIds.has(p.id);
                return `<div class="favorite-item" data-id="${p.id}" data-username="${p.username}" data-photos='${JSON.stringify(p.photos || [])}'>
                    <button class="favorite-toggle ${favorited ? 'favorited' : ''}" data-id="${p.id}" title="取消喜欢"><canvas class="heart-icon" width="24" height="24"></canvas></button>
                    <img src="${photoUrl}" alt="${p.username}">
                    <div class="favorite-item-info"><span>${p.username}</span><span>${p.baptismal_name || ''}</span></div>
                </div>`;
            }).join('');
            
            listEl.insertAdjacentHTML('beforeend', newItems);

            listEl.querySelectorAll('.favorite-toggle canvas.heart-icon').forEach(canvas => {
                const btn = canvas.parentElement;
                const isFavorited = btn.classList.contains('favorited');
                drawHeartIcon(canvas, isFavorited);
            });
        }
    } catch (e) {
        console.error('加载收藏列表失败', e);
    }
}

// 收藏抽屉开关
function setupFavoritesDrawer() {
    const btn = document.getElementById('favoritesBtn');
    const drawer = document.getElementById('favoritesDrawer');
    const closeBtn = document.getElementById('closeFavoritesBtn');
    const listEl = document.getElementById('favoritesList');

    btn.addEventListener('click', async () => {
        const isOpen = drawer.classList.contains('open');
        drawer.classList.toggle('open');
        if (!isOpen) {
            // 抽屉刚打开时强制刷新列表
            favoritesLoaded = false;
            await loadFavoritesList(true);
        }
    });
    closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    
    // 点击抽屉外部关闭抽屉
    document.addEventListener('click', function(e) {
        if (drawer.classList.contains('open') && 
            !drawer.contains(e.target) && 
            !btn.contains(e.target)) {
            drawer.classList.remove('open');
        }
    });
    
    // 点击收藏项打开大图
    listEl.addEventListener('click', function(e) {
        const favBtn = e.target.closest('.favorite-toggle');
        if (favBtn) {
            e.stopPropagation();
            toggleFavorite(favBtn.dataset.id, favBtn);
            return;
        }
        const item = e.target.closest('.favorite-item');
        if (!item) return;
        const username = item.dataset.username;
        const photos = JSON.parse(item.dataset.photos || '[]');
        const baptismal = item.querySelector('.favorite-item-info span:last-child').textContent;
        openImageViewer(username, photos, baptismal);
    });
}

// 显示“我的喜欢”按钮（参与者登录）
function showFavoritesButtonIfParticipant(role) {
    const btn = document.getElementById('favoritesBtn');
    if (role === 'participant') {
        btn.style.display = 'block';
        if (!btn.dataset.inited) {
            setupFavoritesDrawer();
            btn.dataset.inited = '1';
        }
    } else {
        btn.style.display = 'none';
    }
}

// Toast 提示
// 已移除 toast 功能
