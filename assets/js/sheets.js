// ================================================
//  sheets.js — التواصل مع Google Sheets
// ================================================
//
//  🔧 إعدادات مطلوبة — عدّل هذه القيم:
//  1. SPREADSHEET_ID: معرف ملف Google Sheets
//  2. API_KEY: مفتاح Google Sheets API (للقراءة فقط)
//  3. APPS_SCRIPT_URL: رابط Google Apps Script (للكتابة)
//
// ================================================

const SHEETS_CONFIG = {
  SPREADSHEET_ID: '1TxcWaqID-94Cv3ZANSJ3vqXRVR8hfKKwN4z6MI_AU0E',
  API_KEY: '',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz2XOQRBzx4yfuRK_338sxstXu7xyRCdYAp_EpxWTddHuG20ycDSMGXYDDhCpuZ76lV4Q/exec',
  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',
  SHEETS: {
    SUITS: 'suits',
    RENTALS: 'rentals'
  }
};

// ================================================
//  دوال مساعدة
// ================================================

// تحويل صف البيانات إلى كائن بدلة
function rowToSuit(row) {
  return {
    suit_id: row[0] || '',
    suit_type: row[1] || '',
    suit_parts: row[2] || '',
    color: row[3] || '',
    size: row[4] || '',
    status: row[5] || '',
    added_by: row[6] || '',
    added_date: row[7] || '',
    image_url: row[8] || ''
  };
}

// تحويل صف البيانات إلى كائن تأجير
function rowToRental(row) {
  return {
    rental_id: row[0] || '',
    suit_id: row[1] || '',
    suit_type: row[2] || '',
    suit_parts: row[3] || '',
    color: row[4] || '',
    size: row[5] || '',
    tenant_name: row[6] || '',
    tenant_phone: row[7] || '',
    tenant_address: row[8] || '',
    national_id: row[9] || '',
    checkout_date: row[10] || '',
    expected_return: row[11] || '',
    actual_return: row[12] || '',
    rental_price: row[13] || '',
    payment_method: row[14] || '',
    deposit_amount: row[15] || '',
    deposit_returned: row[16] || '',
    rented_by: row[17] || '',
    returned_by: row[18] || '',
    status: row[19] || '',
    notes: row[20] || ''
  };
}

// قراءة شيت كامل
async function readSheet(sheetName) {
  const url = `${SHEETS_CONFIG.BASE_URL}/${SHEETS_CONFIG.SPREADSHEET_ID}/values/${sheetName}?key=${SHEETS_CONFIG.API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`فشل قراءة البيانات: ${response.status}`);
  }
  const data = await response.json();
  // تخطي الصف الأول (العناوين)
  const rows = data.values || [];
  return rows.slice(1).filter(row => row && row[0]);
}

// إرسال طلب لـ Apps Script عبر GET (يتجنب مشكلة CORS)
async function postToScript(action, data) {
  const params = new URLSearchParams({
    action: action,
    data: JSON.stringify(data || {})
  });
  const url = SHEETS_CONFIG.APPS_SCRIPT_URL + '?' + params.toString();
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) throw new Error('فشل الطلب: ' + response.status);
  return await response.json();
}

// إنشاء كود بدلة جديد
async function generateSuitId() {
  const suits = await getAllSuits();
  if (!suits.length) return 'S-001';
  const ids = suits.map(s => {
    const num = parseInt(s.suit_id.replace('S-', ''));
    return isNaN(num) ? 0 : num;
  });
  const max = Math.max(...ids);
  return `S-${String(max + 1).padStart(3, '0')}`;
}

// إنشاء كود تأجير جديد
async function generateRentalId() {
  const rentals = await getAllRentals();
  if (!rentals.length) return 'R-0001';
  const ids = rentals.map(r => {
    const num = parseInt(r.rental_id.replace('R-', ''));
    return isNaN(num) ? 0 : num;
  });
  const max = Math.max(...ids);
  return `R-${String(max + 1).padStart(4, '0')}`;
}

// تنسيق التاريخ YYYY-MM-DD
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toISOString().split('T')[0];
}

// الحصول على التاريخ والوقت بتوقيت مصر
function today() {
  const now = new Date();
  const egyptDateTime = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(now);
  return egyptDateTime;
}

// دالة مساعدة لاستخراج التاريخ فقط (YYYY-MM-DD) للمقارنات الحسابية
function todayISO() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Africa/Cairo' }).split(',')[0];
}

// حساب عدد أيام التأخير
function daysLate(expectedReturn) {
  const expected = new Date(expectedReturn);
  const now = new Date();
  now.setHours(0,0,0,0);
  expected.setHours(0,0,0,0);
  const diff = Math.floor((now - expected) / (1000 * 60 * 60 * 24));
  return diff;
}

// ================================================
//  دوال البدل — Suits
// ================================================

// 1. الحصول على كل البدل
async function getAllSuits() {
  const res = await postToScript('getSuits', {});
  return res.suits || [];
}

// 2. البدل المتاحة فقط
async function getAvailableSuits() {
  const suits = await getAllSuits();
  return suits.filter(s => s.status === 'متاحة');
}

// 3. البحث عن بدلة بالكود
async function getSuitById(suit_id) {
  const suits = await getAllSuits();
  return suits.find(s => s.suit_id === suit_id) || null;
}

// 4. إضافة بدلة جديدة
async function addSuit(suitData) {
  return await postToScript('addSuit', suitData);
}

// 5. تحديث حالة البدلة
async function updateSuitStatus(suit_id, newStatus) {
  return await postToScript('updateSuitStatus', { suit_id, status: newStatus });
}

// 6. تعديل بيانات بدلة كاملة
async function updateSuit(suit_id, updatedData) {
  return await postToScript('updateSuit', { suit_id, ...updatedData });
}

// 7. حذف بدلة
async function deleteSuit(suit_id) {
  const suit = await getSuitById(suit_id);
  if (!suit) throw new Error('البدلة غير موجودة');
  if (suit.status !== 'متاحة') throw new Error('لا يمكن حذف بدلة مؤجَّرة');
  return await postToScript('deleteSuit', { suit_id });
}

// ================================================
//  دوال التأجيرات — Rentals
// ================================================

// 8. الحصول على كل التأجيرات
async function getAllRentals() {
  const res = await postToScript('getRentals', {});
  return res.rentals || [];
}

// 9. تأجيرات موظف محدد
async function getRentalsByEmployee(username) {
  const rentals = await getAllRentals();
  return rentals.filter(r => r.rented_by === username);
}

// 10. إضافة تأجير جديد
async function addRental(rentalData) {
  return await postToScript('addRental', rentalData);
}

// 11. تسجيل عودة بدلة
async function returnRental(rental_id, returnData) {
  return await postToScript('returnRental', { rental_id, ...returnData });
}

// 12. البدل المتأخرة
async function getLateSuits() {
  const rentals = await getAllRentals();
  const todayStr = todayISO();
  return rentals
    .filter(r => {
      if (r.status !== 'مؤجَّرة') return false;
      if (!r.expected_return) return false;
      return r.expected_return < todayStr;
    })
    .sort((a, b) => a.expected_return.localeCompare(b.expected_return));
}

// ================================================
//  دوال إضافية للإحصاءات
// ================================================

async function getDashboardStats() {
  const [suits, rentals] = await Promise.all([getAllSuits(), getAllRentals()]);
  const todayStr = todayISO();
  const thisMonth = todayStr.substring(0, 7);

  return {
    available: suits.filter(s => s.status === 'متاحة').length,
    rented: suits.filter(s => s.status === 'مؤجَّرة').length,
    late: rentals.filter(r => r.status === 'مؤجَّرة' && r.expected_return < todayStr).length,
    thisMonth: rentals.filter(r => r.checkout_date && r.checkout_date.startsWith(thisMonth)).length,
    totalSuits: suits.length,
    totalRentals: rentals.length
  };
}

// فلترة تأجيرات بمعايير متعددة
function filterRentals(rentals, filters = {}) {
  return rentals.filter(r => {
    if (filters.status && filters.status !== 'الكل' && r.status !== filters.status) return false;
    if (filters.employee && filters.employee !== 'الكل' && r.rented_by !== filters.employee) return false;
    if (filters.from && r.checkout_date < filters.from) return false;
    if (filters.to && r.checkout_date > filters.to) return false;
    return true;
  });
}

// فلترة بدل بمعايير متعددة
function filterSuits(suits, filters = {}) {
  return suits.filter(s => {
    if (filters.suit_type && filters.suit_type !== 'الكل' && s.suit_type !== filters.suit_type) return false;
    if (filters.suit_parts && filters.suit_parts !== 'الكل' && s.suit_parts !== filters.suit_parts) return false;
    if (filters.color && filters.color !== 'الكل' && s.color !== filters.color) return false;
    if (filters.size && filters.size !== 'الكل' && s.size !== filters.size) return false;
    if (filters.status && filters.status !== 'الكل' && s.status !== filters.status) return false;
    return true;
  });
}

// ================================================
//  مساعدات UI
// ================================================

function showLoading(message = 'جاري التحميل...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner-lg"></div><p style="font-size:15px;font-weight:600;color:var(--gray-700)">${message}</p>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('p').textContent = message;
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showToast(message, type = 'success', duration = 3000) {
  const existing = document.querySelectorAll('.toast-msg');
  existing.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: '#d4edda',
    danger: '#f8d7da',
    warning: '#fff3cd',
    info: 'rgba(201,168,76,0.1)'
  };
  const textColors = {
    success: '#155724',
    danger: '#721c24',
    warning: '#856404',
    info: '#7a6020'
  };
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:${colors[type]}; color:${textColors[type]};
    border-radius:12px; padding:14px 24px; font-size:14.5px; font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.15); z-index:9999;
    display:flex; align-items:center; gap:10px; min-width:280px; max-width:480px;
    animation: toastIn 0.3s ease; font-family:'Cairo',sans-serif; direction:rtl;
  `;
  toast.innerHTML = `<span style="font-size:18px">${icons[type]}</span> ${message}`;
  document.body.appendChild(toast);

  const style = document.createElement('style');
  style.textContent = `@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }`;
  document.head.appendChild(style);

  setTimeout(() => toast.remove(), duration);
}

function confirmDialog(message, title = 'تأكيد') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <span class="modal-title">⚠️ ${title}</span>
        </div>
        <div class="modal-body">
          <p style="font-size:15px;color:var(--gray-700);line-height:1.6">${message}</p>
        </div>
        <div class="modal-footer">
          <button id="confirmNo" class="btn btn-outline">إلغاء</button>
          <button id="confirmYes" class="btn btn-danger">تأكيد</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmNo').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirmYes').onclick = () => { overlay.remove(); resolve(true); };
  });
}
