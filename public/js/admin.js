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
    
    // 更新角色按钮文本
    document.getElementById('roleBtn').textContent = getRoleDisplayName(currentUser ? currentUser.role : localStorage.getItem('userRole'));

    // 如果currentUser不存在，则从服务器获取
    if (!currentUser) {
        checkAuthStatus();
    }
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
        showLoading('正在加载...', '请稍候，正在获取参与者列表');
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
    } finally {
        hideLoading();
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

    // 检查文件大小限制 (5MB)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
        const fileDetails = oversizedFiles.map(file => 
            `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`
        );
        
        showErrorModal(
            '文件大小超限',
            '以下文件超过5MB限制，请压缩后重新上传：',
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
                        errorDetails = '请将图片压缩至5MB以下后重新上传';
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
        showLoading();
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
    } finally {
        hideLoading();
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