/**
 * 管理员页面JavaScript
 * 处理登录、登出和界面交互
 */

// 全局变量
let authToken = null;
let currentUser = null;

// 获取最新的认证令牌
function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  
  return authToken;
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 返回首页按钮事件
    var backHomeBtn = document.getElementById('backHomeBtn');
    if (backHomeBtn) {
        backHomeBtn.addEventListener('click', function() {
            window.location.href = '/';
        });
    }
});

// DOM 元素
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const mainContent = document.getElementById('mainContent');

// 录入相关元素
const openRegistrationBtn = document.getElementById('openRegistrationBtn');
const registrationModal = document.getElementById('registrationModal');
const closeRegistrationBtn = document.getElementById('closeRegistrationBtn');
const registrationForm = document.getElementById('registrationForm');
const photoUpload = document.getElementById('photoUpload');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const cancelBtn = document.getElementById('cancelBtn');

// 管理相关元素
const openManageBtn = document.getElementById('openManageBtn');
const manageModal = document.getElementById('manageModal');
const closeManageBtn = document.getElementById('closeManageBtn');
const participantsList = document.getElementById('participantsList');
const searchInput = document.getElementById('searchInput');
const genderFilter = document.getElementById('genderFilter');

// 删除相关元素
const deleteModal = document.getElementById('deleteModal');
const deleteConfirmInput = document.getElementById('deleteConfirmInput');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// 重设密码相关元素
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordUserInfo = document.getElementById('resetPasswordUserInfo');
const cancelResetPasswordBtn = document.getElementById('cancelResetPasswordBtn');
const confirmResetPasswordBtn = document.getElementById('confirmResetPasswordBtn');
const resetPasswordResultModal = document.getElementById('resetPasswordResultModal');
const newPasswordInfo = document.getElementById('newPasswordInfo');
const closeResetPasswordResultBtn = document.getElementById('closeResetPasswordResultBtn');

// 确认弹窗元素
const confirmModal = document.getElementById('confirmModal');
const confirmInfo = document.getElementById('confirmInfo');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

// 结果弹窗元素
const resultModal = document.getElementById('resultModal');
const accountInfo = document.getElementById('accountInfo');
const closeResultBtn = document.getElementById('closeResultBtn');

// 进度提示元素
const loadingOverlay = document.getElementById('loadingOverlay');

// 日志相关元素
const openLogsBtn = document.getElementById('openLogsBtn');
const logsModal = document.getElementById('logsModal');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const logDate = document.getElementById('logDate');
const logLevel = document.getElementById('logLevel');
const searchKeyword = document.getElementById('searchKeyword');
const logsDisplay = document.getElementById('logsDisplay');

// 大图查看相关元素
const fullscreenImage = document.getElementById('fullscreenImage');
const fullscreenImg = document.getElementById('fullscreenImg');

// 存储选择的照片
let selectedPhotos = [];

// 互选情况相关全局变量
let selectionsData = {
    participants: [],
    selections: [],
    filteredParticipants: [],
    summary: {}
};

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', function() {
    // 先隐藏所有界面，避免闪现
    userInfo.style.display = 'none';
    mainContent.style.display = 'none';
    
    checkAuthStatus();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 登出按钮
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 角色按钮下拉菜单
    setupUserDropdownMenu();
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        const userDropdownMenu = document.getElementById('userDropdownMenu');
        const roleBtn = document.getElementById('roleBtn');
        if (userDropdownMenu && roleBtn && !e.target.closest('.user-dropdown')) {
            userDropdownMenu.classList.remove('show');
            roleBtn.classList.remove('active');
        }
    });

    // 录入界面
    openRegistrationBtn.addEventListener('click', openRegistrationModal);
    closeRegistrationBtn.addEventListener('click', closeRegistrationModal);
    cancelBtn.addEventListener('click', closeRegistrationModal);
    registrationForm.addEventListener('submit', handleRegistrationSubmit);

    // 管理界面
    openManageBtn.addEventListener('click', openManageModal);
    closeManageBtn.addEventListener('click', closeManageModal);
    searchInput.addEventListener('input', filterParticipants);
    genderFilter.addEventListener('change', filterParticipants);

    // 现场签到界面
    const openCheckinBtn = document.getElementById('openCheckinBtn');
    const clearCheckinBtn = document.getElementById('clearCheckinBtn');
    const closeCheckinBtn = document.getElementById('closeCheckinBtn');
    if (openCheckinBtn) {
        openCheckinBtn.addEventListener('click', openCheckinModal);
    }
    if (clearCheckinBtn) {
        clearCheckinBtn.addEventListener('click', openClearCheckinModal);
    }
    if (closeCheckinBtn) {
        closeCheckinBtn.addEventListener('click', closeCheckinModal);
    }

    // 红娘功能
    const startMatchmakingBtn = document.getElementById('startMatchmakingBtn');
    if (startMatchmakingBtn) {
        startMatchmakingBtn.addEventListener('click', handleStartMatchmaking);
    }

    // 删除功能
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', handleDeleteParticipant);
    deleteConfirmInput.addEventListener('input', validateDeleteConfirm);

    // 重设密码功能
    cancelResetPasswordBtn.addEventListener('click', closeResetPasswordModal);
    confirmResetPasswordBtn.addEventListener('click', handleResetPassword);
    closeResetPasswordResultBtn.addEventListener('click', closeResetPasswordResultModal);

    // 清空签到功能
    const cancelClearCheckinBtn = document.getElementById('cancelClearCheckinBtn');
    const confirmClearCheckinBtn = document.getElementById('confirmClearCheckinBtn');
    const clearCheckinConfirmInput = document.getElementById('clearCheckinConfirmInput');
    if (cancelClearCheckinBtn) {
        cancelClearCheckinBtn.addEventListener('click', closeClearCheckinModal);
    }
    if (confirmClearCheckinBtn) {
        confirmClearCheckinBtn.addEventListener('click', handleClearAllCheckins);
    }
    if (clearCheckinConfirmInput) {
        clearCheckinConfirmInput.addEventListener('input', validateClearCheckinConfirm);
    }

    // 照片上传
    photoUpload.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', handlePhotoSelect);
    setupDragAndDrop();

    // 确认弹窗
    cancelConfirmBtn.addEventListener('click', closeConfirmModal);
    confirmSubmitBtn.addEventListener('click', submitRegistration);

    // 结果弹窗
    closeResultBtn.addEventListener('click', closeResultModal);

    // 错误弹窗
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    closeErrorBtn.addEventListener('click', closeErrorModal);

    // 日志功能
    openLogsBtn.addEventListener('click', openLogsModal);
    closeLogsBtn.addEventListener('click', closeLogsModal);

    // 工作人员管理功能
    const openStaffManagementBtn = document.getElementById('openStaffManagementBtn');
    if (openStaffManagementBtn) {
        openStaffManagementBtn.addEventListener('click', openStaffManagementModal);
    }
    setupStaffManagementEventListeners();

    // 互选情况功能
    const openSelectionsBtn = document.getElementById('openSelectionsBtn');
    if (openSelectionsBtn) {
        openSelectionsBtn.addEventListener('click', openSelectionsModal);
    }
    const closeSelectionsBtn = document.getElementById('closeSelectionsBtn');
    if (closeSelectionsBtn) {
        closeSelectionsBtn.addEventListener('click', closeSelectionsModal);
    }

    // 匹配算法功能
    const executeGroupMatchingBtn = document.getElementById('executeGroupMatchingBtn');
    const executeChatMatchingBtn = document.getElementById('executeChatMatchingBtn');
    const viewGroupingResultsBtn = document.getElementById('viewGroupingResultsBtn');
    const viewChatResultsBtn = document.getElementById('viewChatResultsBtn');
    
    if (executeGroupMatchingBtn) {
        executeGroupMatchingBtn.addEventListener('click', openGroupMatchingModal);
    }
    if (executeChatMatchingBtn) {
        executeChatMatchingBtn.addEventListener('click', openChatMatchingModal);
    }
    if (viewGroupingResultsBtn) {
        viewGroupingResultsBtn.addEventListener('click', () => openResultsModal('grouping'));
    }
    if (viewChatResultsBtn) {
        viewChatResultsBtn.addEventListener('click', () => openResultsModal('chat'));
    }
    
    setupMatchingEventListeners();

    // 大图查看功能
    fullscreenImage.addEventListener('click', closeFullscreenImage);

    // 点击模态框外部关闭
    registrationModal.addEventListener('click', (e) => {
        if (e.target === registrationModal) closeRegistrationModal();
    });
    manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) closeManageModal();
    });
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirmModal();
    });
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) closeResultModal();
    });
    const errorModal = document.getElementById('errorModal');
    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) closeErrorModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });
    resetPasswordModal.addEventListener('click', (e) => {
        if (e.target === resetPasswordModal) closeResetPasswordModal();
    });
    resetPasswordResultModal.addEventListener('click', (e) => {
        if (e.target === resetPasswordResultModal) closeResetPasswordResultModal();
    });
    logsModal.addEventListener('click', (e) => {
        if (e.target === logsModal) closeLogsModal();
    });
    const selectionsModal = document.getElementById('selectionsModal');
    if (selectionsModal) {
        selectionsModal.addEventListener('click', (e) => {
            if (e.target === selectionsModal) closeSelectionsModal();
        });
    }
}

// 检查认证状态
async function checkAuthStatus() {
    const token = getAuthToken();
    if (token) {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                cache: 'no-cache'
            });

            if (response.ok) {
                const user = await response.json();
                currentUser = user.data.user;
                authToken = token; // 确保authToken被设置
                
                // 更新localStorage中的用户信息
                localStorage.setItem('userRole', currentUser.role || '');
                localStorage.setItem('username', currentUser.username || '');
                
                // 安全检查：验证用户角色权限
                if (!isAuthorizedRole(currentUser.role)) {
                    showUnauthorizedMessage();
                    return;
                }
                
                showAuthenticatedUI();
            } else {
                // 清除无效的token
                localStorage.removeItem('authToken');
                authToken = null;
                redirectToLogin();
            }
        } catch (error) {
            console.error('检查认证状态失败:', error);
            // 清除可能损坏的token
            localStorage.removeItem('authToken');
            authToken = null;
            redirectToLogin();
        }
    } else {
        redirectToLogin();
    }
}

// 检查用户角色是否有权限访问管理页面
function isAuthorizedRole(role) {
    const authorizedRoles = ['admin', 'staff', 'matchmaker'];
    return authorizedRoles.includes(role);
}

// 显示权限不足消息并重定向
function showUnauthorizedMessage() {
    // 清除认证数据
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    authToken = null;
    currentUser = null;
    
    // 显示权限不足消息
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                max-width: 500px;
            ">
                <h1 style="color: #dc3545; margin-bottom: 20px;">❌ 访问被拒绝</h1>
                <p style="color: #6c757d; margin-bottom: 30px; font-size: 16px;">
                    抱歉，您没有权限访问管理后台。<br>
                    只有管理员、工作人员和红娘可以访问此页面。
                </p>
                <button onclick="window.location.href='/'" style="
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#0056b3'" 
                   onmouseout="this.style.backgroundColor='#007bff'">
                    返回首页
                </button>
            </div>
        </div>
    `;
    
    // 3秒后自动重定向到首页
    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
}

// 重定向到首页登录
function redirectToLogin() {
    window.location.href = '/';
}

// 显示已认证界面
function showAuthenticatedUI() {
    userInfo.style.display = 'block';
    mainContent.style.display = 'block';
    
    // 获取用户名
    const username = localStorage.getItem('username') || (currentUser ? currentUser.username : '');
    const role = currentUser ? currentUser.role : localStorage.getItem('userRole');
    
    // 更新角色按钮文本
    const roleText = getRoleDisplayName(role);
    document.getElementById('roleBtn').textContent = roleText;
    
    // 在下拉菜单中显示用户名
    const userInfoItem = document.getElementById('userInfoItem');
    if (userInfoItem && username) {
        userInfoItem.textContent = `账号：${username}`;
        userInfoItem.style.display = 'block';
    }

    // 根据角色控制功能模块显示
    controlUIByRole(role);

    // 如果currentUser不存在，则从服务器获取
    if (!currentUser) {
        checkAuthStatus();
    }
}

// 根据角色控制UI显示
function controlUIByRole(role) {
    const dashboardCards = document.querySelectorAll('.dashboard-card');
    
    dashboardCards.forEach(card => {
        const cardTitle = card.querySelector('h3').textContent;
        let shouldShow = false;
        
        switch (cardTitle) {
            case '👥 报名录入':
                // 只有admin和staff能用
                shouldShow = role === 'admin' || role === 'staff';
                break;
            case '✅ 现场签到':
                // 只有admin和staff能用
                shouldShow = role === 'admin' || role === 'staff';
                break;
            case '🧮 算法操作':
                // 只有admin能用
                shouldShow = role === 'admin';
                break;
            case '💕 红娘操作':
                // 只有matchmaker能用
                shouldShow = role === 'matchmaker';
                break;
            case '📊 数据统计':
                // admin、staff和matchmaker都能用
                shouldShow = role === 'admin' || role === 'staff' || role === 'matchmaker';
                break;
            case '📋 系统日志':
                // 只有admin能用
                shouldShow = role === 'admin';
                break;
            case '⚙️ 系统设置':
                // 只有admin能用
                shouldShow = role === 'admin';
                break;
            default:
                shouldShow = true;
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// 获取角色显示名称
function getRoleDisplayName(role) {
    const roleMap = {
        'admin': '管理员',
        'staff': '工作人员',
        'matchmaker': '红娘'
    };
    return roleMap[role] || role;
}

// 处理登出
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    authToken = null;
    currentUser = null;
    redirectToLogin();
}

// 设置用户下拉菜单
function setupUserDropdownMenu() {
    const roleBtn = document.getElementById('roleBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!roleBtn || !userDropdownMenu) return;

    // 移除可能已存在的旧事件监听器
    roleBtn.removeEventListener('click', handleRoleBtnClick);
    // 添加新的事件监听器
    roleBtn.addEventListener('click', handleRoleBtnClick);
}

// 处理角色按钮点击
function handleRoleBtnClick(e) {
    e.stopPropagation();
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const roleBtn = e.target;
    
    if (userDropdownMenu) {
        userDropdownMenu.classList.toggle('show');
        roleBtn.classList.toggle('active');
    }
}

// 打开录入界面
function openRegistrationModal() {
    registrationModal.style.display = 'block';
    resetForm();
}

// 关闭录入界面
function closeRegistrationModal() {
    registrationModal.style.display = 'none';
    resetForm();
}

// 打开管理界面
async function openManageModal() {
    manageModal.style.display = 'block';
    await loadParticipants();
}

// 关闭管理界面
function closeManageModal() {
    manageModal.style.display = 'none';
    searchInput.value = '';
    genderFilter.value = '';
}

// 加载参与者列表
async function loadParticipants() {
    try {
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        const response = await fetch('/api/admin/participants', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            cache: 'no-cache'
        });

        const data = await response.json();

        if (response.ok) {
            displayParticipants(data.data);
        } else {
            if (response.status === 401) {
                // 认证失败，重新登录
                localStorage.removeItem('authToken');
                authToken = null;
                redirectToLogin();
                return;
            }
            alert(data.message || '加载参与者列表失败');
        }
    } catch (error) {
        console.error('加载参与者列表失败:', error);
        if (error.message === '认证令牌不存在') {
            redirectToLogin();
            return;
        }
        alert('网络错误，请重试');
    }
}

// 显示参与者列表
function displayParticipants(participants) {
    if (participants.length === 0) {
        participantsList.innerHTML = '<div class="no-participants">暂无参与者数据</div>';
        return;
    }

    participantsList.innerHTML = participants.map(participant => `
        <div class="participant-item">
            <div class="participant-info">
                <div class="participant-name">${participant.name} ${participant.baptismal_name ? `(${participant.baptismal_name})` : ''}</div>
                <div class="participant-details">
                    <span>用户名：${participant.username}</span>
                    <span>性别：${participant.gender === 'male' ? '男' : '女'}</span>
                    <span>手机：${participant.phone}</span>
                    <span>照片：${participant.photo_count}张</span>
                    <span>录入时间：${new Date(participant.created_at).toLocaleString()}</span>
                </div>
                <div class="participant-photos">
                    ${participant.photos && participant.photos.length > 0 ? 
                        participant.photos.map(photo => `
                            <div class="participant-photo ${photo.is_primary ? 'primary' : ''}" title="${photo.is_primary ? '主图' : '照片'}">
                                <img src="${photo.photo_url}" alt="照片" onerror="this.style.display='none'" onclick="showFullscreenImage('${photo.photo_url}')" style="cursor: pointer;">
                                ${photo.is_primary ? '<span class="primary-badge">主图</span>' : ''}
                            </div>
                        `).join('') : 
                        '<div class="no-photos">暂无照片</div>'
                    }
                </div>
            </div>
            <div class="participant-actions">
                <button class="reset-password-btn" onclick="showResetPasswordConfirm(${participant.id}, '${participant.name}', '${participant.username}')">重设密码</button>
                <button class="delete-btn" onclick="showDeleteConfirm(${participant.id}, '${participant.name}')">删除账号</button>
            </div>
        </div>
    `).join('');
}

// 过滤参与者
function filterParticipants() {
    const searchTerm = searchInput.value.toLowerCase();
    const genderFilterValue = genderFilter.value;
    
    const participantItems = participantsList.querySelectorAll('.participant-item');
    
    participantItems.forEach(item => {
        const name = item.querySelector('.participant-name').textContent.toLowerCase();
        const details = item.querySelector('.participant-details').textContent.toLowerCase();
        const gender = details.includes('性别：男') ? 'male' : 'female';
        
        const matchesSearch = name.includes(searchTerm) || details.includes(searchTerm);
        const matchesGender = !genderFilterValue || gender === genderFilterValue;
        
        item.style.display = matchesSearch && matchesGender ? 'flex' : 'none';
    });
}

// 重置表单
function resetForm() {
    registrationForm.reset();
    selectedPhotos = [];
    updatePhotoPreview();
}

// 设置拖拽上传
function setupDragAndDrop() {
    photoUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUpload.classList.add('dragover');
    });

    photoUpload.addEventListener('dragleave', () => {
        photoUpload.classList.remove('dragover');
    });

    photoUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUpload.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

// 处理照片选择
function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// 处理文件
function handleFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // 检查文件数量限制
    if (selectedPhotos.length + imageFiles.length > 5) {
        showErrorModal(
            '照片数量限制',
            '最多只能选择5张照片',
            `当前已选择 ${selectedPhotos.length} 张，尝试添加 ${imageFiles.length} 张，超出限制。`
        );
        return;
    }

    // 检查文件大小限制 (15MB)
    const maxFileSize = 15 * 1024 * 1024; // 15MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
        const fileDetails = oversizedFiles.map(file => 
            `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`
        );
        
        showErrorModal(
            '文件大小超限',
            '以下文件超过15MB限制，请压缩后重新上传：',
            fileDetails
        );
        return;
    }

    // 检查文件格式
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(file => file.name);
        showErrorModal(
            '文件格式错误',
            '只能上传图片文件，以下文件格式不支持：',
            fileNames
        );
        return;
    }

    imageFiles.forEach(file => {
        if (selectedPhotos.length < 5) {
            selectedPhotos.push(file);
        }
    });

    updatePhotoPreview();
}

// 更新照片预览
function updatePhotoPreview() {
    photoPreview.innerHTML = '';
    
    selectedPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${e.target.result}" alt="预览">
                <div class="photo-controls">
                    <button type="button" class="primary-btn ${index === 0 ? 'active' : ''}" onclick="setPrimaryPhoto(${index})">
                        ${index === 0 ? '主图' : '设为主图'}
                    </button>
                    <button type="button" class="remove-btn" onclick="removePhoto(${index})">&times;</button>
                </div>
            `;
            photoPreview.appendChild(photoItem);
        };
        reader.readAsDataURL(file);
    });
}

// 移除照片
function removePhoto(index) {
    selectedPhotos.splice(index, 1);
    updatePhotoPreview();
}

// 设置主图
function setPrimaryPhoto(index) {
    if (index === 0) return; // 如果已经是主图，不做任何操作
    
    // 将选中的照片移到第一位
    const selectedPhoto = selectedPhotos[index];
    selectedPhotos.splice(index, 1);
    selectedPhotos.unshift(selectedPhoto);
    
    // 重新更新预览
    updatePhotoPreview();
}

// 处理录入表单提交
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
        return;
    }

    // 显示确认弹窗
    showConfirmModal();
}

// 验证表单
function validateForm() {
    const name = document.getElementById('name').value.trim();
    const baptismalName = document.getElementById('baptismal_name').value.trim();
    const gender = document.getElementById('gender').value;
    const phone = document.getElementById('phone').value.trim();

    if (!name) {
        alert('请输入姓名');
        return false;
    }

    if (!baptismalName) {
        alert('请输入圣名');
        return false;
    }

    if (!gender) {
        alert('请选择性别');
        return false;
    }

    if (!phone) {
        alert('请输入手机号');
        return false;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        alert('请输入有效的手机号码');
        return false;
    }

    if (selectedPhotos.length === 0) {
        alert('请至少上传一张照片');
        return false;
    }

    return true;
}

// 显示确认弹窗
function showConfirmModal() {
    const name = document.getElementById('name').value.trim();
    const baptismalName = document.getElementById('baptismal_name').value.trim();
    const gender = document.getElementById('gender').value;
    const phone = document.getElementById('phone').value.trim();

    const genderText = gender === 'male' ? '男' : '女';

    confirmInfo.innerHTML = `
        <p><strong>姓名：</strong>${name}</p>
        <p><strong>圣名：</strong>${baptismalName}</p>
        <p><strong>性别：</strong>${genderText}</p>
        <p><strong>手机号：</strong>${phone}</p>
        <p><strong>照片数量：</strong>${selectedPhotos.length}张</p>
    `;

    confirmModal.style.display = 'block';
}

// 关闭确认弹窗
function closeConfirmModal() {
    confirmModal.style.display = 'none';
}

// 提交注册
async function submitRegistration() {
    try {
        // 显示进度提示
        showLoading('正在处理...', '请稍候，正在创建账号并上传照片');
        
        // 压缩照片
        const compressedPhotos = await compressPhotos(selectedPhotos);
        
        // 创建 FormData
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value.trim());
        formData.append('baptismal_name', document.getElementById('baptismal_name').value.trim());
        formData.append('gender', document.getElementById('gender').value);
        formData.append('phone', document.getElementById('phone').value.trim());
        
        // 添加照片
        compressedPhotos.forEach((photo, index) => {
            formData.append('photos', photo, `photo_${index + 1}.jpg`);
        });

        // 发送请求
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        const response = await fetch('/api/admin/participants', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            hideLoading();
            closeConfirmModal();
            showResultModal(data.data);
        } else {
            hideLoading();
            closeConfirmModal();
            
            // 根据错误类型显示不同的错误信息
            if (data.error_type) {
                let errorDetails = null;
                
                switch (data.error_type) {
                    case 'FILE_SIZE_LIMIT':
                        errorDetails = '请将图片压缩至15MB以下后重新上传';
                        break;
                    case 'FILE_COUNT_LIMIT':
                        errorDetails = '请减少照片数量至5张以内';
                        break;
                    case 'FILE_TYPE_ERROR':
                        errorDetails = '请确保上传的文件是图片格式（JPG、PNG、GIF等）';
                        break;
                    default:
                        errorDetails = data.details || '请检查网络连接后重试';
                }
                
                showErrorModal(
                    '上传失败',
                    data.message || '服务器处理失败',
                    errorDetails
                );
            } else {
                showErrorModal(
                    '提交失败',
                    data.message || '创建账号失败',
                    '请检查输入信息是否正确，或稍后重试'
                );
            }
        }
    } catch (error) {
        console.error('提交注册失败:', error);
        hideLoading();
        closeConfirmModal();
        
        showErrorModal(
            '网络错误',
            '无法连接到服务器',
            '请检查网络连接后重试'
        );
    }
}

// 压缩照片
async function compressPhotos(photos) {
    // 如果没有 browser-image-compression 库，使用简单的压缩方法
    const compressedPhotos = [];
    
    for (const photo of photos) {
        try {
            const compressed = await compressImage(photo);
            compressedPhotos.push(compressed);
        } catch (error) {
            console.error('压缩照片失败:', error);
            compressedPhotos.push(photo); // 使用原图
        }
    }
    
    return compressedPhotos;
}

// 简单的图片压缩
function compressImage(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // 计算压缩后的尺寸
            const maxWidth = 720;
            const maxHeight = 720;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为 Blob
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.8); // 80% 质量
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 显示结果弹窗
function showResultModal(data) {
    accountInfo.innerHTML = `
        <h3>账号信息</h3>
        <p><strong>用户名：</strong>${data.username}</p>
        <p><strong>密码：</strong>${data.password}</p>
        <p><strong>照片数量：</strong>${data.photo_count}张</p>
        <div>
            <button class="copy-btn" onclick="copyAccountInfo('${data.username}', '${data.password}')">复制账号密码</button>
        </div>
    `;
    
    resultModal.style.display = 'block';
    
    // 自动复制账号密码
    setTimeout(async () => {
        try {
            await copyAccountInfo(data.username, data.password, false);
            // 复制成功后显示绿色提示
            const copyStatus = document.createElement('p');
            copyStatus.style.cssText = 'color: #28a745; font-size: 14px; margin: 10px 0;';
            copyStatus.textContent = '✅ 账号密码已自动复制到剪贴板';
            accountInfo.insertBefore(copyStatus, accountInfo.querySelector('.copy-btn').parentNode);
        } catch (error) {
            console.error('自动复制失败:', error);
        }
    }, 500); // 延迟500毫秒，确保弹窗完全显示后再复制
}

// 关闭结果弹窗
function closeResultModal() {
    resultModal.style.display = 'none';
    closeRegistrationModal();
}

// 显示错误弹窗
function showErrorModal(title, message, details = null) {
    const errorModal = document.getElementById('errorModal');
    const errorInfo = document.getElementById('errorInfo');
    
    let errorContent = `<p><strong>${message}</strong></p>`;
    
    if (details) {
        if (typeof details === 'string') {
            errorContent += `<p>${details}</p>`;
        } else if (Array.isArray(details)) {
            errorContent += '<div class="file-list">';
            details.forEach(detail => {
                errorContent += `<div class="file-item">• ${detail}</div>`;
            });
            errorContent += '</div>';
        }
    }
    
    errorInfo.innerHTML = errorContent;
    errorModal.style.display = 'block';
}

// 关闭错误弹窗
function closeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    errorModal.style.display = 'none';
}

// 显示进度提示
function showLoading(message = '正在处理...', description = '请稍候') {
    const loadingTitle = loadingOverlay.querySelector('h3');
    const loadingDesc = loadingOverlay.querySelector('p');
    
    loadingTitle.textContent = message;
    loadingDesc.textContent = description;
    loadingOverlay.style.display = 'flex';
}

// 隐藏进度提示
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// 一键复制账号密码
function copyAccountInfo(username, password, showAlert = true) {
    const accountInfo = `用户名：${username}\n密码：${password}`;
    
    return new Promise((resolve, reject) => {
        navigator.clipboard.writeText(accountInfo).then(() => {
            if (showAlert) {
                alert('账号密码已复制到剪贴板');
            }
            resolve();
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = accountInfo;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (showAlert) {
                alert('账号密码已复制到剪贴板');
            }
            resolve();
        });
    });
}

// 显示删除确认弹窗
async function showDeleteConfirm(participantId, participantName) {
    window.currentDeleteParticipantId = participantId;
    window.currentDeleteParticipantName = participantName;
    
    deleteConfirmInput.value = '';
    confirmDeleteBtn.disabled = true;
    deleteModal.style.display = 'block';
    
    // 获取并显示用户详细信息
    await loadDeleteUserInfo(participantId);
}

// 加载删除用户的详细信息
async function loadDeleteUserInfo(participantId) {
    try {
        // 请求用户信息
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        const response = await fetch(`/api/admin/participants/${participantId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // 检查响应状态

        if (response.ok) {
            const data = await response.json();
            // 处理用户信息数据
            displayDeleteUserInfo(data.data);
        } else {
            const errorText = await response.text();
            console.error('获取用户信息失败:', response.status, errorText);
            displayDeleteUserInfo(null);
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        displayDeleteUserInfo(null);
    }
}

// 显示删除用户的详细信息
function displayDeleteUserInfo(userData) {
    const deleteUserInfo = document.getElementById('deleteUserInfo');
    
    if (!userData) {
        deleteUserInfo.innerHTML = '<p style="color: #dc3545;">无法获取用户信息</p>';
        return;
    }

    deleteUserInfo.innerHTML = `
        <h4>📋 要删除的用户信息</h4>
        <div class="user-details">
            <p><strong>姓名：</strong>${userData.name}</p>
            <p><strong>圣名：</strong>${userData.baptismal_name || '无'}</p>
            <p><strong>用户名：</strong>${userData.username}</p>
            <p><strong>性别：</strong>${userData.gender === 'male' ? '男' : '女'}</p>
            <p><strong>手机号：</strong>${userData.phone}</p>
            <p><strong>照片数量：</strong>${userData.photo_count || 0}张</p>
            <p><strong>录入时间：</strong>${new Date(userData.created_at).toLocaleString()}</p>
        </div>
    `;
}

// 关闭删除确认弹窗
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteConfirmInput.value = '';
    confirmDeleteBtn.disabled = true;
    window.currentDeleteParticipantId = null;
    window.currentDeleteParticipantName = null;
}

// 验证删除确认输入
function validateDeleteConfirm() {
    const input = deleteConfirmInput.value.trim();
    confirmDeleteBtn.disabled = input !== '确定';
}

// 处理删除参与者
async function handleDeleteParticipant() {
    if (!window.currentDeleteParticipantId) {
        alert('删除信息丢失，请重试');
        return;
    }

    try {
        showLoading('正在删除...', '请稍候，正在删除账号及相关数据');
        
        // 发送删除请求
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        const response = await fetch(`/api/admin/participants/${window.currentDeleteParticipantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

                    // 检查删除响应

        if (response.ok) {
            const data = await response.json();
            closeDeleteModal();
            alert('账号删除成功');
            await loadParticipants(); // 重新加载列表
        } else {
            const errorText = await response.text();
                            // 处理删除错误响应
            
            try {
                const errorData = JSON.parse(errorText);
                alert(errorData.message || '删除账号失败');
            } catch (parseError) {
                alert('删除账号失败: ' + errorText);
            }
        }
    } catch (error) {
        console.error('删除账号失败:', error);
        alert('网络错误，请重试');
    } finally {
        hideLoading();
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('已复制到剪贴板');
    });
}

// 显示重设密码确认弹窗
async function showResetPasswordConfirm(participantId, participantName, username) {
    window.currentResetPasswordParticipantId = participantId;
    window.currentResetPasswordParticipantName = participantName;
    window.currentResetPasswordUsername = username;
    
    // 显示用户信息
    resetPasswordUserInfo.innerHTML = `
        <h4>📋 要重设密码的用户信息</h4>
        <div class="user-details">
            <p><strong>姓名：</strong>${participantName}</p>
            <p><strong>用户名：</strong>${username}</p>
        </div>
    `;
    
    resetPasswordModal.style.display = 'block';
}

// 关闭重设密码确认弹窗
function closeResetPasswordModal() {
    resetPasswordModal.style.display = 'none';
    window.currentResetPasswordParticipantId = null;
    window.currentResetPasswordParticipantName = null;
    window.currentResetPasswordUsername = null;
}

// 处理重设密码
async function handleResetPassword() {
    if (!window.currentResetPasswordParticipantId) {
        alert('重设密码信息丢失，请重试');
        return;
    }

    try {
        showLoading('正在重设密码...', '请稍候，正在生成新密码');
        
        // 发送重设密码请求
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        const response = await fetch(`/api/admin/participants/${window.currentResetPasswordParticipantId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            closeResetPasswordModal();
            showResetPasswordResult(data.data);
        } else {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                alert(errorData.message || '重设密码失败');
            } catch (parseError) {
                alert('重设密码失败: ' + errorText);
            }
        }
    } catch (error) {
        console.error('重设密码失败:', error);
        alert('网络错误，请重试');
    } finally {
        hideLoading();
    }
}

// 显示重设密码结果
function showResetPasswordResult(data) {
    newPasswordInfo.innerHTML = `
        <h4>🔑 新密码信息</h4>
        <div class="password-details">
            <p><strong>用户名：</strong>${data.username}</p>
            <p><strong>新密码：</strong>${data.new_password}</p>
        </div>
        <div style="margin-top: 15px;">
            <button class="btn btn-secondary" onclick="copyNewPassword('${data.username}', '${data.new_password}')">复制账号密码</button>
        </div>
    `;
    
    resetPasswordResultModal.style.display = 'block';
    
    // 自动复制账号密码
    setTimeout(async () => {
        try {
            await copyNewPassword(data.username, data.new_password, false);
            // 复制成功后显示绿色提示
            const copyStatus = document.createElement('p');
            copyStatus.style.cssText = 'color: #28a745; font-size: 14px; margin: 10px 0;';
            copyStatus.textContent = '✅ 新密码已自动复制到剪贴板';
            newPasswordInfo.insertBefore(copyStatus, newPasswordInfo.querySelector('.btn').parentNode);
        } catch (error) {
            console.error('自动复制失败:', error);
        }
    }, 500); // 延迟500毫秒，确保弹窗完全显示后再复制
}

// 关闭重设密码结果弹窗
function closeResetPasswordResultModal() {
    resetPasswordResultModal.style.display = 'none';
}

// 复制新密码
function copyNewPassword(username, password, showAlert = true) {
    const accountInfo = `用户名：${username}\n密码：${password}`;
    
    return new Promise((resolve, reject) => {
        navigator.clipboard.writeText(accountInfo).then(() => {
            if (showAlert) {
                alert('新密码已复制到剪贴板');
            }
            resolve();
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = accountInfo;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (showAlert) {
                alert('新密码已复制到剪贴板');
            }
            resolve();
        });
    });
}

// ==================== 日志功能 ====================

// 打开日志模态框
function openLogsModal() {
    logsModal.style.display = 'block';
    setDefaultDate();
    loadLogs();
}

// 关闭日志模态框
function closeLogsModal() {
    logsModal.style.display = 'none';
    // 清空搜索框
    searchKeyword.value = '';
    // 重置日期为今天
    setDefaultDate();
    // 重置级别为所有级别
    logLevel.value = 'all';
}

// 设置默认日期为今天
function setDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    logDate.value = dateString;
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    try {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return timestamp;
    }
}

// 解析日志级别
function parseLogLevel(logText) {
    // 匹配日志格式：[时间戳] 级别: 消息内容
    const logPattern = /^\[([^\]]+)\]\s+(\w+):/;
    const match = logText.match(logPattern);
    
    if (match) {
        const level = match[2].toLowerCase();
        // 映射级别名称
        const levelMap = {
            'error': 'error',
            'warn': 'warn',
            'warning': 'warn',
            'operation': 'operation',
            'success': 'success',
            'info': 'info',
            'debug': 'info'
        };
        return levelMap[level] || 'info';
    }
    
    // 后备方法：在文本中查找级别关键词
    if (logText.includes('ERROR')) return 'error';
    if (logText.includes('WARN')) return 'warn';
    if (logText.includes('OPERATION')) return 'operation';
    if (logText.includes('SUCCESS')) return 'success';
    if (logText.includes('INFO')) return 'info';
    return 'info';
}

// 解析日志时间戳
function parseLogTimestamp(logText) {
    // 匹配日志格式：[时间戳] 级别: 消息内容
    const logPattern = /^\[([^\]]+)\]/;
    const match = logText.match(logPattern);
    
    if (match) {
        const timestamp = match[1];
        // 尝试格式化时间戳
        return formatTimestamp(timestamp);
    }
    
    // 后备方法：匹配ISO格式的时间戳
    const timestampMatch = logText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}/);
    if (timestampMatch) {
        return formatTimestamp(timestampMatch[0]);
    }
    
    // 匹配其他格式的时间戳
    const otherMatch = logText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    if (otherMatch) {
        return otherMatch[0];
    }
    
    return '未知时间';
}

// 提取日志消息内容
function extractLogMessage(logText) {
    // 匹配日志格式：[时间戳] 级别: 消息内容 | 数据
    const logPattern = /^\[([^\]]+)\]\s+(\w+):\s+(.+?)(?:\s+\|\s+(.+))?$/;
    const match = logText.match(logPattern);
    
    if (match) {
        // 提取消息内容（第3个捕获组）
        let message = match[3].trim();
        
        return `<span class="message-text">${message}</span>`;
    }
    
    // 如果正则匹配失败，使用原来的方法作为后备
    let message = logText;
    
    // 移除时间戳部分
    message = message.replace(/^\[[^\]]+\]\s*/, '');
    
    // 移除日志级别标识
    message = message.replace(/^(ERROR|WARN|OPERATION|SUCCESS|INFO|DEBUG):\s*/, '');
    
    // 清理多余的空格和符号
    message = message.replace(/^[\s\-:]+/, '').trim();
    
    return `<span class="message-text">${message || logText}</span>`;
}

// 提取日志数据内容
function extractLogData(logText) {
    // 匹配日志格式：[时间戳] 级别: 消息内容 | 数据
    const logPattern = /^\[([^\]]+)\]\s+(\w+):\s+(.+?)(?:\s+\|\s+(.+))?$/;
    const match = logText.match(logPattern);
    
    if (match && match[4]) {
        const data = match[4].trim();
        
        try {
            // 尝试解析JSON数据
            const parsedData = JSON.parse(data);
            if (typeof parsedData === 'object' && parsedData !== null) {
                // 格式化对象数据，每个字段一行
                const formattedData = Object.entries(parsedData)
                    .map(([key, value]) => {
                        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        return `<div style="margin: 2px 0;"><strong>${key}:</strong> ${valueStr}</div>`;
                    })
                    .join('');
                return `<div class="log-data">📊 数据:<br>${formattedData}</div>`;
            } else {
                return `<div class="log-data">📊 数据: ${data}</div>`;
            }
        } catch (e) {
            // 如果不是JSON，直接显示原始数据
            return `<div class="log-data">📊 数据: ${data}</div>`;
        }
    }
    
    return '';
}

// 加载日志
async function loadLogs() {
    try {
        const level = logLevel.value;
        const date = logDate.value;
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }

        const response = await fetch(`/api/admin/logs?level=${level}&date=${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayLogs(data.data.logs);
        } else {
            console.error('加载日志失败');
        }
    } catch (error) {
        console.error('加载日志失败:', error);
    }
}// 显示日志
function displayLogs(logs) {
    if (logs.length === 0) {
        logsDisplay.innerHTML = '<div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">暂无日志</div>';
        return;
    }

    // 反转数组，让最新的日志显示在最上面
    const reversedLogs = logs.reverse();
    
    logsDisplay.innerHTML = reversedLogs.map(log => {
        const level = parseLogLevel(log);
        const timestamp = parseLogTimestamp(log);
        const message = extractLogMessage(log);
        const data = extractLogData(log);
        
        return `
            <div class="log-entry">
                <div class="log-timestamp">${timestamp}</div>
                <div class="log-level ${level}">${level}</div>
                <div class="log-message">${message}</div>
                <div class="log-data-column">${data}</div>
            </div>
        `;
    }).join('');
}

// 搜索日志
async function searchLogs() {
    try {
        const keyword = searchKeyword.value.trim();
        const level = logLevel.value;
        const date = logDate.value;
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }
        
        // 如果没有关键词，显示所有日志
        if (!keyword) {
            loadLogs();
            return;
        }

        const response = await fetch(`/api/admin/logs/search?keyword=${encodeURIComponent(keyword)}&level=${level}&date=${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayLogs(data.data.logs);
        } else {
            console.error('搜索失败');
        }
    } catch (error) {
        console.error('搜索失败:', error);
    }
}

// 防抖搜索，避免频繁请求
let searchTimeout;
searchKeyword.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchLogs();
    }, 300); // 300毫秒延迟
});

// ==================== 大图查看功能 ====================

// 显示大图
function showFullscreenImage(imageUrl) {
    fullscreenImg.src = imageUrl;
    fullscreenImage.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 关闭大图
function closeFullscreenImage() {
    fullscreenImage.style.display = 'none';
    document.body.style.overflow = ''; // 恢复背景滚动
}

// ==================== 现场签到功能 ====================

// 存储当前签到数据
let checkinData = {
    participants: [],
    filteredParticipants: [],
    currentFilter: {
        gender: 'female',
        search: '',
        uncheckedOnly: false
    }
};

// 打开现场签到模态框
async function openCheckinModal() {
    const checkinModal = document.getElementById('checkinModal');
    checkinModal.style.display = 'block';
    
    // 设置签到过滤器事件监听器
    setupCheckinEventListeners();
    
    // 加载参与者数据
    await loadCheckinParticipants();
}

// 关闭现场签到模态框
function closeCheckinModal() {
    const checkinModal = document.getElementById('checkinModal');
    checkinModal.style.display = 'none';
    
    // 清除搜索框
    clearCheckinSearch();
}

// 设置签到相关事件监听器
function setupCheckinEventListeners() {
    const checkinSearchInput = document.getElementById('checkinSearchInput');
    const clearCheckinSearchBtn = document.getElementById('clearCheckinSearchBtn');
    const checkinGenderRadios = document.querySelectorAll('input[name="checkinGender"]');
    const uncheckedOnlyCheckbox = document.getElementById('uncheckedOnlyCheckbox');
    const checkinModal = document.getElementById('checkinModal');
    const checkinConfirmModal = document.getElementById('checkinConfirmModal');
    const checkinSuccessModal = document.getElementById('checkinSuccessModal');
    const cancelCheckinConfirmBtn = document.getElementById('cancelCheckinConfirmBtn');
    const confirmCheckinBtn = document.getElementById('confirmCheckinBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    // 搜索输入
    if (checkinSearchInput) {
        checkinSearchInput.removeEventListener('input', handleCheckinSearch);
        checkinSearchInput.addEventListener('input', handleCheckinSearch);
    }

    // 清除搜索按钮
    if (clearCheckinSearchBtn) {
        clearCheckinSearchBtn.removeEventListener('click', clearCheckinSearch);
        clearCheckinSearchBtn.addEventListener('click', clearCheckinSearch);
    }

    // 性别过滤
    checkinGenderRadios.forEach(radio => {
        radio.removeEventListener('change', handleCheckinGenderFilter);
        radio.addEventListener('change', handleCheckinGenderFilter);
    });

    // 未签到过滤复选框
    if (uncheckedOnlyCheckbox) {
        uncheckedOnlyCheckbox.removeEventListener('change', handleUncheckedFilter);
        uncheckedOnlyCheckbox.addEventListener('change', handleUncheckedFilter);
    }

    // 确认弹窗事件
    if (cancelCheckinConfirmBtn) {
        cancelCheckinConfirmBtn.removeEventListener('click', closeCheckinConfirmModal);
        cancelCheckinConfirmBtn.addEventListener('click', closeCheckinConfirmModal);
    }

    if (confirmCheckinBtn) {
        confirmCheckinBtn.removeEventListener('click', handleConfirmCheckin);
        confirmCheckinBtn.addEventListener('click', handleConfirmCheckin);
    }

    // 成功提示弹窗事件
    if (closeSuccessBtn) {
        closeSuccessBtn.removeEventListener('click', closeCheckinSuccessModal);
        closeSuccessBtn.addEventListener('click', closeCheckinSuccessModal);
    }

    // 点击模态框外部关闭
    checkinModal.addEventListener('click', function(e) {
        if (e.target === checkinModal) closeCheckinModal();
    });

    checkinConfirmModal.addEventListener('click', function(e) {
        if (e.target === checkinConfirmModal) closeCheckinConfirmModal();
    });

    checkinSuccessModal.addEventListener('click', function(e) {
        if (e.target === checkinSuccessModal) closeCheckinSuccessModal();
    });

    // 清空签到弹窗外部点击关闭
    const clearCheckinModal = document.getElementById('clearCheckinModal');
    if (clearCheckinModal) {
        clearCheckinModal.addEventListener('click', function(e) {
            if (e.target === clearCheckinModal) closeClearCheckinModal();
        });
    }
}

// 加载参与者签到数据
async function loadCheckinParticipants() {
    try {
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }

        const response = await fetch('/api/admin/participants-for-checkin', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            checkinData.participants = data.data;
            
            // 应用当前过滤器
            applyCheckinFilters();
            
            // 更新统计数据
            updateCheckinStats();
            
            // 渲染参与者列表
            renderCheckinParticipants();
        } else {
            throw new Error('获取参与者数据失败');
        }
    } catch (error) {
        console.error('加载参与者数据失败:', error);
        alert('加载参与者数据失败，请重试');
    }
}

// 处理搜索
function handleCheckinSearch(e) {
    const searchValue = e.target.value.trim();
    const clearBtn = document.getElementById('clearCheckinSearchBtn');
    
    // 显示或隐藏清除按钮
    if (searchValue) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    checkinData.currentFilter.search = searchValue;
    applyCheckinFilters();
    renderCheckinParticipants();
}

// 清除搜索
function clearCheckinSearch() {
    const checkinSearchInput = document.getElementById('checkinSearchInput');
    const clearBtn = document.getElementById('clearCheckinSearchBtn');
    
    checkinSearchInput.value = '';
    clearBtn.style.display = 'none';
    checkinData.currentFilter.search = '';
    
    applyCheckinFilters();
    renderCheckinParticipants();
}

// 处理性别过滤
function handleCheckinGenderFilter(e) {
    checkinData.currentFilter.gender = e.target.value;
    applyCheckinFilters();
    renderCheckinParticipants();
    updateCheckinStats();
}

// 处理未签到过滤
function handleUncheckedFilter(e) {
    const checkbox = e.target;
    checkinData.currentFilter.uncheckedOnly = checkbox.checked;
    
    applyCheckinFilters();
    renderCheckinParticipants();
}

// 应用过滤器
function applyCheckinFilters() {
    const { gender, search, uncheckedOnly } = checkinData.currentFilter;
    
    checkinData.filteredParticipants = checkinData.participants.filter(participant => {
        // 性别过滤
        if (participant.gender !== gender) {
            return false;
        }
        
        // 搜索过滤
        if (search) {
            const searchLower = search.toLowerCase();
            const matchesUsername = participant.username.toLowerCase().includes(searchLower);
            const matchesName = participant.name.toLowerCase().includes(searchLower);
            if (!matchesUsername && !matchesName) {
                return false;
            }
        }
        
        // 未签到过滤
        if (uncheckedOnly && participant.is_checked_in) {
            return false;
        }
        
        return true;
    });
}

// 更新统计数据
function updateCheckinStats() {
    const checkedInCount = document.getElementById('checkedInCount');
    const totalCount = document.getElementById('totalCount');
    const maleCheckedCount = document.getElementById('maleCheckedCount');
    const maleTotalCount = document.getElementById('maleTotalCount');
    const femaleCheckedCount = document.getElementById('femaleCheckedCount');
    const femaleTotalCount = document.getElementById('femaleTotalCount');

    // 计算总体统计
    const totalParticipants = checkinData.participants.length;
    const totalCheckedIn = checkinData.participants.filter(p => p.is_checked_in).length;
    
    // 计算男女统计
    const maleParticipants = checkinData.participants.filter(p => p.gender === 'male');
    const femaleParticipants = checkinData.participants.filter(p => p.gender === 'female');
    const maleCheckedIn = maleParticipants.filter(p => p.is_checked_in).length;
    const femaleCheckedIn = femaleParticipants.filter(p => p.is_checked_in).length;

    // 更新显示
    if (checkedInCount) checkedInCount.textContent = totalCheckedIn;
    if (totalCount) totalCount.textContent = totalParticipants;
    if (maleCheckedCount) maleCheckedCount.textContent = maleCheckedIn;
    if (maleTotalCount) maleTotalCount.textContent = maleParticipants.length;
    if (femaleCheckedCount) femaleCheckedCount.textContent = femaleCheckedIn;
    if (femaleTotalCount) femaleTotalCount.textContent = femaleParticipants.length;
}

// 渲染参与者列表
function renderCheckinParticipants() {
    const checkinList = document.getElementById('checkinList');
    
    if (checkinData.filteredParticipants.length === 0) {
        checkinList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666; font-size: 16px;">
                暂无符合条件的参与者
            </div>
        `;
        return;
    }

    checkinList.innerHTML = checkinData.filteredParticipants.map(participant => {
        const isCheckedIn = participant.is_checked_in;
        const statusClass = isCheckedIn ? 'checked-in' : 'not-checked-in';
        const buttonText = isCheckedIn ? '取消签到' : '签到';
        const statusBadge = isCheckedIn 
            ? '<span class="status-badge status-checked">已签到</span>' 
            : '<span class="status-badge status-unchecked">未签到</span>';

        return `
            <div class="checkin-participant ${statusClass}">
                <div class="participant-info">
                    ${participant.username} ${participant.name} ${statusBadge}
                </div>
                <div class="checkin-action">
                    <button class="checkin-btn" 
                            onclick="openCheckinConfirmModal(${participant.id}, '${participant.name}', '${participant.username}', '${participant.baptismal_name || ''}', '${participant.gender}', ${isCheckedIn})">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 打开签到确认弹窗
function openCheckinConfirmModal(id, name, username, baptismalName, gender, currentStatus) {
    const checkinConfirmModal = document.getElementById('checkinConfirmModal');
    const checkinConfirmTitle = document.getElementById('checkinConfirmTitle');
    const checkinUserInfo = document.getElementById('checkinUserInfo');
    const confirmCheckinBtn = document.getElementById('confirmCheckinBtn');

    // 设置弹窗标题和按钮文字
    const action = currentStatus ? '取消签到' : '签到';
    checkinConfirmTitle.textContent = `确认${action}`;
    confirmCheckinBtn.textContent = `确认${action}`;
    confirmCheckinBtn.className = `btn ${currentStatus ? 'btn-danger' : 'btn-success'}`;

    // 设置用户信息
    checkinUserInfo.innerHTML = `
        <h4>${name} (${username})</h4>
        <p><strong>圣名:</strong> ${baptismalName || '无'}</p>
        <p><strong>性别:</strong> ${gender === 'male' ? '男' : '女'}</p>
        <p><strong>当前状态:</strong> ${currentStatus ? '已签到' : '未签到'}</p>
        <p><strong>操作:</strong> ${action}</p>
    `;

    // 存储当前操作的参与者信息
    checkinConfirmModal.dataset.participantId = id;
    checkinConfirmModal.dataset.newStatus = (!currentStatus).toString();

    checkinConfirmModal.style.display = 'block';
}

// 关闭签到确认弹窗
function closeCheckinConfirmModal() {
    const checkinConfirmModal = document.getElementById('checkinConfirmModal');
    checkinConfirmModal.style.display = 'none';
}

// 打开签到成功提示弹窗
function openCheckinSuccessModal(message) {
    const checkinSuccessModal = document.getElementById('checkinSuccessModal');
    const successTitle = document.getElementById('successTitle');
    const successMessage = document.getElementById('successMessage');
    
    // 设置标题和消息
    successTitle.textContent = `✅ ${message}`;
    successMessage.textContent = '操作已完成';
    checkinSuccessModal.style.display = 'block';
}

// 关闭签到成功提示弹窗
function closeCheckinSuccessModal() {
    const checkinSuccessModal = document.getElementById('checkinSuccessModal');
    checkinSuccessModal.style.display = 'none';
}

// 处理确认签到
async function handleConfirmCheckin() {
    try {
        const checkinConfirmModal = document.getElementById('checkinConfirmModal');
        const participantId = checkinConfirmModal.dataset.participantId;
        const newStatus = checkinConfirmModal.dataset.newStatus === 'true';
        
        showLoading();
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }

        const response = await fetch(`/api/admin/participants/${participantId}/checkin`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isCheckedIn: newStatus
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // 更新本地数据
            const participant = checkinData.participants.find(p => p.id == participantId);
            if (participant) {
                participant.is_checked_in = newStatus;
            }
            
            // 重新应用过滤器和渲染
            applyCheckinFilters();
            renderCheckinParticipants();
            updateCheckinStats();
            
            // 关闭确认弹窗
            closeCheckinConfirmModal();
            
            // 显示成功消息模态框，根据操作类型显示不同消息
            const action = newStatus ? '签到成功' : '取消签到成功';
            openCheckinSuccessModal(action);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || '操作失败');
        }
    } catch (error) {
        console.error('签到操作失败:', error);
        alert(`签到操作失败：${error.message}`);
    } finally {
        hideLoading();
    }
}

// ================== 清空签到功能 ==================

// 打开清空签到确认弹窗
function openClearCheckinModal() {
    const clearCheckinModal = document.getElementById('clearCheckinModal');
    const clearCheckinConfirmInput = document.getElementById('clearCheckinConfirmInput');
    const confirmClearCheckinBtn = document.getElementById('confirmClearCheckinBtn');
    
    // 重置表单
    if (clearCheckinConfirmInput) {
        clearCheckinConfirmInput.value = '';
    }
    if (confirmClearCheckinBtn) {
        confirmClearCheckinBtn.disabled = true;
    }
    
    if (clearCheckinModal) {
        clearCheckinModal.style.display = 'block';
    }
}

// 关闭清空签到确认弹窗
function closeClearCheckinModal() {
    const clearCheckinModal = document.getElementById('clearCheckinModal');
    if (clearCheckinModal) {
        clearCheckinModal.style.display = 'none';
    }
}

// 验证清空签到确认输入
function validateClearCheckinConfirm() {
    const clearCheckinConfirmInput = document.getElementById('clearCheckinConfirmInput');
    const confirmClearCheckinBtn = document.getElementById('confirmClearCheckinBtn');
    
    if (clearCheckinConfirmInput && confirmClearCheckinBtn) {
        const inputValue = clearCheckinConfirmInput.value.trim();
        confirmClearCheckinBtn.disabled = inputValue !== '确定';
    }
}

// 处理清空所有签到状态
async function handleClearAllCheckins() {
    const clearCheckinConfirmInput = document.getElementById('clearCheckinConfirmInput');
    
    if (!clearCheckinConfirmInput || clearCheckinConfirmInput.value.trim() !== '确定') {
        alert('请输入"确定"以确认清空操作');
        return;
    }

    try {
        showLoading();
        
        const token = getAuthToken();
        if (!token) {
            alert('请先登录');
            window.location.href = '/';
            return;
        }

        const response = await fetch('/api/admin/clear-all-checkins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: '确定'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '清空签到状态失败');
        }

        if (result.success) {
            // 关闭确认弹窗
            closeClearCheckinModal();
            
            // 显示成功消息
            const successTitle = document.getElementById('successTitle');
            const successMessage = document.getElementById('successMessage');
            const checkinSuccessModal = document.getElementById('checkinSuccessModal');
            
            if (successTitle) {
                successTitle.textContent = '✅ 清空成功';
            }
            if (successMessage) {
                const { totalParticipants, previousCheckedIn } = result.data;
                successMessage.innerHTML = `
                    <p><strong>清空操作已完成</strong></p>
                    <p>总参与者：${totalParticipants} 人</p>
                    <p>之前已签到：${previousCheckedIn} 人</p>
                    <p>现在全部重置为未签到状态</p>
                `;
            }
            if (checkinSuccessModal) {
                checkinSuccessModal.style.display = 'block';
            }
            
            // 如果签到界面是打开的，刷新数据
            const checkinModal = document.getElementById('checkinModal');
            if (checkinModal && checkinModal.style.display === 'block') {
                await loadCheckinData();
            }
        } else {
            throw new Error(result.message || '清空签到状态失败');
        }

    } catch (error) {
        console.error('清空签到状态失败:', error);
        alert('清空签到状态失败：' + error.message);
    } finally {
        hideLoading();
    }
} 

// ==================== 红娘功能 ====================

/**
 * 处理开始配对按钮点击
 */
async function handleStartMatchmaking() {
    try {
        const authToken = getAuthToken();
        if (!authToken) {
            alert('请先登录');
            return;
        }

        // 检查当前用户权限
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data.user.role !== 'matchmaker') {
                alert('权限不足，只有红娘可以访问配对功能');
                return;
            }
            
            // 跳转到首页开始配对
            window.location.href = '/';
        } else {
            throw new Error('验证用户权限失败');
        }
    } catch (error) {
        console.error('开始配对失败:', error);
        alert('开始配对失败：' + error.message);
    }
}

// ==================== 工作人员管理功能 ====================

// 工作人员管理相关元素
let staffManagementModal, createStaffModal, createStaffResultModal;
let resetStaffPasswordModal, resetStaffPasswordResultModal, deleteStaffModal;
let currentStaffId = null;

// 设置工作人员管理事件监听器
function setupStaffManagementEventListeners() {
    // 获取元素
    staffManagementModal = document.getElementById('staffManagementModal');
    createStaffModal = document.getElementById('createStaffModal');
    createStaffResultModal = document.getElementById('createStaffResultModal');
    resetStaffPasswordModal = document.getElementById('resetStaffPasswordModal');
    resetStaffPasswordResultModal = document.getElementById('resetStaffPasswordResultModal');
    deleteStaffModal = document.getElementById('deleteStaffModal');

    // 关闭按钮
    const closeStaffManagementBtn = document.getElementById('closeStaffManagementBtn');
    const closeCreateStaffBtn = document.getElementById('closeCreateStaffBtn');
    const cancelCreateStaffBtn = document.getElementById('cancelCreateStaffBtn');
    const closeCreateStaffResultBtn = document.getElementById('closeCreateStaffResultBtn');
    const cancelResetStaffPasswordBtn = document.getElementById('cancelResetStaffPasswordBtn');
    const closeResetStaffPasswordResultBtn = document.getElementById('closeResetStaffPasswordResultBtn');
    const cancelDeleteStaffBtn = document.getElementById('cancelDeleteStaffBtn');

    // 绑定关闭事件
    if (closeStaffManagementBtn) closeStaffManagementBtn.addEventListener('click', closeStaffManagementModal);
    if (closeCreateStaffBtn) closeCreateStaffBtn.addEventListener('click', closeCreateStaffModal);
    if (cancelCreateStaffBtn) cancelCreateStaffBtn.addEventListener('click', closeCreateStaffModal);
    if (closeCreateStaffResultBtn) closeCreateStaffResultBtn.addEventListener('click', closeCreateStaffResultModal);
    if (cancelResetStaffPasswordBtn) cancelResetStaffPasswordBtn.addEventListener('click', closeResetStaffPasswordModal);
    if (closeResetStaffPasswordResultBtn) closeResetStaffPasswordResultBtn.addEventListener('click', closeResetStaffPasswordResultModal);
    if (cancelDeleteStaffBtn) cancelDeleteStaffBtn.addEventListener('click', closeDeleteStaffModal);

    // 创建工作人员按钮
    const createStaffBtn = document.getElementById('createStaffBtn');
    if (createStaffBtn) createStaffBtn.addEventListener('click', openCreateStaffModal);

    // 创建工作人员表单
    const createStaffForm = document.getElementById('createStaffForm');
    if (createStaffForm) createStaffForm.addEventListener('submit', handleCreateStaff);

    // 重设密码确认按钮
    const confirmResetStaffPasswordBtn = document.getElementById('confirmResetStaffPasswordBtn');
    if (confirmResetStaffPasswordBtn) confirmResetStaffPasswordBtn.addEventListener('click', handleResetStaffPassword);

    // 删除工作人员确认输入框和按钮
    const deleteStaffConfirmInput = document.getElementById('deleteStaffConfirmInput');
    const confirmDeleteStaffBtn = document.getElementById('confirmDeleteStaffBtn');
    if (deleteStaffConfirmInput) deleteStaffConfirmInput.addEventListener('input', validateDeleteStaffConfirm);
    if (confirmDeleteStaffBtn) confirmDeleteStaffBtn.addEventListener('click', handleDeleteStaff);

    // 点击模态框外部关闭
    if (staffManagementModal) {
        staffManagementModal.addEventListener('click', (e) => {
            if (e.target === staffManagementModal) closeStaffManagementModal();
        });
    }
    if (createStaffModal) {
        createStaffModal.addEventListener('click', (e) => {
            if (e.target === createStaffModal) closeCreateStaffModal();
        });
    }
    if (createStaffResultModal) {
        createStaffResultModal.addEventListener('click', (e) => {
            if (e.target === createStaffResultModal) closeCreateStaffResultModal();
        });
    }
    if (resetStaffPasswordModal) {
        resetStaffPasswordModal.addEventListener('click', (e) => {
            if (e.target === resetStaffPasswordModal) closeResetStaffPasswordModal();
        });
    }
    if (resetStaffPasswordResultModal) {
        resetStaffPasswordResultModal.addEventListener('click', (e) => {
            if (e.target === resetStaffPasswordResultModal) closeResetStaffPasswordResultModal();
        });
    }
    if (deleteStaffModal) {
        deleteStaffModal.addEventListener('click', (e) => {
            if (e.target === deleteStaffModal) closeDeleteStaffModal();
        });
    }
}

// 检查管理员权限
function checkAdminPermission() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('权限不足，只有管理员可以管理工作人员');
        return false;
    }
    return true;
}

// 打开工作人员管理模态框
async function openStaffManagementModal() {
    if (!checkAdminPermission()) return;
    
    try {
        await loadStaffList();
        staffManagementModal.style.display = 'block';
        // 绑定角色筛选事件（只绑定一次）
        const roleFilterSelect = document.getElementById('staffRoleFilter');
        if (roleFilterSelect && !roleFilterSelect._bound) {
            roleFilterSelect.addEventListener('change', () => {
                // 使用缓存的全部列表（如果存在）
                if (window._allStaffList) {
                    displayStaffList(window._allStaffList);
                }
            });
            roleFilterSelect._bound = true;
        }
        // 确保默认值为空（所有角色）
        if (roleFilterSelect && roleFilterSelect.value !== '') {
            roleFilterSelect.value = '';
        }
        // 初次显示按照默认筛选刷新一次（保证排序应用）
        if (window._allStaffList) {
            displayStaffList(window._allStaffList);
        }
    } catch (error) {
        console.error('打开工作人员管理失败:', error);
        alert('加载工作人员列表失败');
    }
}

// 关闭工作人员管理模态框
function closeStaffManagementModal() {
    staffManagementModal.style.display = 'none';
}

// 加载工作人员列表
async function loadStaffList() {
    try {
        showLoading();
        
        const response = await fetch('/api/admin/staff', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            window._allStaffList = data.data.slice();
            displayStaffList(window._allStaffList);
        } else {
            throw new Error(data.message || '获取工作人员列表失败');
        }
    } catch (error) {
        hideLoading();
        console.error('加载工作人员列表错误:', error);
        throw error;
    }
}

// 显示工作人员列表
function displayStaffList(staffList) {
    // 缓存原始列表供筛选复用
    if (!window._allStaffList) {
        window._allStaffList = staffList.slice();
    }

    const roleFilterSelect = document.getElementById('staffRoleFilter');
    const selectedRole = roleFilterSelect ? roleFilterSelect.value : '';

    // 过滤
    let filtered = staffList;
    if (selectedRole) {
        filtered = staffList.filter(s => s.role === selectedRole);
    }

    // 按角色优先级 + 用户名自然排序 (admin01 admin02 staff01 ...)
    const rolePriority = { admin: 1, staff: 2, matchmaker: 3 };
    function parseUser(u) {
        const m = u.match(/^(.*?)(\d+)$/); // 捕获前缀+数字后缀
        if (m) {
            return { base: m[1], num: parseInt(m[2], 10) };
        }
        return { base: u, num: Number.POSITIVE_INFINITY };
    }
    filtered.sort((a, b) => {
        // 1) 角色优先级
        const rp = (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99);
        if (rp !== 0) return rp;
        // 2) 用户名自然排序：先按前缀，再按数字
        const pa = parseUser(a.username);
        const pb = parseUser(b.username);
        const baseCmp = pa.base.localeCompare(pb.base, 'zh-CN');
        if (baseCmp !== 0) return baseCmp;
        if (pa.num !== pb.num) return pa.num - pb.num;
        // 3) 完全一致时保持稳定；可再按原始 username 兜底
        return a.username.localeCompare(b.username, 'zh-CN');
    });

    const staffListElement = document.getElementById('staffList');
    
    if (filtered.length === 0) {
        staffListElement.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">暂无符合条件的工作人员</div>
                <div class="empty-state-subtext">可尝试切换筛选或点击"新建工作人员"创建新账号</div>
            </div>
        `;
        return;
    }

    const staffListHTML = filtered.map(staff => {
        const roleDisplayName = getRoleDisplayName(staff.role);
        const createDate = new Date(staff.created_at).toLocaleDateString('zh-CN');
        
        return `
            <div class="staff-item">
                <div class="staff-info">
                    <div class="staff-username">${staff.username}</div>
                    <div class="staff-role">
                        <span class="role-badge ${staff.role}">${roleDisplayName}</span>
                    </div>
                    <div class="staff-created-at">创建时间：${createDate}</div>
                </div>
                <div class="staff-actions">
                    <button class="btn btn-warning" onclick="openResetStaffPasswordModal(${staff.id}, '${staff.username}', '${roleDisplayName}')">
                        重设密码
                    </button>
                    <button class="btn btn-danger" onclick="openDeleteStaffModal(${staff.id}, '${staff.username}', '${roleDisplayName}')">
                        删除账号
                    </button>
                </div>
            </div>
        `;
    }).join('');

    staffListElement.innerHTML = staffListHTML;
}

// 打开创建工作人员模态框
function openCreateStaffModal() {
    createStaffModal.style.display = 'block';
    // 重置表单
    document.getElementById('createStaffForm').reset();
}

// 关闭创建工作人员模态框
function closeCreateStaffModal() {
    createStaffModal.style.display = 'none';
}

// 处理创建工作人员
async function handleCreateStaff(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const role = formData.get('role');
    
    if (!role) {
        alert('请选择角色');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch('/api/admin/staff', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            closeCreateStaffModal();
            showCreateStaffResult(data.data);
            await loadStaffList(); // 刷新列表
        } else {
            throw new Error(data.message || '创建工作人员失败');
        }
    } catch (error) {
        hideLoading();
        console.error('创建工作人员错误:', error);
        alert(error.message || '创建工作人员失败');
    }
}

// 显示创建工作人员结果
function showCreateStaffResult(staffData) {
    const staffAccountInfo = document.getElementById('staffAccountInfo');
    const roleDisplayName = getRoleDisplayName(staffData.role);
    
    staffAccountInfo.innerHTML = `
        <div class="account-detail">
            <span class="account-label">用户名：</span>
            <span class="account-value">${staffData.username}</span>
        </div>
        <div class="account-detail">
            <span class="account-label">密码：</span>
            <span class="account-value password-highlight">${staffData.password}</span>
        </div>
        <div class="account-detail">
            <span class="account-label">角色：</span>
            <span class="account-value">${roleDisplayName}</span>
        </div>
        <p style="margin-top: 15px; color: #856404; font-size: 14px;">
            <strong>重要提醒：</strong>请务必记录上述信息，密码只显示一次！
        </p>
    `;
    
    createStaffResultModal.style.display = 'block';
}

// 关闭创建工作人员结果模态框
function closeCreateStaffResultModal() {
    createStaffResultModal.style.display = 'none';
}

// 打开重设工作人员密码模态框
function openResetStaffPasswordModal(staffId, username, roleDisplayName) {
    currentStaffId = staffId;
    
    const resetStaffPasswordUserInfo = document.getElementById('resetStaffPasswordUserInfo');
    resetStaffPasswordUserInfo.innerHTML = `
        <div class="account-detail">
            <span class="account-label">用户名：</span>
            <span class="account-value">${username}</span>
        </div>
        <div class="account-detail">
            <span class="account-label">角色：</span>
            <span class="account-value">${roleDisplayName}</span>
        </div>
    `;
    
    resetStaffPasswordModal.style.display = 'block';
}

// 关闭重设工作人员密码模态框
function closeResetStaffPasswordModal() {
    resetStaffPasswordModal.style.display = 'none';
    currentStaffId = null;
}

// 处理重设工作人员密码
async function handleResetStaffPassword() {
    if (!currentStaffId) return;
    
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/staff/${currentStaffId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            closeResetStaffPasswordModal();
            showResetStaffPasswordResult(data.data);
        } else {
            throw new Error(data.message || '重设密码失败');
        }
    } catch (error) {
        hideLoading();
        console.error('重设工作人员密码错误:', error);
        alert(error.message || '重设密码失败');
    }
}

// 显示重设工作人员密码结果
function showResetStaffPasswordResult(data) {
    const newStaffPasswordInfo = document.getElementById('newStaffPasswordInfo');
    
    newStaffPasswordInfo.innerHTML = `
        <div class="account-detail">
            <span class="account-label">用户名：</span>
            <span class="account-value">${data.username}</span>
        </div>
        <div class="account-detail">
            <span class="account-label">新密码：</span>
            <span class="account-value password-highlight">${data.new_password}</span>
        </div>
        <p style="margin-top: 15px; color: #856404; font-size: 14px;">
            <strong>重要提醒：</strong>请务必记录新密码，密码只显示一次！
        </p>
    `;
    
    resetStaffPasswordResultModal.style.display = 'block';
}

// 关闭重设工作人员密码结果模态框
function closeResetStaffPasswordResultModal() {
    resetStaffPasswordResultModal.style.display = 'none';
}

// 打开删除工作人员模态框
function openDeleteStaffModal(staffId, username, roleDisplayName) {
    currentStaffId = staffId;
    
    const deleteStaffUserInfo = document.getElementById('deleteStaffUserInfo');
    deleteStaffUserInfo.innerHTML = `
        <div class="account-detail">
            <span class="account-label">用户名：</span>
            <span class="account-value">${username}</span>
        </div>
        <div class="account-detail">
            <span class="account-label">角色：</span>
            <span class="account-value">${roleDisplayName}</span>
        </div>
    `;
    
    // 重置确认输入框
    const deleteStaffConfirmInput = document.getElementById('deleteStaffConfirmInput');
    deleteStaffConfirmInput.value = '';
    validateDeleteStaffConfirm();
    
    deleteStaffModal.style.display = 'block';
}

// 关闭删除工作人员模态框
function closeDeleteStaffModal() {
    deleteStaffModal.style.display = 'none';
    currentStaffId = null;
}

// 验证删除工作人员确认输入
function validateDeleteStaffConfirm() {
    const input = document.getElementById('deleteStaffConfirmInput');
    const confirmBtn = document.getElementById('confirmDeleteStaffBtn');
    
    if (input.value.trim() === '确定') {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    } else {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    }
}

// 处理删除工作人员
async function handleDeleteStaff() {
    if (!currentStaffId) return;
    
    const confirmInput = document.getElementById('deleteStaffConfirmInput');
    if (confirmInput.value.trim() !== '确定') {
        alert('请输入"确定"二字以确认删除');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/admin/staff/${currentStaffId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            closeDeleteStaffModal();
            alert('工作人员删除成功');
            await loadStaffList(); // 刷新列表
        } else {
            throw new Error(data.message || '删除工作人员失败');
        }
    } catch (error) {
        hideLoading();
        console.error('删除工作人员错误:', error);
        alert(error.message || '删除工作人员失败');
    }
}

// ==================== 功能开关管理 ====================

// 功能开关相关元素
const openFeatureFlagsBtn = document.getElementById('openFeatureFlagsBtn');
const featureFlagsModal = document.getElementById('featureFlagsModal');
const closeFeatureFlagsBtn = document.getElementById('closeFeatureFlagsBtn');
const closeFeatureFlagsConfirmBtn = document.getElementById('closeFeatureFlagsConfirmBtn');
const groupingToggle = document.getElementById('groupingToggle');
const chatToggle = document.getElementById('chatToggle');

// 打开功能开关模态框
if (openFeatureFlagsBtn) {
    openFeatureFlagsBtn.addEventListener('click', async function() {
        await loadFeatureFlags();
        featureFlagsModal.style.display = 'block';
    });
}

// 关闭功能开关模态框
function closeFeatureFlagsModal() {
    featureFlagsModal.style.display = 'none';
}

if (closeFeatureFlagsBtn) {
    closeFeatureFlagsBtn.addEventListener('click', closeFeatureFlagsModal);
}

if (closeFeatureFlagsConfirmBtn) {
    closeFeatureFlagsConfirmBtn.addEventListener('click', closeFeatureFlagsModal);
}

// 点击模态框外部关闭
featureFlagsModal?.addEventListener('click', function(e) {
    if (e.target === featureFlagsModal) {
        closeFeatureFlagsModal();
    }
});

// 加载当前功能开关状态
async function loadFeatureFlags() {
    try {
        showLoading();
        
        const response = await fetch('/api/admin/feature-flags', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            const flags = data.featureFlags;
            
            // 设置开关状态
            groupingToggle.checked = flags.grouping_enabled;
            chatToggle.checked = flags.chat_enabled;
        } else {
            throw new Error(data.message || '获取功能开关状态失败');
        }
    } catch (error) {
        hideLoading();
        console.error('获取功能开关状态错误:', error);
        showToast(error.message || '获取功能开关状态失败', 'error');
        // 默认设置为关闭状态
        groupingToggle.checked = false;
        chatToggle.checked = false;
    }
}

// 更新功能开关状态
async function updateFeatureFlag(flagType, enabled) {
    try {
        let groupingEnabled = false;
        let chatEnabled = false;
        
        if (flagType === 'grouping') {
            groupingEnabled = enabled;
            chatEnabled = false; // 确保互斥
        } else if (flagType === 'chat') {
            groupingEnabled = false; // 确保互斥
            chatEnabled = enabled;
        }
        
        const response = await fetch('/api/admin/feature-flags', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grouping_enabled: groupingEnabled,
                chat_enabled: chatEnabled
            })
        });

        const data = await response.json();

        if (data.success) {
            // 更新UI状态以确保互斥
            groupingToggle.checked = groupingEnabled;
            chatToggle.checked = chatEnabled;
            
            // 显示成功提示
            if (enabled) {
                showToast(`${flagType === 'grouping' ? '分组匹配功能' : '聊天匹配功能'} 已启用`, 'success');
            } else {
                showToast(`${flagType === 'grouping' ? '分组匹配功能' : '聊天匹配功能'} 已关闭`, 'info');
            }
        } else {
            throw new Error(data.message || '更新功能开关失败');
        }
    } catch (error) {
        console.error('更新功能开关错误:', error);
        showToast(error.message || '更新功能开关失败', 'error');
        
        // 恢复之前的状态
        await loadFeatureFlags();
    }
}

// 分组功能开关事件
if (groupingToggle) {
    groupingToggle.addEventListener('change', function() {
        updateFeatureFlag('grouping', this.checked);
    });
}

// 聊天任务功能开关事件
if (chatToggle) {
    chatToggle.addEventListener('change', function() {
        updateFeatureFlag('chat', this.checked);
    });
}

// Toast 显示函数
function showToast(message, type='info', duration=4000) {
    const container = document.getElementById('toastContainer');
    if (!container) { 
        console.warn('Toast container missing'); 
        return; 
    }
    
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role','status');
    el.innerHTML = `<span style="flex:1;">${message}</span><button class="close" aria-label="关闭" onclick="(function(btn){ const parent=btn.parentElement; parent.classList.add('persist-leave'); setTimeout(()=>parent.remove(),420);})(this)">×</button>`;
    container.appendChild(el);
    
    let removed = false;
    let hideTimer = setTimeout(startHide, duration);
    
    function startHide(){
        if (removed) return; 
        removed = true; 
        el.classList.add('persist-leave'); 
        setTimeout(()=> el.remove(), 420);
    }
    
    // 鼠标悬停暂停
    el.addEventListener('mouseenter', () => { 
        clearTimeout(hideTimer); 
    });
    el.addEventListener('mouseleave', () => { 
        if (!removed) hideTimer = setTimeout(startHide, 1600); 
    });
}

// ==================== 互选情况相关功能 ====================

// 打开互选情况模态框
async function openSelectionsModal() {
    const selectionsModal = document.getElementById('selectionsModal');
    selectionsModal.style.display = 'block';
    
    // 设置互选情况事件监听器
    setupSelectionsEventListeners();
    
    // 加载互选情况数据
    await loadSelectionsData();
}

// 关闭互选情况模态框
function closeSelectionsModal() {
    const selectionsModal = document.getElementById('selectionsModal');
    selectionsModal.style.display = 'none';
    
    // 清除搜索框
    clearSelectionsSearch();
}

// 设置互选情况相关事件监听器
function setupSelectionsEventListeners() {
    const selectionsSearchInput = document.getElementById('selectionsSearchInput');
    const clearSelectionsSearchBtn = document.getElementById('clearSelectionsSearchBtn');
    const selectionsGenderRadios = document.querySelectorAll('input[name="selectionsGender"]');
    const selectionsFilterRadios = document.querySelectorAll('input[name="selectionsFilter"]');

    // 搜索输入
    if (selectionsSearchInput) {
        selectionsSearchInput.removeEventListener('input', handleSelectionsSearch);
        selectionsSearchInput.addEventListener('input', handleSelectionsSearch);
    }

    // 清除搜索按钮
    if (clearSelectionsSearchBtn) {
        clearSelectionsSearchBtn.removeEventListener('click', clearSelectionsSearch);
        clearSelectionsSearchBtn.addEventListener('click', clearSelectionsSearch);
    }

    // 性别过滤
    selectionsGenderRadios.forEach(radio => {
        radio.removeEventListener('change', handleSelectionsGenderFilter);
        radio.addEventListener('change', handleSelectionsGenderFilter);
    });

    // 过滤选项单选按钮
    selectionsFilterRadios.forEach(radio => {
        radio.removeEventListener('change', handleSelectionsFilterChange);
        radio.addEventListener('change', handleSelectionsFilterChange);
    });
}

// 加载互选情况数据
async function loadSelectionsData() {
    try {
        const token = getAuthToken();
        
        if (!token) {
            throw new Error('认证令牌不存在');
        }

        const response = await fetch('/api/admin/selections-data', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            selectionsData = data.data;
            
            // 应用当前过滤器
            applySelectionsFilters();
            
            // 更新统计数据
            updateSelectionsStats();
            
            // 渲染参与者列表
            renderSelectionsParticipants();
        } else {
            throw new Error('获取互选情况数据失败');
        }
    } catch (error) {
        console.error('加载互选情况数据失败:', error);
        showToast('加载互选情况数据失败: ' + error.message, 'error');
    }
}

// 更新互选情况统计数据
function updateSelectionsStats() {
    const selectionsTotal = document.getElementById('selectionsTotal');
    const selectionsMaleCount = document.getElementById('selectionsMaleCount');
    const selectionsFemaleCount = document.getElementById('selectionsFemaleCount');

    if (selectionsTotal) {
        selectionsTotal.textContent = selectionsData.summary.totalParticipants || 0;
    }
    if (selectionsMaleCount) {
        selectionsMaleCount.textContent = selectionsData.summary.maleCount || 0;
    }
    if (selectionsFemaleCount) {
        selectionsFemaleCount.textContent = selectionsData.summary.femaleCount || 0;
    }
}

// 应用互选情况过滤器
function applySelectionsFilters() {
    let filtered = [...selectionsData.participants];
    
    // 搜索过滤
    const searchValue = document.getElementById('selectionsSearchInput')?.value.trim().toLowerCase();
    if (searchValue) {
        filtered = filtered.filter(participant => 
            participant.username.toLowerCase().includes(searchValue) ||
            participant.name.toLowerCase().includes(searchValue) ||
            participant.baptismal_name.toLowerCase().includes(searchValue)
        );
    }
    
    // 性别过滤
    const selectedGender = document.querySelector('input[name="selectionsGender"]:checked')?.value;
    if (selectedGender) {
        filtered = filtered.filter(participant => participant.gender === selectedGender);
    }
    
    // 过滤选项处理
    const selectedFilter = document.querySelector('input[name="selectionsFilter"]:checked')?.id;
    
    if (selectedFilter === 'withSelectionsOnlyCheckbox') {
        // 只看有互选的过滤
        const participantsWithSelections = new Set(selectionsData.selections.map(s => s.user_id));
        filtered = filtered.filter(participant => participantsWithSelections.has(participant.id));
    } else if (selectedFilter === 'notFullSelectionsCheckbox') {
        // 只看未选满的过滤（未选满5个）
        filtered = filtered.filter(participant => {
            const userSelections = selectionsData.selections.filter(s => s.user_id === participant.id);
            return userSelections.length < 5;
        });
    } else if (selectedFilter === 'fullSelectionsCheckbox') {
        // 只看选满的过滤（已选满5个）
        filtered = filtered.filter(participant => {
            const userSelections = selectionsData.selections.filter(s => s.user_id === participant.id);
            return userSelections.length === 5;
        });
    }
    // allSelectionsFilter 或其他情况显示全部，不需要额外过滤
    
    selectionsData.filteredParticipants = filtered;
}

// 渲染互选情况参与者列表
function renderSelectionsParticipants() {
    const selectionsList = document.getElementById('selectionsList');
    if (!selectionsList) return;

    if (selectionsData.filteredParticipants.length === 0) {
        selectionsList.innerHTML = `
            <div class="no-selections">
                <span class="emoji">😔</span>
                <div>没有找到符合条件的参与者</div>
            </div>
        `;
        return;
    }

    const html = selectionsData.filteredParticipants.map(participant => {
        const userSelections = selectionsData.selections.filter(s => s.user_id === participant.id);
        
        return `
            <div class="selections-item">
                <div class="selections-item-header">
                    <div class="selections-avatar">
                        ${participant.photo_url ? 
                            `<img src="${participant.photo_url}" alt="${participant.name}">` : 
                            `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background-color: #f0f0f0; color: #999; font-size: 12px;">无照片</div>`
                        }
                    </div>
                    <div class="selections-user-info">
                        <div class="selections-user-name">${participant.name} (${participant.username})</div>
                    </div>
                </div>
                ${userSelections.length > 0 ? `
                    <div class="selections-targets">
                        <div class="selections-targets-title">选择的对象：</div>
                        <div class="selections-target-list">
                            ${userSelections.map(selection => {
                                // 检查是否为互选关系
                                const mutualKey1 = `${Math.min(participant.id, selection.target_id)}-${Math.max(participant.id, selection.target_id)}`;
                                const isMutual = selectionsData.mutualSelections && selectionsData.mutualSelections.includes(mutualKey1);
                                
                                return `
                                    <div class="selections-target-item ${isMutual ? 'mutual-selection' : ''}">
                                        <div class="selections-target-priority">${selection.priority}</div>
                                        <span>${selection.target_name} (${selection.target_username})</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="selections-targets">
                        <div class="selections-targets-title">选择的对象：</div>
                        <div class="selections-no-choice">无选择</div>
                    </div>
                `}
            </div>
        `;
    }).join('');

    selectionsList.innerHTML = html;
}

// 处理互选情况搜索
function handleSelectionsSearch() {
    const searchInput = document.getElementById('selectionsSearchInput');
    const clearBtn = document.getElementById('clearSelectionsSearchBtn');
    
    if (searchInput.value.trim()) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    applySelectionsFilters();
    renderSelectionsParticipants();
}

// 清除互选情况搜索
function clearSelectionsSearch() {
    const searchInput = document.getElementById('selectionsSearchInput');
    const clearBtn = document.getElementById('clearSelectionsSearchBtn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    applySelectionsFilters();
    renderSelectionsParticipants();
}

// 处理互选情况性别过滤
function handleSelectionsGenderFilter() {
    applySelectionsFilters();
    renderSelectionsParticipants();
}

// 处理过滤选项变化
function handleSelectionsFilterChange() {
    applySelectionsFilters();
    renderSelectionsParticipants();
}

// ==================== 匹配算法管理功能 ====================

// 设置匹配相关事件监听器
function setupMatchingEventListeners() {
    // 分组匹配模态框
    const closeGroupMatchingBtn = document.getElementById('closeGroupMatchingBtn');
    const cancelGroupMatchingBtn = document.getElementById('cancelGroupMatchingBtn');
    const executeGroupMatchingConfirmBtn = document.getElementById('executeGroupMatchingConfirmBtn');
    
    if (closeGroupMatchingBtn) {
        closeGroupMatchingBtn.addEventListener('click', closeGroupMatchingModal);
    }
    if (cancelGroupMatchingBtn) {
        cancelGroupMatchingBtn.addEventListener('click', closeGroupMatchingModal);
    }
    if (executeGroupMatchingConfirmBtn) {
        executeGroupMatchingConfirmBtn.addEventListener('click', executeGroupMatchingConfirm);
    }
    
    // 聊天匹配模态框
    const closeChatMatchingBtn = document.getElementById('closeChatMatchingBtn');
    const cancelChatMatchingBtn = document.getElementById('cancelChatMatchingBtn');
    const executeChatMatchingConfirmBtn = document.getElementById('executeChatMatchingConfirmBtn');
    
    if (closeChatMatchingBtn) {
        closeChatMatchingBtn.addEventListener('click', closeChatMatchingModal);
    }
    if (cancelChatMatchingBtn) {
        cancelChatMatchingBtn.addEventListener('click', closeChatMatchingModal);
    }
    if (executeChatMatchingConfirmBtn) {
        executeChatMatchingConfirmBtn.addEventListener('click', executeChatMatchingConfirm);
    }
    
    // 数字输入按钮
    setupNumberInputs();
    
    // 匹配确认模态框
    const cancelMatchingConfirmBtn = document.getElementById('cancelMatchingConfirmBtn');
    const confirmMatchingExecuteBtn = document.getElementById('confirmMatchingExecuteBtn');
    
    if (cancelMatchingConfirmBtn) {
        cancelMatchingConfirmBtn.addEventListener('click', closeMatchingConfirmModal);
    }
    if (confirmMatchingExecuteBtn) {
        confirmMatchingExecuteBtn.addEventListener('click', executeMatching);
    }
    
    // 结果查看模态框
    const closeResultsBtn = document.getElementById('closeResultsBtn');
    const resultsBatchSelect = document.getElementById('resultsBatchSelect');
    
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', closeResultsModal);
    }
    if (resultsBatchSelect) {
        resultsBatchSelect.addEventListener('change', loadSelectedBatchResult);
    }
    
    // 模态框外部点击关闭
    const groupMatchingModal = document.getElementById('groupMatchingModal');
    const chatMatchingModal = document.getElementById('chatMatchingModal');
    const matchingConfirmModal = document.getElementById('matchingConfirmModal');
    const matchingResultsModal = document.getElementById('matchingResultsModal');
    
    if (groupMatchingModal) {
        groupMatchingModal.addEventListener('click', (e) => {
            if (e.target === groupMatchingModal) closeGroupMatchingModal();
        });
    }
    if (chatMatchingModal) {
        chatMatchingModal.addEventListener('click', (e) => {
            if (e.target === chatMatchingModal) closeChatMatchingModal();
        });
    }
    if (matchingConfirmModal) {
        matchingConfirmModal.addEventListener('click', (e) => {
            if (e.target === matchingConfirmModal) closeMatchingConfirmModal();
        });
    }
    if (matchingResultsModal) {
        matchingResultsModal.addEventListener('click', (e) => {
            if (e.target === matchingResultsModal) closeResultsModal();
        });
    }
}

// 设置数字输入控件
function setupNumberInputs() {
    // 分组匹配 - 男性数量
    const groupMaleDecBtn = document.getElementById('groupMaleDecBtn');
    const groupMaleIncBtn = document.getElementById('groupMaleIncBtn');
    const groupMaleSize = document.getElementById('groupMaleSize');
    
    if (groupMaleDecBtn && groupMaleIncBtn && groupMaleSize) {
        groupMaleDecBtn.addEventListener('click', () => adjustNumber('groupMaleSize', -1));
        groupMaleIncBtn.addEventListener('click', () => adjustNumber('groupMaleSize', 1));
    }
    
    // 分组匹配 - 女性数量
    const groupFemaleDecBtn = document.getElementById('groupFemaleDecBtn');
    const groupFemaleIncBtn = document.getElementById('groupFemaleIncBtn');
    const groupFemaleSize = document.getElementById('groupFemaleSize');
    
    if (groupFemaleDecBtn && groupFemaleIncBtn && groupFemaleSize) {
        groupFemaleDecBtn.addEventListener('click', () => adjustNumber('groupFemaleSize', -1));
        groupFemaleIncBtn.addEventListener('click', () => adjustNumber('groupFemaleSize', 1));
    }
    
    // 聊天匹配 - 名单大小
    const chatListDecBtn = document.getElementById('chatListDecBtn');
    const chatListIncBtn = document.getElementById('chatListIncBtn');
    const chatListSize = document.getElementById('chatListSize');
    
    if (chatListDecBtn && chatListIncBtn && chatListSize) {
        chatListDecBtn.addEventListener('click', () => adjustNumber('chatListSize', -1));
        chatListIncBtn.addEventListener('click', () => adjustNumber('chatListSize', 1));
    }
}

// 调整数字输入值
function adjustNumber(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const currentValue = parseInt(input.value) || 0;
    const minValue = parseInt(input.min) || 1;
    const maxValue = parseInt(input.max) || 20;
    
    const newValue = Math.max(minValue, Math.min(maxValue, currentValue + delta));
    input.value = newValue;
    
    // 触发验证检查
    if (inputId.startsWith('group')) {
        validateGroupMatching();
    } else if (inputId.startsWith('chat')) {
        validateChatMatching();
    }
}

// 打开分组匹配配置模态框
async function openGroupMatchingModal() {
    try {
        // 检查功能开关
        const response = await fetch('/api/admin/feature-flags', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('无法获取功能开关状态');
        }
        
        const data = await response.json();
        if (!data.success || !data.featureFlags.grouping_enabled) {
            showToast('分组匹配功能未开启，请先在系统设置中开启该功能', 'error');
            return;
        }
        
        // 显示模态框
        const modal = document.getElementById('groupMatchingModal');
        if (modal) {
            modal.style.display = 'block';
            
            // 重置配置值
            document.getElementById('groupMaleSize').value = 3;
            document.getElementById('groupFemaleSize').value = 3;
            
            // 开始验证
            validateGroupMatching();
        }
        
    } catch (error) {
        console.error('打开分组匹配配置失败:', error);
        showToast('打开分组匹配配置失败，请稍后重试', 'error');
    }
}

// 关闭分组匹配配置模态框
function closeGroupMatchingModal() {
    const modal = document.getElementById('groupMatchingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 打开聊天匹配配置模态框
async function openChatMatchingModal() {
    try {
        // 检查功能开关
        const response = await fetch('/api/admin/feature-flags', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('无法获取功能开关状态');
        }
        
        const data = await response.json();
        if (!data.success || !data.featureFlags.chat_enabled) {
            showToast('聊天匹配功能未开启，请先在系统设置中开启该功能', 'error');
            return;
        }
        
        // 显示模态框
        const modal = document.getElementById('chatMatchingModal');
        if (modal) {
            modal.style.display = 'block';
            
            // 重置配置值
            document.getElementById('chatListSize').value = 5;
            
            // 开始验证
            validateChatMatching();
        }
        
    } catch (error) {
        console.error('打开聊天匹配配置失败:', error);
        showToast('打开聊天匹配配置失败，请稍后重试', 'error');
    }
}

// 关闭聊天匹配配置模态框
function closeChatMatchingModal() {
    const modal = document.getElementById('chatMatchingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 验证分组匹配配置
async function validateGroupMatching() {
    const statusDiv = document.getElementById('groupValidationStatus');
    const executeBtn = document.getElementById('executeGroupMatchingConfirmBtn');
    const loadingSpinner = statusDiv.querySelector('.loading-spinner');
    const resultDiv = statusDiv.querySelector('.validation-result');
    
    // 显示加载状态
    loadingSpinner.style.display = 'block';
    resultDiv.innerHTML = '';
    resultDiv.className = 'validation-result';
    executeBtn.disabled = true;
    
    try {
        const response = await fetch('/api/admin/validate-selections', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('验证失败');
        }
        
        const data = await response.json();
        
        loadingSpinner.style.display = 'none';
        
        if (data.success && data.data.isValid) {
            resultDiv.className = 'validation-result success';
            resultDiv.innerHTML = '<p>✅ 所有已签到用户都已完成选择，可以执行分组匹配</p>';
            executeBtn.disabled = false;
        } else {
            resultDiv.className = 'validation-result error';
            let html = '<p>❌ 存在未完成选择的用户，无法执行分组匹配</p>';
            
            if (data.data && data.data.missingUsers && data.data.missingUsers.length > 0) {
                html += '<div class="missing-users-list">';
                html += '<p><strong>未完成选择的用户：</strong></p>';
                
                data.data.missingUsers.forEach(user => {
                    const genderText = user.gender === 'male' ? '男' : '女';
                    html += `
                        <div class="missing-user-item">
                            <div>
                                <div class="user-name">${user.name}（${user.username}）</div>
                                <div class="user-details">${genderText} | 已选择: ${user.currentSelections}/5</div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            resultDiv.innerHTML = html;
        }
        
    } catch (error) {
        console.error('验证失败:', error);
        loadingSpinner.style.display = 'none';
        resultDiv.className = 'validation-result error';
        resultDiv.innerHTML = '<p>验证失败，请稍后重试</p>';
    }
}

// 验证聊天匹配配置
async function validateChatMatching() {
    const statusDiv = document.getElementById('chatValidationStatus');
    const executeBtn = document.getElementById('executeChatMatchingConfirmBtn');
    const loadingSpinner = statusDiv.querySelector('.loading-spinner');
    const resultDiv = statusDiv.querySelector('.validation-result');
    
    // 显示加载状态
    loadingSpinner.style.display = 'block';
    resultDiv.innerHTML = '';
    resultDiv.className = 'validation-result';
    executeBtn.disabled = true;
    
    try {
        const response = await fetch('/api/admin/validate-selections', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('验证失败');
        }
        
        const data = await response.json();
        
        loadingSpinner.style.display = 'none';
        
        if (data.success && data.data.isValid) {
            resultDiv.className = 'validation-result success';
            resultDiv.innerHTML = '<p>✅ 所有已签到用户都已完成选择，可以执行聊天匹配</p>';
            executeBtn.disabled = false;
        } else {
            resultDiv.className = 'validation-result error';
            let html = '<p>❌ 存在未完成选择的用户，无法执行聊天匹配</p>';
            
            if (data.data && data.data.missingUsers && data.data.missingUsers.length > 0) {
                html += '<div class="missing-users-list">';
                html += '<p><strong>未完成选择的用户：</strong></p>';
                
                data.data.missingUsers.forEach(user => {
                    const genderText = user.gender === 'male' ? '男' : '女';
                    html += `
                        <div class="missing-user-item">
                            <div>
                                <div class="user-name">${user.name}（${user.username}）</div>
                                <div class="user-details">${genderText} | 已选择: ${user.currentSelections}/5</div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            resultDiv.innerHTML = html;
        }
        
    } catch (error) {
        console.error('验证失败:', error);
        loadingSpinner.style.display = 'none';
        resultDiv.className = 'validation-result error';
        resultDiv.innerHTML = '<p>验证失败，请稍后重试</p>';
    }
}

// 分组匹配执行确认
function executeGroupMatchingConfirm() {
    const maleSize = parseInt(document.getElementById('groupMaleSize').value);
    const femaleSize = parseInt(document.getElementById('groupFemaleSize').value);
    
    // 关闭配置模态框
    closeGroupMatchingModal();
    
    // 显示确认模态框
    const confirmModal = document.getElementById('matchingConfirmModal');
    const titleEl = document.getElementById('matchingConfirmTitle');
    const infoEl = document.getElementById('matchingConfirmInfo');
    
    titleEl.textContent = '确认执行分组匹配';
    infoEl.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>配置信息：</strong>
        </div>
        <div style="margin-bottom: 10px;">
            📊 每组男性人数：<strong>${maleSize}</strong> 人
        </div>
        <div style="margin-bottom: 20px;">
            👭 每组女性人数：<strong>${femaleSize}</strong> 人
        </div>
        <div style="color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
            <strong>⚠️ 注意：</strong>执行后将生成新的分组结果，请确认配置无误后再执行。
        </div>
    `;
    
    // 存储配置供执行时使用
    confirmModal.dataset.type = 'grouping';
    confirmModal.dataset.config = JSON.stringify({
        group_size_male: maleSize,
        group_size_female: femaleSize
    });
    
    confirmModal.style.display = 'block';
}

// 聊天匹配执行确认
function executeChatMatchingConfirm() {
    const listSize = parseInt(document.getElementById('chatListSize').value);
    
    // 关闭配置模态框
    closeChatMatchingModal();
    
    // 显示确认模态框
    const confirmModal = document.getElementById('matchingConfirmModal');
    const titleEl = document.getElementById('matchingConfirmTitle');
    const infoEl = document.getElementById('matchingConfirmInfo');
    
    titleEl.textContent = '确认执行聊天匹配';
    infoEl.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>配置信息：</strong>
        </div>
        <div style="margin-bottom: 20px;">
            💬 推荐名单人数：<strong>${listSize}</strong> 人
        </div>
        <div style="color: #856404; background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
            <strong>⚠️ 注意：</strong>执行后将生成新的聊天匹配结果，请确认配置无误后再执行。
        </div>
    `;
    
    // 存储配置供执行时使用
    confirmModal.dataset.type = 'chat';
    confirmModal.dataset.config = JSON.stringify({
        list_size: listSize
    });
    
    confirmModal.style.display = 'block';
}

// 关闭匹配确认模态框
function closeMatchingConfirmModal() {
    const modal = document.getElementById('matchingConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 执行匹配算法
async function executeMatching() {
    const confirmModal = document.getElementById('matchingConfirmModal');
    const type = confirmModal.dataset.type;
    const config = JSON.parse(confirmModal.dataset.config);
    
    // 关闭确认模态框
    closeMatchingConfirmModal();
    
    // 显示加载提示
    showLoadingOverlay('正在执行匹配算法，请稍候...');
    
    try {
        const endpoint = type === 'grouping' ? '/api/admin/execute-group-matching' : '/api/admin/execute-chat-matching';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        hideLoadingOverlay();
        
        if (data.success) {
            const typeName = type === 'grouping' ? '分组匹配' : '聊天匹配';
            showToast(`${data.message}`, 'success');
        } else {
            throw new Error(data.message || '执行失败');
        }
        
    } catch (error) {
        console.error('执行匹配算法失败:', error);
        hideLoadingOverlay();
        showToast(error.message || '执行匹配算法失败，请稍后重试', 'error');
    }
}

// 打开结果查看模态框
async function openResultsModal(type) {
    const modal = document.getElementById('matchingResultsModal');
    const titleEl = document.getElementById('resultsTitle');
    const batchSelect = document.getElementById('resultsBatchSelect');
    const displayDiv = document.getElementById('resultsDisplay');
    
    // 设置标题
    const typeName = type === 'grouping' ? '分组匹配' : '聊天匹配';
    titleEl.textContent = `${typeName}结果`;
    
    // 存储类型
    modal.dataset.type = type;
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 清空显示区域
    displayDiv.querySelector('.results-content-area').innerHTML = '';
    
    // 加载历史轮次
    await loadResultsBatches(type);
}

// 关闭结果查看模态框
function closeResultsModal() {
    const modal = document.getElementById('matchingResultsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 加载历史轮次
async function loadResultsBatches(type) {
    const batchSelect = document.getElementById('resultsBatchSelect');
    const loadingDiv = document.getElementById('resultsDisplay').querySelector('.results-loading');
    
    try {
        loadingDiv.style.display = 'block';
        
        const endpoint = type === 'grouping' ? '/api/admin/grouping-history' : '/api/admin/chat-history';
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取历史记录失败');
        }
        
        const data = await response.json();
        
        loadingDiv.style.display = 'none';
        
        // 清空选项
        batchSelect.innerHTML = '<option value="">请选择轮次</option>';
        
        if (data.success && data.data.length > 0) {
            data.data.forEach(batch => {
                const option = document.createElement('option');
                option.value = batch.run_batch;
                // 分组匹配显示组数，聊天匹配不显示统计数据
                const countText = type === 'grouping' ? ` (${batch.groups_count}组)` : '';
                const date = new Date(batch.created_at).toLocaleString();
                option.textContent = `第 ${batch.run_batch} 轮${countText} - ${date}`;
                batchSelect.appendChild(option);
            });
            
            // 默认选中最新轮次
            if (data.data.length > 0) {
                batchSelect.value = data.data[0].run_batch;
                await loadSelectedBatchResult();
            }
        } else {
            batchSelect.innerHTML = '<option value="">暂无历史记录</option>';
            document.getElementById('resultsDisplay').querySelector('.results-content-area').innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #666;">暂无匹配结果</div>';
        }
        
    } catch (error) {
        console.error('加载历史轮次失败:', error);
        loadingDiv.style.display = 'none';
        showToast('加载历史轮次失败，请稍后重试', 'error');
    }
}

// 加载选中轮次的结果
async function loadSelectedBatchResult() {
    const modal = document.getElementById('matchingResultsModal');
    const type = modal.dataset.type;
    const batchSelect = document.getElementById('resultsBatchSelect');
    const runBatch = batchSelect.value;
    const contentArea = document.getElementById('resultsDisplay').querySelector('.results-content-area');
    const loadingDiv = document.getElementById('resultsDisplay').querySelector('.results-loading');
    
    if (!runBatch) {
        contentArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">请选择轮次</div>';
        return;
    }
    
    try {
        loadingDiv.style.display = 'block';
        contentArea.innerHTML = '';
        
        const endpoint = type === 'grouping' ? 
            `/api/admin/grouping-result/${runBatch}` : 
            `/api/admin/chat-result/${runBatch}`;
            
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('获取结果失败');
        }
        
        const data = await response.json();
        
        loadingDiv.style.display = 'none';
        
        if (data.success) {
            if (type === 'grouping') {
                renderGroupingResults(data.data);
            } else {
                renderChatResults(data.data);
            }
        } else {
            throw new Error(data.message || '获取结果失败');
        }
        
    } catch (error) {
        console.error('加载结果失败:', error);
        loadingDiv.style.display = 'none';
        contentArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc3545;">加载失败，请稍后重试</div>';
    }
}

// 渲染分组匹配结果
function renderGroupingResults(resultData) {
    const contentArea = document.getElementById('resultsDisplay').querySelector('.results-content-area');
    const { runBatch, groups } = resultData;
    
    if (!groups || groups.length === 0) {
        contentArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">该轮次暂无分组结果</div>';
        return;
    }
    
    let html = `<div style="margin-bottom: 20px; text-align: center;">
        <h4>第 ${runBatch} 轮分组匹配结果（共 ${groups.length} 组）</h4>
    </div>`;
    
    groups.forEach(group => {
        html += `
            <div class="group-result-item">
                <div class="group-result-header">
                    第 ${group.group_id} 组（男 ${group.male_members.length} 人，女 ${group.female_members.length} 人）
                </div>
                <div class="group-result-body">
                    <div class="group-members-grid">
        `;
        
        // 显示男性成员
        group.male_members.forEach(member => {
            html += `
                <div class="member-card male">
                    <div class="member-name">${member.name}（${member.username}）</div>
                    <div class="member-details">男</div>
                </div>
            `;
        });
        
        // 显示女性成员
        group.female_members.forEach(member => {
            html += `
                <div class="member-card female">
                    <div class="member-name">${member.name}（${member.username}）</div>
                    <div class="member-details">女</div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    contentArea.innerHTML = html;
}

// 渲染聊天匹配结果
function renderChatResults(resultData) {
    const contentArea = document.getElementById('resultsDisplay').querySelector('.results-content-area');
    const { runBatch, chatLists } = resultData;
    
    if (!chatLists || chatLists.length === 0) {
        contentArea.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">该轮次暂无聊天匹配结果</div>';
        return;
    }
    
    // 按用户分组
    const userGroups = {};
    chatLists.forEach(item => {
        if (!userGroups[item.user_id]) {
            userGroups[item.user_id] = [];
        }
        userGroups[item.user_id].push(item);
    });
    
    let html = `<div style="margin-bottom: 20px; text-align: center;">
        <h4>第 ${runBatch} 轮聊天匹配结果</h4>
    </div>`;
    
    Object.keys(userGroups).forEach(userId => {
        const userTargets = userGroups[userId];
        const userName = userTargets[0].user_name;
        html += `
            <div class="group-result-item">
                <div class="group-result-header">
                    ${userName}（${userId}）的推荐名单（${userTargets.length} 人）
                </div>
                <div class="group-result-body">
                    <div class="chat-result-grid">
        `;
        
        userTargets.forEach(target => {
            const statusClass = target.is_completed ? 'completed' : 'pending';
            const statusText = target.is_completed ? '已聊' : '未聊';
            
            html += `
                <div class="chat-target-card">
                    <div class="member-name">${target.target_name}（${target.target_id}）</div>
                    <div class="chat-status ${statusClass}">${statusText}</div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    contentArea.innerHTML = html;
}

// 加载覆盖层函数
function showLoadingOverlay(message) {
    // 移除已存在的覆盖层
    hideLoadingOverlay();
    
    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-size: 18px;
        font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px;"></div>
            <div>${message}</div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}