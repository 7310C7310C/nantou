let currentGender = 'female';
let currentPage = 0;
let isLoading = false;
let hasMore = true;
let searchTerm = '';
let allUsers = [];
let searchTimeout = null;
let preloadedImages = new Map(); // 存储预加载的图片

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('femaleBtn').classList.add('active');
    loadUsers();
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
    checkLoginStatus();
    // 管理后台按钮跳转
    document.getElementById('adminPanelBtn').addEventListener('click', function() {
        window.location.href = '/admin';
    });
});

// 切换性别
function switchGender(gender) {
    if (currentGender === gender) return;
    
    currentGender = gender;
    currentPage = 0;
    hasMore = true;
    allUsers = [];
    searchTerm = '';
    
    // 清空预加载的图片缓存
    preloadedImages.clear();
    
    // 清空搜索框
    document.getElementById('searchInput').value = '';
    document.getElementById('clearBtn').style.display = 'none';
    
    // 更新按钮状态
    document.getElementById('femaleBtn').classList.toggle('active', gender === 'female');
    document.getElementById('maleBtn').classList.toggle('active', gender === 'male');
    
    // 重新加载用户
    loadUsers();
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
    searchUsers();
}

// 搜索用户
function searchUsers() {
    searchTerm = document.getElementById('searchInput').value.trim();
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
    
    // 预加载所有用户的照片
    preloadUserPhotos(users);
}

// 追加用户
function appendUsers(users) {
    const grid = document.getElementById('usersGrid');
    const userCards = users.map(user => createUserCard(user)).join('');
    grid.insertAdjacentHTML('beforeend', userCards);
    allUsers = allUsers.concat(users);
    
    // 预加载新添加用户的照片
    preloadUserPhotos(users);
}

// 创建用户卡片
function createUserCard(user) {
    const primaryPhoto = user.photos && user.photos.find(photo => photo.is_primary) || user.photos?.[0];
    const photoUrl = primaryPhoto ? primaryPhoto.photo_url : '/placeholder.jpg';
    
    // 高亮搜索内容
    const highlightedUsername = highlightSearchTerm(user.username, searchTerm);
    
    return `
        <div class="user-card" data-username="${user.username}" data-photos='${JSON.stringify(user.photos || [])}'>
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
                
                // 根据角色跳转
                if (['admin', 'staff', 'matchmaker'].includes(userRole)) {
                    // 管理员角色跳转到管理后台，带上returnUrl参数
                    window.location.href = '/admin?returnUrl=index';
                } else {
                    // 参与者角色，关闭模态框并更新界面
                    closeLoginModal();
                    updateUserInterface(userUsername, userRole, userName);
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
    
    // 添加下拉菜单事件
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
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        adminPanelBtn.style.display = 'none';
        // 重新设置登录事件
        setupLoginEvents();
    });
}

// 页面加载时检查登录状态
function checkLoginStatus() {
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    
    if (authToken && username && userRole) {
        // 如果已登录，更新界面
        updateUserInterface(username, userRole, userName);
    }
}
