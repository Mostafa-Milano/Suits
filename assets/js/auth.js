// ================================================
//  auth.js — نظام المصادقة (Google Sheets فقط)
// ================================================

const Auth = {

  async login(username, password, rememberMe = false) {
    try {
      const users = await Auth._loadUsers();
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return { success: false, message: 'اسم المستخدم أو كلمة السر غير صحيحة' };

      const session = { username: user.username, name: user.name, role: user.role };

      if (rememberMe) {
        localStorage.setItem('milano_user', JSON.stringify(session));
        sessionStorage.removeItem('milano_user');
      } else {
        sessionStorage.setItem('milano_user', JSON.stringify(session));
        localStorage.removeItem('milano_user');
      }
      return { success: true, user: session };
    } catch (err) {
      console.error('Auth error:', err);
      return { success: false, message: 'خطأ في الاتصال بـ Google Sheets، تحقق من الإعدادات' };
    }
  },

  async _loadUsers() {
    if (!SHEETS_CONFIG.APPS_SCRIPT_URL || SHEETS_CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL غير مضبوط في sheets.js');
    }
    const params = new URLSearchParams({ action: 'getUsers', data: '{}' });
    const url = SHEETS_CONFIG.APPS_SCRIPT_URL + '?' + params.toString();
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('فشل الاتصال بالخادم: ' + res.status);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'خطأ في جلب المستخدمين');
    return data.users || [];
  },

  logout() {
    sessionStorage.removeItem('milano_user');
    localStorage.removeItem('milano_user');
    window.location.href = Auth._getBasePath() + 'index.html';
  },

  getCurrentUser() {
    const data = sessionStorage.getItem('milano_user') || localStorage.getItem('milano_user');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  },

  isLoggedIn() { return !!Auth.getCurrentUser(); },
  isAdmin()    { const u = Auth.getCurrentUser(); return u && u.role === 'admin'; },
  isEmployee() { const u = Auth.getCurrentUser(); return u && u.role === 'employee'; },

  requireAdmin() {
    const user = Auth.getCurrentUser();
    if (!user) { window.location.href = Auth._getBasePath() + 'index.html'; return false; }
    if (user.role !== 'admin') { window.location.href = Auth._getBasePath() + 'employee/home.html'; return false; }
    return true;
  },

  requireEmployee() {
    const user = Auth.getCurrentUser();
    if (!user) { window.location.href = Auth._getBasePath() + 'index.html'; return false; }
    return true;
  },

  _getBasePath() {
    const path = window.location.pathname;
    return (path.includes('/admin/') || path.includes('/employee/')) ? '../' : './';
  },

  fillUserInfo() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
    document.querySelectorAll('[data-user-role]').forEach(el => el.textContent = user.role === 'admin' ? 'مدير النظام' : 'موظف');
    document.querySelectorAll('[data-user-avatar]').forEach(el => el.textContent = user.name.charAt(0));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });
});
