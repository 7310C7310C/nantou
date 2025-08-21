/**
 * 管理员页面JavaScript
 * 处理登录、登出和界面交互
 */

// 全局变量
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// DOM 元素
        const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('loginSection');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const mainContent = document.getElementById('mainContent');
const loginError = document.getElementById('loginError');

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
    loginSection.style.display = 'none';
    userInfo.style.display = 'none';
    mainContent.style.display = 'none';
    
    checkAuthStatus();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 登录表单
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    // 角色按钮下拉菜单
    const roleBtn = document.getElementById('roleBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    roleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdownMenu.classList.toggle('show');
        roleBtn.classList.toggle('active');
    });
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-dropdown')) {
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

    // 删除功能
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', handleDeleteParticipant);
    deleteConfirmInput.addEventListener('input', validateDeleteConfirm);

    // 重设密码功能
    cancelResetPasswordBtn.addEventListener('click', closeResetPasswordModal);
    confirmResetPasswordBtn.addEventListener('click', handleResetPassword);
    closeResetPasswordResultBtn.addEventListener('click', closeResetPasswordResultModal);

    // 照片上传
    photoUpload.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', handlePhotoSelect);
    setupDragAndDrop();

    // 确认弹窗
    cancelConfirmBtn.addEventListener('click', closeConfirmModal);
    confirmSubmitBtn.addEventListener('click', submitRegistration);

    // 结果弹窗
    closeResultBtn.addEventListener('click', closeResultModal);

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
    if (authToken) {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                    'Authorization': `Bearer ${authToken}`
                    }
                });

                            if (response.ok) {
                const user = await response.json();
                currentUser = user.data.user;
                showAuthenticatedUI();
            } else {
                localStorage.removeItem('authToken');
                authToken = null;
                showLoginUI();
            }
        } catch (error) {
            console.error('检查认证状态失败:', error);
            localStorage.removeItem('authToken');
            authToken = null;
            showLoginUI();
        }
    } else {
        showLoginUI();
    }
}

// 显示登录界面
function showLoginUI() {
    loginSection.style.display = 'flex';
    userInfo.style.display = 'none';
    mainContent.style.display = 'none';
}

// 显示已认证界面
function showAuthenticatedUI() {
    loginSection.style.display = 'none';
    userInfo.style.display = 'block';
    mainContent.style.display = 'block';
    
    // 更新角色按钮文本
    document.getElementById('roleBtn').textContent = getRoleDisplayName(currentUser.role);
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

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

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
            authToken = data.data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.data.user;
            showAuthenticatedUI();
            loginError.style.display = 'none';
        } else {
            showError(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showError('网络错误，请重试');
    }
}

// 处理登出
function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showLoginUI();
}

// 显示错误信息
function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
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
        const response = await fetch('/api/admin/participants', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            displayParticipants(data.data);
        } else {
            alert(data.message || '加载参与者列表失败');
        }
    } catch (error) {
        console.error('加载参与者列表失败:', error);
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
    
    if (selectedPhotos.length + imageFiles.length > 5) {
        alert('最多只能选择5张照片');
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
        const response = await fetch('/api/admin/participants', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
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
            alert(data.message || '创建账号失败');
        }
    } catch (error) {
        console.error('提交注册失败:', error);
        hideLoading();
        alert('网络错误，请重试');
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
        
        const response = await fetch(`/api/admin/participants/${participantId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
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
        
        const response = await fetch(`/api/admin/participants/${window.currentDeleteParticipantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
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
        const response = await fetch(`/api/admin/participants/${window.currentResetPasswordParticipantId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
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
        
        const response = await fetch(`/api/admin/logs?level=${level}&date=${date}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
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
}

// 显示日志
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
        
        // 如果没有关键词，显示所有日志
        if (!keyword) {
            loadLogs();
            return;
        }

        const response = await fetch(`/api/admin/logs/search?keyword=${encodeURIComponent(keyword)}&level=${level}&date=${date}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
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