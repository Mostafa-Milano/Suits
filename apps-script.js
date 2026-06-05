// ================================================
//  Google Apps Script — Milano Suits
//  انسخ هذا الكود في Google Apps Script
//  وانشره كـ Web App بصلاحيات "Anyone"
// ================================================

const SPREADSHEET_ID = SpreadsheetApp.getActive().getId();

const SUITS_COLS    = ['suit_id','suit_type','suit_parts','color','size','status','added_by','added_date','image_url'];
const USERS_COLS    = ['username','password','role','name'];
const RENTALS_COLS  = [
  'rental_id','suit_id','suit_type','suit_parts','color','size',
  'tenant_name','tenant_phone','tenant_address','national_id',
  'checkout_date','expected_return','actual_return',
  'rental_price','payment_method','deposit_amount','deposit_returned',
  'rented_by','returned_by','status','notes'
];

// ============================
//  CORS helper
// ============================
function corsOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================
//  GET — يدعم الاستدعاء عبر ?action=xxx&data={}
// ============================
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    const data   = e.parameter.data ? JSON.parse(e.parameter.data) : {};
    const result = handleAction(action, data);
    return corsOutput(result);
  } catch (err) {
    return corsOutput({ success: false, message: err.message });
  }
}

// ============================
//  POST — يدعم body JSON
// ============================
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const result = handleAction(body.action || '', body.data || {});
    return corsOutput(result);
  } catch (err) {
    return corsOutput({ success: false, message: 'خطأ في الخادم: ' + err.message });
  }
}

// ============================
//  Router مشترك
// ============================
function handleAction(action, data) {
  switch (action) {
    // ── البدل ──
    case 'getSuits':         return getSuits();
    case 'addSuit':          return addSuit(data);
    case 'updateSuit':       return updateSuit(data);
    case 'deleteSuit':       return deleteSuit(data.suit_id);
    case 'updateSuitStatus': return updateSuitStatus(data.suit_id, data.status);
    // ── التأجير ──
    case 'getRentals':       return getRentals();
    case 'addRental':        return addRental(data);
    case 'returnRental':     return returnRental(data);
    // ── المستخدمون ──
    case 'getUsers':         return getUsers();
    case 'addUser':          return addUser(data);
    case 'updateUser':       return updateUser(data);
    case 'deleteUser':       return deleteUser(data.username);
    // ── اختبار ──
    case 'ping':             return { success: true, message: 'pong' };
    default:
      return { success: false, message: 'إجراء غير معروف: ' + action };
  }
}

// ============================
//  Sheet helpers
// ============================
function getSuitsSheet()   { return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('suits'); }
function getRentalsSheet() { return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('rentals'); }
function getUsersSheet()   { return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('users'); }

function findRow(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1;
  }
  return -1;
}

// ============================
//  البدل — Suits
// ============================
function getSuits() {
  const data = getSuitsSheet().getDataRange().getValues();
  const suits = data.slice(1).filter(r => r[0]).map(r => ({
    suit_id:    r[0] || '', suit_type:  r[1] || '', suit_parts: r[2] || '',
    color:      r[3] || '', size:       r[4] || '', status:     r[5] || '',
    added_by:   r[6] || '', added_date: r[7] || '', image_url:  r[8] || ''
  }));
  return { success: true, suits };
}

function addSuit(data) {
  getSuitsSheet().appendRow(SUITS_COLS.map(c => data[c] || ''));
  return { success: true, message: 'تمت إضافة البدلة بنجاح' };
}

function updateSuit(data) {
  const row = findRow(getSuitsSheet(), 0, data.suit_id);
  if (row === -1) return { success: false, message: 'البدلة غير موجودة' };
  const s = getSuitsSheet();
  s.getRange(row, 1).setValue(data.suit_id);
  s.getRange(row, 2).setValue(data.suit_type  || '');
  s.getRange(row, 3).setValue(data.suit_parts || '');
  s.getRange(row, 4).setValue(data.color      || '');
  s.getRange(row, 5).setValue(data.size       || '');
  if (typeof data.image_url !== 'undefined') s.getRange(row, 9).setValue(data.image_url || '');
  return { success: true, message: 'تم تعديل البدلة بنجاح' };
}

function deleteSuit(suit_id) {
  const sheet = getSuitsSheet();
  const row = findRow(sheet, 0, suit_id);
  if (row === -1) return { success: false, message: 'البدلة غير موجودة' };
  if (sheet.getRange(row, 6).getValue() === 'مؤجَّرة')
    return { success: false, message: 'لا يمكن حذف بدلة مؤجَّرة' };
  sheet.deleteRow(row);
  return { success: true, message: 'تم حذف البدلة بنجاح' };
}

function updateSuitStatus(suit_id, status) {
  const row = findRow(getSuitsSheet(), 0, suit_id);
  if (row === -1) return { success: false, message: 'البدلة غير موجودة' };
  getSuitsSheet().getRange(row, 6).setValue(status);
  return { success: true, message: 'تم تحديث حالة البدلة' };
}

// ============================
//  التأجير — Rentals
// ============================
function getRentals() {
  const data = getRentalsSheet().getDataRange().getValues();
  const rentals = data.slice(1).filter(r => r[0]).map(r => ({
    rental_id: r[0]||'', suit_id: r[1]||'', suit_type: r[2]||'', suit_parts: r[3]||'',
    color: r[4]||'', size: r[5]||'', tenant_name: r[6]||'', tenant_phone: r[7]||'',
    tenant_address: r[8]||'', national_id: r[9]||'', checkout_date: r[10]||'',
    expected_return: r[11]||'', actual_return: r[12]||'', rental_price: r[13]||'',
    payment_method: r[14]||'', deposit_amount: r[15]||'', deposit_returned: r[16]||'',
    rented_by: r[17]||'', returned_by: r[18]||'', status: r[19]||'', notes: r[20]||''
  }));
  return { success: true, rentals };
}

function addRental(data) {
  getRentalsSheet().appendRow(RENTALS_COLS.map(c => data[c] || ''));
  const suitResult = updateSuitStatus(data.suit_id, 'مؤجَّرة');
  if (!suitResult.success)
    return { success: false, message: 'تم حفظ التأجير لكن فشل تحديث حالة البدلة' };
  return { success: true, message: 'تم تسجيل التأجير بنجاح' };
}

function returnRental(data) {
  const sheet = getRentalsSheet();
  const row = findRow(sheet, 0, data.rental_id);
  if (row === -1) return { success: false, message: 'العملية غير موجودة' };
  sheet.getRange(row, 13).setValue(data.actual_return    || '');
  sheet.getRange(row, 17).setValue(data.deposit_returned || 'لا');
  sheet.getRange(row, 19).setValue(data.returned_by      || '');
  sheet.getRange(row, 20).setValue('مُعادة');
  if (data.notes) {
    const existing = sheet.getRange(row, 21).getValue();
    sheet.getRange(row, 21).setValue(existing ? existing + ' | ' + data.notes : data.notes);
  }
  const suit_id = sheet.getRange(row, 2).getValue();
  updateSuitStatus(suit_id, 'متاحة');
  return { success: true, message: 'تم تسجيل العودة بنجاح' };
}

// ============================
//  المستخدمون — Users
// ============================
function getUsers() {
  const data = getUsersSheet().getDataRange().getValues();
  const users = data.slice(1).filter(r => r[0]).map(r => ({
    username: r[0]||'', password: r[1]||'', role: r[2]||'', name: r[3]||''
  }));
  return { success: true, users };
}

function addUser(data) {
  if (findRow(getUsersSheet(), 0, data.username) !== -1)
    return { success: false, message: 'اسم المستخدم موجود بالفعل' };
  getUsersSheet().appendRow(USERS_COLS.map(c => data[c] || ''));
  return { success: true, message: 'تمت إضافة المستخدم بنجاح' };
}

function updateUser(data) {
  const username = data._originalUsername || data.username;
  const row = findRow(getUsersSheet(), 0, username);
  if (row === -1) return { success: false, message: 'المستخدم غير موجود' };
  const s = getUsersSheet();
  s.getRange(row, 1).setValue(data.username || '');
  s.getRange(row, 2).setValue(data.password || '');
  s.getRange(row, 3).setValue(data.role     || '');
  s.getRange(row, 4).setValue(data.name     || '');
  return { success: true, message: 'تم تعديل المستخدم بنجاح' };
}

function deleteUser(username) {
  const row = findRow(getUsersSheet(), 0, username);
  if (row === -1) return { success: false, message: 'المستخدم غير موجود' };
  getUsersSheet().deleteRow(row);
  return { success: true, message: 'تم حذف المستخدم بنجاح' };
}

// ============================
//  setupSheets — تشغيل مرة واحدة
// ============================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // users
  let usersSheet = ss.getSheetByName('users') || ss.insertSheet('users');
  usersSheet.clearContents();
  usersSheet.getRange(1,1,1,USERS_COLS.length).setValues([USERS_COLS]);
  usersSheet.getRange(1,1,1,USERS_COLS.length).setBackground('#1a1a2e').setFontColor('#c9a84c').setFontWeight('bold');
  usersSheet.appendRow(['admin','admin123','admin','صاحب المحل']);

  // suits
  let suitsSheet = ss.getSheetByName('suits') || ss.insertSheet('suits');
  suitsSheet.clearContents();
  suitsSheet.getRange(1,1,1,SUITS_COLS.length).setValues([SUITS_COLS]);
  suitsSheet.getRange(1,1,1,SUITS_COLS.length).setBackground('#1a1a2e').setFontColor('#c9a84c').setFontWeight('bold');

  // rentals
  let rentalsSheet = ss.getSheetByName('rentals') || ss.insertSheet('rentals');
  rentalsSheet.clearContents();
  rentalsSheet.getRange(1,1,1,RENTALS_COLS.length).setValues([RENTALS_COLS]);
  rentalsSheet.getRange(1,1,1,RENTALS_COLS.length).setBackground('#1a1a2e').setFontColor('#c9a84c').setFontWeight('bold');

  const today = new Date().toISOString().split('T')[0];
  [
    ['S-001','سهرة','كاملة','أسود','50','متاحة','admin',today,''],
    ['S-002','عريس','كاملة','كحلي','52','متاحة','admin',today,''],
    ['S-003','كلاسيك','كاملة','رمادي','48','متاحة','admin',today,''],
  ].forEach(r => suitsSheet.appendRow(r));

  SpreadsheetApp.getUi().alert('✅ تم إعداد الشيت بنجاح!');
}
