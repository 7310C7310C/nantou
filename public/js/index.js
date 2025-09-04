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
        // 红娘首次加载：预取配对集合用于高亮
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'matchmaker' && matchedParticipantIdSet.size === 0) {
            try { await loadMatchPairsForMatchmaker(); } catch (e) { console.warn('预取配对集合失败(忽略)', e); }
        }
        // 如果是参与者且收藏尚未初始化，先等待初始化（保险：正常流程已在登录后调用 initFavorites，这里是兜底）
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
    
    // 红娘模式下显示配对按钮
    const showMatchBtn = userRole === 'matchmaker';
    const isMatchedAlready = showMatchBtn && matchedParticipantIdSet.has(user.id);
    const matchBtnHtml = showMatchBtn ? `<button class="match-btn ${isMatchedAlready ? 'matched-exists' : ''}" data-id="${user.id}" title="配对" onclick="event.stopPropagation(); openMatchingModal(${user.id}, '${user.name}')">配对</button>` : '';
    
    const displayName = userRole === 'matchmaker' ? user.name : (user.baptismal_name || '');

    return `
        <div class="user-card" data-id="${user.id}" data-username="${user.username}" data-photos='${JSON.stringify(user.photos || [])}'>
            ${favBtnHtml}
            ${matchBtnHtml}
            <img src="${photoUrl}" alt="用户照片" class="user-photo" onerror="this.src='/placeholder.jpg'">
            <div class="user-info">
                <div class="user-username">${highlightedUsername}</div>
                <div class="user-baptismal">${displayName}</div>
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
    if (!resp.ok) return;
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
    showToast('该用户暂无照片', 'info');
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
    // 新增: 显示红娘功能按钮
    showMatchmakerButtonsIfMatchmaker(role);
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
    const favoritesModal = document.getElementById('favoritesModal');
        
        // 重置UI显示状态
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        adminPanelBtn.style.display = 'none';
    favoritesBtn.style.display = 'none';
    if (favoritesModal) favoritesModal.classList.remove('active');
        
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
                    const p = { id: id, username: cardBtn?.closest('.user-card')?.dataset.username || btnEl.closest('.user-card')?.dataset.username || '', baptismal_name: cardBtn?.closest('.user-card')?.querySelector('.user-baptismal')?.textContent || '', photos: JSON.parse(cardBtn?.closest('.user-card')?.dataset.photos || btnEl.closest('.user-card')?.dataset.photos || '[]') };
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
                return `<div class=\"user-card\" data-id=\"${p.id}\" data-username=\"${p.username}\" data-photos='${JSON.stringify(p.photos || [])}'>
                    <button class=\"favorite-toggle favorited\" data-id=\"${p.id}\" title=\"取消喜欢\"><canvas class=\"heart-icon\" width=\"24\" height=\"24\"></canvas></button>
                    <img src=\"${photoUrl}\" class=\"user-photo\" alt=\"${p.username}\" onerror=\"this.src='/placeholder.jpg'\">
                    <div class=\"user-info\"><div class=\"user-username\">${p.username}</div><div class=\"user-baptismal\">${p.baptismal_name || ''}</div></div>
                </div>`;
            }).join('');
            grid.insertAdjacentHTML('beforeend', cardsHtml);
            updateHeartIcons(grid);
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
        const baptismal = card.querySelector('.user-baptismal')?.textContent || '';
        openImageViewer(username, photos, baptismal);
    });
}

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
    // 管理配对按钮事件
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
    const targetPhoto = targetParticipantData && targetParticipantData.photos && targetParticipantData.photos.length > 0
        ? targetParticipantData.photos.find(p => p.is_primary)?.photo_url || targetParticipantData.photos[0].photo_url
        : '/images/default-avatar.png';
    
    const participantPhoto = targetParticipant.photos && targetParticipant.photos.length > 0
        ? targetParticipant.photos.find(p => p.is_primary)?.photo_url || targetParticipant.photos[0].photo_url
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
    showToast('请选择星级', 'info');
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
                // 管理配对界面，刷新配对管理数据
                if (typeof loadManageMatches === 'function') {
                    loadManageMatches();
                }
            }
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
    
    if (!confirm(`确定要清除 ${currentMatchPair.person1_name} 和 ${currentMatchPair.person2_name} 的配对吗？`)) {
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
        } else {
            const error = await response.json();
            throw new Error(error.message || '清除配对失败');
        }
    } catch (error) {
        console.error('清除配对失败:', error);
    showToast('清除配对失败：' + error.message, 'error');
    }
}

// 打开管理配对模态框
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

// 关闭管理配对模态框
function closeManageMatchesModal() {
    document.getElementById('manageMatchesModal').classList.remove('active');
    // 清空搜索框和隐藏清除按钮
    const searchInput = document.getElementById('manageMatchesSearch');
    const clearBtn = document.getElementById('manageMatchesSearchClear');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
}

// 加载管理配对数据
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
        } else {
            throw new Error('加载配对管理数据失败');
        }
    } catch (error) {
        console.error('加载配对管理数据失败:', error);
    showToast('加载配对管理数据失败：' + error.message, 'error');
    }
}

// 渲染管理配对列表
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
        const person1Photo = match.person1_photos && match.person1_photos.length > 0
            ? match.person1_photos.find(p => p.is_primary)?.photo_url || match.person1_photos[0].photo_url
            : '/images/default-avatar.png';
        
        const person2Photo = match.person2_photos && match.person2_photos.length > 0
            ? match.person2_photos.find(p => p.is_primary)?.photo_url || match.person2_photos[0].photo_url
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

// 管理配对本地过滤（ID或姓名 / 用户名模糊）
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

// 初始化管理配对搜索事件（只需绑定一次）
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
    // 兼容性：如果传入的ID为空，尝试从最近一次管理配对记录中获取 internal id
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
    
    // 优先使用传入的照片（来自管理配对列表），否则回退到 allUsers
    let person1Photo = person1PhotoFromList;
    let person2Photo = person2PhotoFromList;

    if (!person1Photo || !person2Photo) {
        const person1Data = (typeof allUsers !== 'undefined') ? allUsers.find(u => u.id == person1Id) : null;
        const person2Data = (typeof allUsers !== 'undefined') ? allUsers.find(u => u.id == person2Id) : null;
        person1Photo = person1Photo || (person1Data && person1Data.photos && person1Data.photos.length > 0
            ? person1Data.photos.find(p => p.is_primary)?.photo_url || person1Data.photos[0].photo_url
            : '/images/default-avatar.png');
        person2Photo = person2Photo || (person2Data && person2Data.photos && person2Data.photos.length > 0
            ? person2Data.photos.find(p => p.is_primary)?.photo_url || person2Data.photos[0].photo_url
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

// 内联管理配对星级评分初始化
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
    if (!confirm(`确定要删除 ${person1Name} 和 ${person2Name} 的配对吗？`)) {
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
        } else {
            const error = await response.json();
            throw new Error(error.message || '删除配对失败');
        }
    } catch (error) {
        console.error('删除配对失败:', error);
    showToast('删除配对失败：' + error.message, 'error');
    }
}
