/**
 * Sidebar Toggle — Desktop & Mobile
 * يعمل على جميع صفحات الأدمن بدون إعادة كتابة أي شيء
 */
(function () {
  var STORAGE_KEY = 'sidebar_collapsed';

  function init() {
    var btn     = document.getElementById('sidebarToggleBtn');
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (!btn || !sidebar) return;

    var isMobile = function () { return window.innerWidth <= 768; };

    // ===== استعادة الحالة المحفوظة (للديسكتوب فقط) =====
    if (!isMobile() && localStorage.getItem(STORAGE_KEY) === '1') {
      document.body.classList.add('sidebar-collapsed');
    }

    // ===== تحديث أيقونة الزر =====
    function updateIcon() {
      var collapsed = document.body.classList.contains('sidebar-collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.innerHTML = collapsed ? '☰' : '✕';
    }

    // ===== فتح الشريط (موبايل) =====
    function openMobile() {
      sidebar.classList.add('open');
      if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
      btn.innerHTML = '✕';
      btn.setAttribute('aria-expanded', 'true');
    }

    // ===== إغلاق الشريط (موبايل) =====
    function closeMobile() {
      sidebar.classList.remove('open');
      if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
      btn.innerHTML = '☰';
      btn.setAttribute('aria-expanded', 'false');
    }

    // ===== Toggle الديسكتوب =====
    function toggleDesktop() {
      var collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
      updateIcon();
    }

    // ===== الضغط على الزر =====
    btn.addEventListener('click', function () {
      if (isMobile()) {
        if (sidebar.classList.contains('open')) {
          closeMobile();
        } else {
          openMobile();
        }
      } else {
        toggleDesktop();
      }
    });

    // ===== Overlay (موبايل) =====
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (isMobile()) closeMobile();
      });
    }

    // ===== إغلاق عند النقر على رابط (موبايل) =====
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (isMobile()) closeMobile();
      });
    });

    // ===== عند تغيير حجم النافذة =====
    window.addEventListener('resize', function () {
      if (!isMobile()) {
        sidebar.classList.remove('open');
        if (overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
        updateIcon();
      }
    });

    updateIcon();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
