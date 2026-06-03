// ================================================
//  alerts.js — نظام التنبيهات للبدل المتأخرة
// ================================================

const Alerts = {

  async checkLateAlerts() {
    try {
      const lateSuits = await getLateSuits();
      if (!lateSuits.length) return;

      // تجميع حسب مستوى التأخير
      let level1 = 0; // يوم واحد
      let level2 = 0; // 2-3 أيام
      let level3 = 0; // أكثر من 3 أيام

      lateSuits.forEach(r => {
        const days = daysLate(r.expected_return);
        if (days === 1) level1++;
        else if (days <= 3) level2++;
        else level3++;
      });

      const container = document.getElementById('alertsContainer');
      if (!container) return;

      container.innerHTML = '';

      if (level3 > 0) {
        container.appendChild(Alerts._createBanner(
          'alert-red',
          '🔴',
          `عاجل: ${level3} بدلة متأخرة جداً — يرجى المتابعة الفورية`
        ));
      }

      if (level2 > 0) {
        container.appendChild(Alerts._createBanner(
          'alert-orange',
          '🟠',
          `تحذير: ${level2} بدلة تأخرت في العودة`
        ));
      }

      if (level1 > 0) {
        container.appendChild(Alerts._createBanner(
          'alert-yellow',
          '🟡',
          `تنبيه: ${level1} بدلة موعد عودتها اليوم`
        ));
      }

    } catch (err) {
      console.warn('تعذّر تحميل تنبيهات التأخير:', err);
    }
  },

  _createBanner(className, icon, message) {
    const div = document.createElement('div');
    div.className = `alert-banner ${className}`;
    div.innerHTML = `
      <span style="font-size:18px">${icon}</span>
      <span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;opacity:0.6;line-height:1">×</button>
    `;
    return div;
  }
};

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تأخير قصير لضمان تحميل sheets.js أولاً
  setTimeout(() => {
    if (typeof getLateSuits === 'function') {
      Alerts.checkLateAlerts();
    }
  }, 500);
});
