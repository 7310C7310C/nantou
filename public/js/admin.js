/**
 * 管理员页面JavaScript
 * 处理登录、登出和界面交互
 */

class AdminApp {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('userInfo') || 'null');
        
        this.init();
    }

    init() {
        // 绑定事件监听器
        this.bindEvents();
        
        // 检查登录状态
        this.checkAuthStatus();
    }

    bindEvents() {
        // 登录表单提交
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // 登出按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async checkAuthStatus() {
        if (this.token && this.user) {
            // 验证令牌是否有效
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    this.showLoggedInState();
                } else {
                    this.clearAuthData();
                    this.showLoginForm();
                }
            } catch (error) {
                console.error('验证令牌失败:', error);
                this.clearAuthData();
                this.showLoginForm();
            }
        } else {
            this.showLoginForm();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');

        // 清除之前的错误信息
        this.hideError();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // 保存认证信息
                this.token = data.data.token;
                this.user = data.data.user;
                
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('userInfo', JSON.stringify(this.user));

                // 显示登录成功状态
                this.showLoggedInState();
                
                // 显示成功消息
                this.showSuccess('登录成功！');
                
                // 清空表单
                document.getElementById('loginForm').reset();
            } else {
                this.showError(data.message || '登录失败');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            this.showError('网络错误，请稍后重试');
        }
    }

    async handleLogout() {
        try {
            // 调用登出API
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('登出请求失败:', error);
        } finally {
            // 清除本地存储的认证信息
            this.clearAuthData();
            
            // 显示登录表单
            this.showLoginForm();
            
            // 显示登出成功消息
            this.showSuccess('已成功登出');
        }
    }

    showLoggedInState() {
        // 隐藏登录表单
        const loginSection = document.getElementById('loginSection');
        if (loginSection) {
            loginSection.style.display = 'none';
        }

        // 显示用户信息
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.style.display = 'flex';
        }

        // 更新用户信息显示
        const displayUsername = document.getElementById('displayUsername');
        const displayRole = document.getElementById('displayRole');
        
        if (displayUsername && this.user) {
            displayUsername.textContent = this.user.username;
        }
        
        if (displayRole && this.user) {
            displayRole.textContent = this.getRoleDisplayName(this.user.role);
        }

        // 显示主要内容
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }

    showLoginForm() {
        // 显示登录表单
        const loginSection = document.getElementById('loginSection');
        if (loginSection) {
            loginSection.style.display = 'flex';
        }

        // 隐藏用户信息
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.style.display = 'none';
        }

        // 隐藏主要内容
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }

    clearAuthData() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
    }

    showError(message) {
        const errorElement = document.getElementById('loginError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    hideError() {
        const errorElement = document.getElementById('loginError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showSuccess(message) {
        // 创建临时成功消息
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.right = '20px';
        successDiv.style.zIndex = '1000';
        successDiv.style.display = 'block';

        document.body.appendChild(successDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '管理员',
            'staff': '员工',
            'matchmaker': '红娘'
        };
        return roleNames[role] || role;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
}); 