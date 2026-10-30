// CRH-FS (Finance Schedule) - ฝ่ายการเงิน รพ.เชียงรายประชานุเคราะห์
// Premium Mobile PWA Implementation

(function() {
  'use strict';

  // Modal History Stack for Android Back Button Handling
  const modalHistoryStack = [];

  // Application State
  const state = {
    // Current user can be a nickname or real name (defaults to 'เอ็ม')
    currentUser: localStorage.getItem('crh_active_user') || 'เอ็ม',
    // Starting date: Defaults to Day 1 (1 พ.ย. 2569) as requested
    selectedDate: getInitialDate(),
    scheduleList: [],
    customNotes: JSON.parse(localStorage.getItem('crh_custom_day_notes') || '{}'),
    activeEditingDate: null,
    activeNoteType: 'leave', // 'leave' | 'swap' | 'general'
    
    // User Switcher Modal State
    activeUserModalTab: 'switch', // 'switch' | 'mapping' | 'admin'
    staffFilterMode: 'nickname', // 'nickname' | 'realname'

    // Admin & Cloud State
    isAdmin: sessionStorage.getItem('crh_is_admin') === 'true',

    // Photo Gallery Pan & Pinch-to-Zoom
    imageZoom: 1,
    imagePan: { x: 0, y: 0 },
    isDraggingImage: false,
    dragStart: { x: 0, y: 0 },
    initialPinchDistance: 0,
    initialPinchZoom: 1,
    lastTapTime: 0,

    // Excel Table State
    excelMode: 'summary', // 'summary' | 'detailed'
    excelSearchKeyword: '',
    excelHideEmptyRows: true
  };

  // ==========================================
  // CLOUD DATABASE & LIVE ANALYTICS (SUPABASE)
  // ==========================================
  const DEFAULT_SUPABASE_URL = 'https://piimqiybzynnhtvlryxe.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'sb_publishable_XS-i3KEVRFkux0XSEKxZKQ_1XASRwy5';

  const CloudDB = {
    getConfig() {
      try {
        const saved = localStorage.getItem('crh_supabase_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.url && parsed.key) return parsed;
        }
      } catch (e) {}
      return {
        url: (window.CRH_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim(),
        key: (window.CRH_SUPABASE_KEY || DEFAULT_SUPABASE_KEY).trim()
      };
    },

    setConfig(url, key) {
      localStorage.setItem('crh_supabase_config', JSON.stringify({ url: url.trim(), key: key.trim() }));
    },

    isConfigured() {
      const cfg = this.getConfig();
      return !!(cfg.url && cfg.key && cfg.url.startsWith('http'));
    },

    getDeviceId() {
      let id = localStorage.getItem('crh_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('crh_device_id', id);
      }
      return id;
    },

    async logVisit(activeUser) {
      const deviceId = this.getDeviceId();
      const timestamp = new Date().toISOString();

      // 1. Record locally for instant offline stats
      try {
        let localLogs = JSON.parse(localStorage.getItem('crh_local_analytics') || '[]');
        localLogs.unshift({
          device_id: deviceId,
          active_user: activeUser || 'เอ็ม',
          created_at: timestamp
        });
        if (localLogs.length > 200) localLogs = localLogs.slice(0, 200);
        localStorage.setItem('crh_local_analytics', JSON.stringify(localLogs));
      } catch (e) {}

      // 2. If Supabase configured, post to cloud
      if (this.isConfigured()) {
        try {
          const cfg = this.getConfig();
          await fetch(`${cfg.url}/rest/v1/crh_analytics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': cfg.key,
              'Authorization': `Bearer ${cfg.key}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              device_id: deviceId,
              active_user: activeUser || 'ไม่ระบุ'
            })
          });
        } catch (err) {
          console.warn('Analytics cloud sync error:', err);
        }
      }
    },

    async fetchNameMappings() {
      if (!this.isConfigured()) return null;
      try {
        const cfg = this.getConfig();
        const res = await fetch(`${cfg.url}/rest/v1/crh_name_mappings?select=nickname,real_name`, {
          headers: {
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const map = { "เอ็ม": "จุรีพร ผาบสุวรรณ์" };
            data.forEach(item => {
              if (item.nickname && item.real_name) {
                map[item.nickname] = item.real_name;
              }
            });
            localStorage.setItem('crh_staff_name_map', JSON.stringify(map));
            return map;
          }
        }
      } catch (err) {
        console.warn('Fetch mappings error:', err);
      }
      return null;
    },

    async saveNameMappings(map) {
      localStorage.setItem('crh_staff_name_map', JSON.stringify(map));
      if (!this.isConfigured()) {
        return { success: true, cloud: false };
      }

      try {
        const cfg = this.getConfig();
        const rows = [];
        for (const [nickname, real_name] of Object.entries(map)) {
          if (nickname && real_name) {
            rows.push({
              nickname,
              real_name,
              updated_at: new Date().toISOString()
            });
          }
        }

        const res = await fetch(`${cfg.url}/rest/v1/crh_name_mappings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.key,
            'Authorization': `Bearer ${cfg.key}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(rows)
        });

        return { success: res.ok, cloud: true };
      } catch (err) {
        console.error('Save mappings error:', err);
        return { success: false, cloud: false, error: err };
      }
    },

    async getAnalyticsSummary() {
      if (this.isConfigured()) {
        try {
          const cfg = this.getConfig();
          const res = await fetch(`${cfg.url}/rest/v1/crh_analytics?select=device_id,active_user,created_at&order=created_at.desc&limit=150`, {
            headers: {
              'apikey': cfg.key,
              'Authorization': `Bearer ${cfg.key}`
            }
          });
          if (res.ok) {
            const rows = await res.json();
            const totalViews = rows.length;
            const uniqueDevices = new Set(rows.map(r => r.device_id)).size;
            return {
              cloud: true,
              totalViews: totalViews >= 150 ? '150+' : totalViews,
              uniqueUsers: uniqueDevices,
              recentLogs: rows.slice(0, 20)
            };
          }
        } catch (e) {
          console.warn('Get cloud analytics error, falling back to local:', e);
        }
      }

      // Fallback to local logs
      const local = JSON.parse(localStorage.getItem('crh_local_analytics') || '[]');
      const unique = new Set(local.map(r => r.device_id)).size;
      return {
        cloud: false,
        totalViews: local.length,
        uniqueUsers: unique,
        recentLogs: local.slice(0, 20)
      };
    }
  };

  // DOM Elements Cache
  const el = {};

  // Calculate Initial Starting Date
  function getInitialDate() {
    const now = new Date();
    // Month is 0-indexed (10 = November)
    // If real date is November 2026 / 2569, use current day; otherwise default to Day 1!
    if (now.getMonth() === 10 && (now.getFullYear() === 2026 || now.getFullYear() === 2569)) {
      return Math.min(Math.max(1, now.getDate()), 30);
    }
    return 1; // Always start at Day 1 (1 พฤศจิกายน)
  }

  async function init() {
    cacheElements();
    initTheme();

    // 1. Try fetching latest cloud name mappings if connected
    const cloudMap = await CloudDB.fetchNameMappings();
    if (cloudMap) {
      console.log('CRH-FS: Synced name mappings from Supabase cloud');
    }

    // 2. Check if this device has an onboarded user
    const savedUser = localStorage.getItem('crh_active_user') || localStorage.getItem('crh_default_user_profile');
    const isFirstTime = !savedUser;

    if (isFirstTime) {
      state.currentUser = 'เอ็ม'; // Temporary placeholder for initial DOM rendering
    } else {
      state.currentUser = savedUser;
    }

    // 3. Log visit analytics
    CloudDB.logVisit(state.currentUser);

    loadScheduleData();
    bindEvents();
    setupAndroidBackNavigation();
    setupPinchToZoom();
    renderAll();
    setupSheetUploader();

    // 4. If first-time user, launch onboarding modal
    if (isFirstTime) {
      showOnboardingModal();
    }
  }

  function cacheElements() {
    // Header & Theme
    el.headerFullName = document.getElementById('headerFullName');
    el.headerNickname = document.getElementById('headerNickname');
    el.openUserModalBtn = document.getElementById('openUserModalBtn');
    el.themeToggleBtn = document.getElementById('themeToggleBtn');
    el.themeToggleIcon = document.getElementById('themeToggleIcon');

    // Hero Today Card
    el.todayCard = document.getElementById('todayCard');
    el.todayDateHeading = document.getElementById('todayDateHeading');
    el.todayDayOfWeekBadge = document.getElementById('todayDayOfWeekBadge');
    el.todayStationTitle = document.getElementById('todayStationTitle');
    el.todayLocationDetail = document.getElementById('todayLocationDetail');
    el.todayShiftsContainer = document.getElementById('todayShiftsContainer');
    el.todayCustomNoteContainer = document.getElementById('todayCustomNoteContainer');
    el.openTodayNoteBtn = document.getElementById('openTodayNoteBtn');

    // Hero Tomorrow Card
    el.tomorrowCard = document.getElementById('tomorrowCard');
    el.tomorrowDateLabel = document.getElementById('tomorrowDateLabel');
    el.tomorrowRegularStation = document.getElementById('tomorrowRegularStation');
    el.tomorrowRegularLocation = document.getElementById('tomorrowRegularLocation');
    el.tomorrowOtSection = document.getElementById('tomorrowOtSection');

    // 7-Day Strip & Month Calendar
    el.sevenDaysStrip = document.getElementById('sevenDaysStrip');
    el.monthCalendarGrid = document.getElementById('monthCalendarGrid');

    // Bottom KPI Stats
    el.kpiTotalWorkDays = document.getElementById('kpiTotalWorkDays');
    el.kpiRegularDays = document.getElementById('kpiRegularDays');
    el.kpiOtShifts = document.getElementById('kpiOtShifts');
    el.kpiOffDays = document.getElementById('kpiOffDays');
    el.stationPillsGrid = document.getElementById('stationPillsGrid');

    // Note Modal
    el.noteModal = document.getElementById('noteModal');
    el.noteModalDateLabel = document.getElementById('noteModalDateLabel');
    el.closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    el.cancelNoteBtn = document.getElementById('cancelNoteBtn');
    el.saveNoteBtn = document.getElementById('saveNoteBtn');
    el.deleteNoteBtn = document.getElementById('deleteNoteBtn');
    el.leaveReasonContainer = document.getElementById('leaveReasonContainer');
    el.leaveReasonSelect = document.getElementById('leaveReasonSelect');
    el.swapTargetContainer = document.getElementById('swapTargetContainer');
    el.swapTargetSelect = document.getElementById('swapTargetSelect');
    el.noteTextInput = document.getElementById('noteTextInput');
    el.noteTypePills = document.querySelectorAll('.note-type-pill');

    // Day Detail Modal
    el.dayDetailModal = document.getElementById('dayDetailModal');
    el.dayDetailContent = document.getElementById('dayDetailContent');
    el.closeDayModalBtn = document.getElementById('closeDayModalBtn');

    // Photo Gallery Modal
    el.imageViewerModal = document.getElementById('imageViewerModal');
    el.scheduleImage = document.getElementById('scheduleImage');
    el.openImageModalBtn = document.getElementById('openImageModalBtn');
    el.closeImageModalBtn = document.getElementById('closeImageModalBtn');
    el.imageViewerIosBackBtn = document.getElementById('imageViewerIosBackBtn');
    el.imagePanContainer = document.getElementById('imagePanContainer');

    // Excel Viewer Modal
    el.excelViewerModal = document.getElementById('excelViewerModal');
    el.openExcelModalBtn = document.getElementById('openExcelModalBtn');
    el.closeExcelModalBtn = document.getElementById('closeExcelModalBtn');
    el.excelViewerIosBackBtn = document.getElementById('excelViewerIosBackBtn');
    el.excelMainTable = document.getElementById('excelMainTable');
    el.excelTableHead = document.getElementById('excelTableHead');
    el.excelTableBody = document.getElementById('excelTableBody');
    el.excelSearchInput = document.getElementById('excelSearchInput');
    el.excelClearSearchBtn = document.getElementById('excelClearSearchBtn');
    el.excelModeSummaryBtn = document.getElementById('excelModeSummaryBtn');
    el.excelModeDetailedBtn = document.getElementById('excelModeDetailedBtn');
    el.excelQuickMyProfileBtn = document.getElementById('excelQuickMyProfileBtn');
    el.excelResultCountLabel = document.getElementById('excelResultCountLabel');
    el.excelDetailedFilterContainer = document.getElementById('excelDetailedFilterContainer');
    el.excelHideEmptyRowsCheckbox = document.getElementById('excelHideEmptyRowsCheckbox');

    // User & Name Mapping Modal
    el.userModal = document.getElementById('userModal');
    el.closeUserModalBtn = document.getElementById('closeUserModalBtn');
    el.tabSwitchUserBtn = document.getElementById('tabSwitchUserBtn');
    el.tabNameMappingBtn = document.getElementById('tabNameMappingBtn');
    el.tabContentSwitchUser = document.getElementById('tabContentSwitchUser');
    el.tabContentNameMapping = document.getElementById('tabContentNameMapping');
    el.currentUserDisplayLabel = document.getElementById('currentUserDisplayLabel');
    el.currentUserPairedBadge = document.getElementById('currentUserPairedBadge');
    el.setAsMyProfileBtn = document.getElementById('setAsMyProfileBtn');
    el.filterNicknamesBtn = document.getElementById('filterNicknamesBtn');
    el.filterRealNamesBtn = document.getElementById('filterRealNamesBtn');
    el.staffListGrid = document.getElementById('staffListGrid');
    el.nameMappingTableContainer = document.getElementById('nameMappingTableContainer');
    el.saveMappingBtn = document.getElementById('saveMappingBtn');
    el.resetMappingBtn = document.getElementById('resetMappingBtn');

    // Admin & Analytics Elements
    el.tabAdminBtn = document.getElementById('tabAdminBtn');
    el.tabContentAdmin = document.getElementById('tabContentAdmin');
    el.adminLockBadge = document.getElementById('adminLockBadge');
    el.mappingAdminBanner = document.getElementById('mappingAdminBanner');
    el.adminLockedView = document.getElementById('adminLockedView');
    el.adminUnlockedView = document.getElementById('adminUnlockedView');
    el.adminPinInput = document.getElementById('adminPinInput');
    el.adminLoginBtn = document.getElementById('adminLoginBtn');
    el.adminTotalViews = document.getElementById('adminTotalViews');
    el.adminUniqueUsers = document.getElementById('adminUniqueUsers');
    el.adminCloudStatusBadge = document.getElementById('adminCloudStatusBadge');
    el.adminRecentVisitorsList = document.getElementById('adminRecentVisitorsList');
    el.refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
    el.supabaseUrlInput = document.getElementById('supabaseUrlInput');
    el.supabaseKeyInput = document.getElementById('supabaseKeyInput');
    el.saveSupabaseConfigBtn = document.getElementById('saveSupabaseConfigBtn');
    el.changeAdminPinBtn = document.getElementById('changeAdminPinBtn');
    el.adminLogoutBtn = document.getElementById('adminLogoutBtn');

    // Excel Uploader Modal
    el.uploadExcelModal = document.getElementById('uploadExcelModal');
    el.openUploadModalBtn = document.getElementById('openUploadModalBtn');
    el.closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
    el.excelFileInput = document.getElementById('excelFileInput');
    el.dropZone = document.getElementById('dropZone');
    el.uploadStatus = document.getElementById('uploadStatus');

    // First-Time Onboarding Modal
    el.onboardingModal = document.getElementById('onboardingModal');
    el.onboardingNicknameSelect = document.getElementById('onboardingNicknameSelect');
    el.onboardingRealNameSection = document.getElementById('onboardingRealNameSection');
    el.onboardingRealNameSelect = document.getElementById('onboardingRealNameSelect');
    el.onboardingPairedNotice = document.getElementById('onboardingPairedNotice');
    el.onboardingSubmitBtn = document.getElementById('onboardingSubmitBtn');
  }

  function loadScheduleData() {
    state.customNotes = JSON.parse(localStorage.getItem('crh_custom_day_notes') || '{}');
    state.scheduleList = window.buildMonthSchedule(state.currentUser);
  }

  // ==========================================
  // ANDROID HARDWARE BACK BUTTON NAVIGATION
  // ==========================================
  function setupAndroidBackNavigation() {
    window.addEventListener('popstate', (e) => {
      // If any modal is in the open stack, close the topmost modal
      if (modalHistoryStack.length > 0) {
        const topModal = modalHistoryStack.pop();
        if (topModal && !topModal.classList.contains('hidden')) {
          topModal.classList.add('hidden');
        }
      }
    });
  }

  function openModalWithHistory(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    modalHistoryStack.push(modalEl);
    // Push state so Android back button triggers popstate instead of exiting the app
    history.pushState({ modalOpen: true, id: modalEl.id }, '');
  }

  function closeModalWithHistory(modalEl) {
    if (!modalEl || modalEl.classList.contains('hidden')) return;
    modalEl.classList.add('hidden');
    const idx = modalHistoryStack.indexOf(modalEl);
    if (idx !== -1) {
      modalHistoryStack.splice(idx, 1);
      // Step back history if top
      if (history.state && history.state.modalOpen) {
        history.back();
      }
    }
  }

  // ==========================================
  // THEME SYSTEM (DARK & LIGHT MODE)
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem('crh_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = (savedTheme === 'dark') || (!savedTheme && prefersDark);
    applyTheme(isDark ? 'dark' : 'light', false);
  }

  function applyTheme(theme, save = true) {
    const isDark = (theme === 'dark');
    if (isDark) {
      document.documentElement.classList.add('dark');
      if (el.themeToggleIcon) {
        el.themeToggleIcon.textContent = '☀️';
        el.themeToggleIcon.title = 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)';
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#090d16');
    } else {
      document.documentElement.classList.remove('dark');
      if (el.themeToggleIcon) {
        el.themeToggleIcon.textContent = '🌙';
        el.themeToggleIcon.title = 'เปลี่ยนเป็นโหมดมืด (Dark Mode)';
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f6f7f9');
    }

    if (save) {
      localStorage.setItem('crh_theme', theme);
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark', true);
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  function bindEvents() {
    // Dark / Light Mode Switcher
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Open Today Note
    if (el.openTodayNoteBtn) {
      el.openTodayNoteBtn.addEventListener('click', () => openNoteModal(state.selectedDate));
    }

    // Note Modal Controls
    if (el.closeNoteModalBtn) el.closeNoteModalBtn.addEventListener('click', () => closeModalWithHistory(el.noteModal));
    if (el.cancelNoteBtn) el.cancelNoteBtn.addEventListener('click', () => closeModalWithHistory(el.noteModal));
    if (el.saveNoteBtn) el.saveNoteBtn.addEventListener('click', saveNoteData);
    if (el.deleteNoteBtn) el.deleteNoteBtn.addEventListener('click', deleteNoteData);

    if (el.noteTypePills) {
      el.noteTypePills.forEach(pill => {
        pill.addEventListener('click', () => setNoteType(pill.dataset.type));
      });
    }

    // Day Detail Close
    if (el.closeDayModalBtn) {
      el.closeDayModalBtn.addEventListener('click', () => closeModalWithHistory(el.dayDetailModal));
    }

    // Photo Gallery Open & Close
    if (el.openImageModalBtn) {
      el.openImageModalBtn.addEventListener('click', () => {
        resetImageZoom();
        openModalWithHistory(el.imageViewerModal);
      });
    }
    if (el.closeImageModalBtn) {
      el.closeImageModalBtn.addEventListener('click', () => closeModalWithHistory(el.imageViewerModal));
    }
    if (el.imageViewerIosBackBtn) {
      el.imageViewerIosBackBtn.addEventListener('click', () => closeModalWithHistory(el.imageViewerModal));
    }

    // Excel Modal Controls
    if (el.openExcelModalBtn) {
      el.openExcelModalBtn.addEventListener('click', () => {
        renderExcelTable();
        openModalWithHistory(el.excelViewerModal);
      });
    }
    if (el.closeExcelModalBtn) {
      el.closeExcelModalBtn.addEventListener('click', () => closeModalWithHistory(el.excelViewerModal));
    }
    if (el.excelViewerIosBackBtn) {
      el.excelViewerIosBackBtn.addEventListener('click', () => closeModalWithHistory(el.excelViewerModal));
    }

    if (el.excelModeSummaryBtn) {
      el.excelModeSummaryBtn.addEventListener('click', () => setExcelMode('summary'));
    }
    if (el.excelModeDetailedBtn) {
      el.excelModeDetailedBtn.addEventListener('click', () => setExcelMode('detailed'));
    }

    if (el.excelQuickMyProfileBtn) {
      el.excelQuickMyProfileBtn.addEventListener('click', () => {
        const staff = window.getResolvedStaff(state.currentUser);
        const myName = staff.realName || staff.displayName || '';
        const searchInputVal = (el.excelSearchInput ? el.excelSearchInput.value.trim().toLowerCase() : '');

        if (searchInputVal && myName.toLowerCase().includes(searchInputVal)) {
          // Toggle off
          state.excelSearchKeyword = '';
          if (el.excelSearchInput) el.excelSearchInput.value = '';
          if (el.excelClearSearchBtn) {
            el.excelClearSearchBtn.classList.add('hidden');
            el.excelClearSearchBtn.classList.remove('flex');
          }
          el.excelQuickMyProfileBtn.className = 'px-2.5 py-1.5 rounded-xl bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 text-[11px] font-bold flex items-center space-x-1 shrink-0 active:scale-95 transition-all';
        } else {
          // Toggle on
          state.excelSearchKeyword = myName.toLowerCase();
          if (el.excelSearchInput) el.excelSearchInput.value = myName;
          if (el.excelClearSearchBtn) {
            el.excelClearSearchBtn.classList.remove('hidden');
            el.excelClearSearchBtn.classList.add('flex');
          }
          el.excelQuickMyProfileBtn.className = 'px-2.5 py-1.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white border border-coral-600 text-[11px] font-bold flex items-center space-x-1 shrink-0 active:scale-95 transition-all';
        }
        renderExcelTable();
      });
    }

    if (el.excelSearchInput) {
      el.excelSearchInput.addEventListener('input', (e) => {
        state.excelSearchKeyword = e.target.value.trim().toLowerCase();
        if (el.excelClearSearchBtn) {
          if (state.excelSearchKeyword) {
            el.excelClearSearchBtn.classList.remove('hidden');
            el.excelClearSearchBtn.classList.add('flex');
          } else {
            el.excelClearSearchBtn.classList.add('hidden');
            el.excelClearSearchBtn.classList.remove('flex');
          }
        }
        renderExcelTable();
      });
    }

    if (el.excelClearSearchBtn) {
      el.excelClearSearchBtn.addEventListener('click', () => {
        state.excelSearchKeyword = '';
        if (el.excelSearchInput) el.excelSearchInput.value = '';
        el.excelClearSearchBtn.classList.add('hidden');
        el.excelClearSearchBtn.classList.remove('flex');
        if (el.excelQuickMyProfileBtn) {
          el.excelQuickMyProfileBtn.className = 'px-2.5 py-1.5 rounded-xl bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 text-[11px] font-bold flex items-center space-x-1 shrink-0 active:scale-95 transition-all';
        }
        renderExcelTable();
      });
    }

    if (el.excelHideEmptyRowsCheckbox) {
      el.excelHideEmptyRowsCheckbox.addEventListener('change', (e) => {
        state.excelHideEmptyRows = e.target.checked;
        renderExcelTable();
      });
    }

    // User Switcher & Mapping Modal
    if (el.openUserModalBtn) {
      el.openUserModalBtn.addEventListener('click', () => {
        renderUserModalContent();
        openModalWithHistory(el.userModal);
      });
    }
    if (el.closeUserModalBtn) {
      el.closeUserModalBtn.addEventListener('click', () => closeModalWithHistory(el.userModal));
    }

    // User Modal Tabs (3 Tabs)
    if (el.tabSwitchUserBtn) {
      el.tabSwitchUserBtn.addEventListener('click', () => setUserModalTab('switch'));
    }
    if (el.tabNameMappingBtn) {
      el.tabNameMappingBtn.addEventListener('click', () => setUserModalTab('mapping'));
    }
    if (el.tabAdminBtn) {
      el.tabAdminBtn.addEventListener('click', () => setUserModalTab('admin'));
    }

    // Admin Login / Unlock
    if (el.adminLoginBtn) {
      el.adminLoginBtn.addEventListener('click', () => {
        const pin = el.adminPinInput ? el.adminPinInput.value.trim() : '';
        const savedPin = localStorage.getItem('crh_admin_pin') || '2569';
        if (pin === savedPin) {
          state.isAdmin = true;
          sessionStorage.setItem('crh_is_admin', 'true');
          renderAdminDashboard();
          renderNameMappingSetup();
        } else {
          alert('รหัส PIN แอดมินไม่ถูกต้องครับ (รหัสเริ่มต้นคือ: 2569)');
        }
      });
    }

    if (el.adminPinInput) {
      el.adminPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && el.adminLoginBtn) {
          el.adminLoginBtn.click();
        }
      });
    }

    // Admin Logout
    if (el.adminLogoutBtn) {
      el.adminLogoutBtn.addEventListener('click', () => {
        lockAdmin();
      });
    }

    // Refresh Analytics
    if (el.refreshAnalyticsBtn) {
      el.refreshAnalyticsBtn.addEventListener('click', () => {
        renderAdminDashboard();
      });
    }

    // Save Supabase Config
    if (el.saveSupabaseConfigBtn) {
      el.saveSupabaseConfigBtn.addEventListener('click', async () => {
        const url = el.supabaseUrlInput ? el.supabaseUrlInput.value.trim() : '';
        const key = el.supabaseKeyInput ? el.supabaseKeyInput.value.trim() : '';
        if (!url || !key) {
          alert('กรุณากรอกทั้ง Project URL และ Anon Key ให้ครบถ้วนครับ');
          return;
        }
        CloudDB.setConfig(url, key);
        alert('บันทึกการตั้งค่า Supabase แล้ว! กำลังทดสอบเชื่อมต่อ...');
        await CloudDB.logVisit(state.currentUser);
        await renderAdminDashboard();
      });
    }

    // Change Admin PIN
    if (el.changeAdminPinBtn) {
      el.changeAdminPinBtn.addEventListener('click', () => {
        const currentPin = localStorage.getItem('crh_admin_pin') || '2569';
        const verifyPin = prompt('กรุณายืนยันรหัส PIN เดิม:');
        if (verifyPin !== currentPin) {
          alert('รหัส PIN เดิมไม่ถูกต้องครับ');
          return;
        }
        const newPin = prompt('กำหนดรหัส PIN แอดมินใหม่ (4-6 หลัก):');
        if (newPin && newPin.trim().length >= 4) {
          localStorage.setItem('crh_admin_pin', newPin.trim());
          alert('เปลี่ยนรหัส PIN แอดมินเรียบร้อยแล้ว จดจำรหัสนี้ไว้ใช้นะครับ');
        } else if (newPin !== null) {
          alert('รหัส PIN ต้องมีความยาวอย่างน้อย 4 หลักครับ');
        }
      });
    }

    // Staff Filter Mode (Nicknames vs Real Names)
    if (el.filterNicknamesBtn && el.filterRealNamesBtn) {
      el.filterNicknamesBtn.addEventListener('click', () => {
        state.staffFilterMode = 'nickname';
        el.filterNicknamesBtn.className = 'px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-800';
        el.filterRealNamesBtn.className = 'px-2 py-0.5 rounded-md font-semibold text-slate-500 hover:text-slate-800';
        renderStaffSelectorGrid();
      });
      el.filterRealNamesBtn.addEventListener('click', () => {
        state.staffFilterMode = 'realname';
        el.filterRealNamesBtn.className = 'px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-800';
        el.filterNicknamesBtn.className = 'px-2 py-0.5 rounded-md font-semibold text-slate-500 hover:text-slate-800';
        renderStaffSelectorGrid();
      });
    }

    // Set Default Profile Button
    if (el.setAsMyProfileBtn) {
      el.setAsMyProfileBtn.addEventListener('click', () => {
        localStorage.setItem('crh_default_user_profile', state.currentUser);
        alert(`บันทึก "คุณ${state.currentUser}" เป็นโปรไฟล์หลักของเครื่องนี้แล้ว`);
      });
    }

    // Save Name Mapping
    if (el.saveMappingBtn) {
      el.saveMappingBtn.addEventListener('click', saveNameMappingFromUI);
    }
    if (el.resetMappingBtn) {
      el.resetMappingBtn.addEventListener('click', () => {
        if (confirm('ต้องการรีเซ็ตการจับคู่ชื่อกลับไปเป็นค่าเริ่มต้นหรือไม่?')) {
          localStorage.removeItem('crh_staff_name_map');
          renderUserModalContent();
          loadScheduleData();
          renderAll();
        }
      });
    }

    // Upload Modal
    if (el.openUploadModalBtn) {
      el.openUploadModalBtn.addEventListener('click', () => openModalWithHistory(el.uploadExcelModal));
    }
    if (el.closeUploadModalBtn) {
      el.closeUploadModalBtn.addEventListener('click', () => closeModalWithHistory(el.uploadExcelModal));
    }

    // First-Time Onboarding Modal Events
    if (el.onboardingNicknameSelect) {
      el.onboardingNicknameSelect.addEventListener('change', () => {
        const chosenNick = el.onboardingNicknameSelect.value;
        if (!chosenNick) {
          if (el.onboardingRealNameSection) el.onboardingRealNameSection.classList.add('hidden');
          if (el.onboardingSubmitBtn) {
            el.onboardingSubmitBtn.disabled = true;
            el.onboardingSubmitBtn.className = 'w-full py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed transition-all';
            el.onboardingSubmitBtn.textContent = 'กรุณาเลือกชื่อของคุณก่อน';
          }
          return;
        }

        // Show Real Name Section
        if (el.onboardingRealNameSection) el.onboardingRealNameSection.classList.remove('hidden');

        const currentMap = window.getNameMapping();
        const existingReal = currentMap[chosenNick] || '';

        if (el.onboardingRealNameSelect) {
          el.onboardingRealNameSelect.value = existingReal;
        }

        if (el.onboardingPairedNotice) {
          if (existingReal) {
            el.onboardingPairedNotice.textContent = `✓ จับคู่ไว้กับ: คุณ${existingReal} (เปลี่ยนได้หากไม่ถูกต้อง)`;
            el.onboardingPairedNotice.className = 'text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block';
          } else {
            el.onboardingPairedNotice.textContent = `⚠️ ยังไม่ได้จับคู่ชื่อจริง กรุณาเลือกชื่อจริงด้านล่าง`;
            el.onboardingPairedNotice.className = 'text-[11px] text-amber-600 dark:text-amber-400 font-medium block';
          }
        }

        if (el.onboardingSubmitBtn) {
          el.onboardingSubmitBtn.disabled = false;
          el.onboardingSubmitBtn.className = 'w-full py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-xs shadow-md shadow-coral-500/25 active:scale-95 transition-all cursor-pointer';
          el.onboardingSubmitBtn.textContent = `🚀 เริ่มต้นดูตารางเวรของคุณ${chosenNick}`;
        }
      });
    }

    if (el.onboardingSubmitBtn) {
      el.onboardingSubmitBtn.addEventListener('click', async () => {
        const nick = el.onboardingNicknameSelect ? el.onboardingNicknameSelect.value : '';
        const real = el.onboardingRealNameSelect ? el.onboardingRealNameSelect.value : '';

        if (!nick) {
          alert('กรุณาเลือกชื่อเล่นของคุณก่อนครับ');
          return;
        }

        // Save real name pairing if selected
        if (real) {
          const currentMap = window.getNameMapping();
          currentMap[nick] = real;
          await CloudDB.saveNameMappings(currentMap);
        }

        // Save active user profile
        switchUser(nick);
        localStorage.setItem('crh_default_user_profile', nick);
        localStorage.setItem('crh_user_onboarded', 'true');

        closeModalWithHistory(el.onboardingModal);
        alert(`🎉 ยินดีต้อนรับคุณ ${nick}!\nระบบได้ตั้งค่าตารางเวรให้คุณเรียบร้อยแล้วครับ`);
      });
    }

    // Close on backdrop tap
    [el.noteModal, el.dayDetailModal, el.userModal, el.uploadExcelModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModalWithHistory(modal);
        });
      }
    });
  }

  // ==========================================
  // MOBILE PINCH-TO-ZOOM & PAN (NATIVE FEEL)
  // ==========================================
  function setupPinchToZoom() {
    const container = el.imagePanContainer;
    const img = el.scheduleImage;
    if (!container || !img) return;

    // Reset Zoom
    window.resetImageZoom = function() {
      state.imageZoom = 1;
      state.imagePan = { x: 0, y: 0 };
      applyImageTransform();
    };

    function applyImageTransform() {
      img.style.transform = `translate(${state.imagePan.x}px, ${state.imagePan.y}px) scale(${state.imageZoom})`;
    }

    // Mouse Drag for Desktop Testing
    container.addEventListener('mousedown', (e) => {
      state.isDraggingImage = true;
      state.dragStart = { x: e.clientX - state.imagePan.x, y: e.clientY - state.imagePan.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDraggingImage) return;
      state.imagePan = { x: e.clientX - state.dragStart.x, y: e.clientY - state.dragStart.y };
      applyImageTransform();
    });

    window.addEventListener('mouseup', () => {
      state.isDraggingImage = false;
    });

    // Mouse Wheel Zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * -0.002;
      const newZoom = Math.min(Math.max(1, state.imageZoom + delta), 4.5);
      state.imageZoom = newZoom;
      if (newZoom === 1) state.imagePan = { x: 0, y: 0 };
      applyImageTransform();
    }, { passive: false });

    // Touch Handling (Pinch-to-zoom & 1-finger Pan)
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // 2 Fingers: Start Pinch
        state.isDraggingImage = false;
        state.initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        state.initialPinchZoom = state.imageZoom;
      } else if (e.touches.length === 1) {
        // Double-tap detection
        const currentTime = new Date().getTime();
        const tapInterval = currentTime - state.lastTapTime;
        if (tapInterval < 300 && tapInterval > 0) {
          // Double Tap toggles 1x <-> 2.5x
          e.preventDefault();
          if (state.imageZoom > 1.2) {
            state.imageZoom = 1;
            state.imagePan = { x: 0, y: 0 };
          } else {
            state.imageZoom = 2.5;
          }
          applyImageTransform();
          state.lastTapTime = 0;
          return;
        }
        state.lastTapTime = currentTime;

        // 1 Finger: Pan
        state.isDraggingImage = true;
        state.dragStart = {
          x: e.touches[0].clientX - state.imagePan.x,
          y: e.touches[0].clientY - state.imagePan.y
        };
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (state.initialPinchDistance > 0) {
          const scaleMultiplier = currentDistance / state.initialPinchDistance;
          state.imageZoom = Math.min(Math.max(1, state.initialPinchZoom * scaleMultiplier), 4.5);
          if (state.imageZoom === 1) state.imagePan = { x: 0, y: 0 };
          applyImageTransform();
        }
      } else if (e.touches.length === 1 && state.isDraggingImage && state.imageZoom > 1) {
        e.preventDefault();
        state.imagePan = {
          x: e.touches[0].clientX - state.dragStart.x,
          y: e.touches[0].clientY - state.dragStart.y
        };
        applyImageTransform();
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        state.initialPinchDistance = 0;
      }
      if (e.touches.length === 0) {
        state.isDraggingImage = false;
      }
    });
  }

  // ==========================================
  // RENDER PIPELINE
  // ==========================================
  function renderAll() {
    renderHeaderGreeting();
    renderTodayCard();
    renderTomorrowCard();
    renderSevenDaysStrip();
    renderMonthCalendar();
    renderKPISummary();
  }

  function renderHeaderGreeting() {
    const staff = window.getResolvedStaff(state.currentUser);
    if (staff.realName && staff.nickname) {
      if (el.headerFullName) el.headerFullName.textContent = staff.realName;
      if (el.headerNickname) el.headerNickname.textContent = `(${staff.nickname})`;
    } else if (staff.nickname) {
      if (el.headerFullName) el.headerFullName.textContent = staff.nickname;
      if (el.headerNickname) el.headerNickname.textContent = '';
    } else {
      if (el.headerFullName) el.headerFullName.textContent = staff.realName;
      if (el.headerNickname) el.headerNickname.textContent = '';
    }
  }

  // TODAY CARD (LINEAR / APPLE HEALTH STYLE HERO COMPONENT)
  function renderTodayCard() {
    const day = state.scheduleList[state.selectedDate - 1];
    if (!day) return;

    if (el.todayDateHeading) {
      el.todayDateHeading.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;
    }
    if (el.todayDayOfWeekBadge) {
      el.todayDayOfWeekBadge.textContent = day.dayName;
    }

    const nightDuty = (day.otDuties || []).find(ot => ot.name.includes("ดึก") || (ot.shift && ot.shift.includes("ดึก")));

    // Card border / highlight state for night shift
    if (el.todayCard) {
      el.todayCard.classList.toggle('card-night-shift', !!nightDuty);
    }

    // Dynamic Status Badge (Linear Minimalist Style)
    const todayStatusBadge = document.getElementById('todayStatusBadge');
    if (todayStatusBadge) {
      if (nightDuty) {
        todayStatusBadge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25 text-[11px] font-semibold';
        todayStatusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse"></span><span>เวรดึกคืนนี้ 🌙</span>`;
      } else if (day.isDayOff) {
        todayStatusBadge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[11px] font-semibold';
        todayStatusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse"></span><span>วันหยุดประจำสัปดาห์</span>`;
      } else {
        todayStatusBadge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold';
        todayStatusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span><span>เวลาปกติ (มีเวร)</span>`;
      }
    }

    // Regular Daytime Duty (เวลาปกติ)
    if (day.regularDuty) {
      const sub = day.substitutionInfo;
      if (sub && sub.isViewerSubstitute) {
        // กรณีผู้ใช้มีเวร "แทน บ่ายดึก" (เช่น ปอ วันที่ 5) -> บอกว่าต้องไปแทนใคร ที่ห้องไหน
        const target = sub.targetStation || 'จุดเข้าเวร';
        const targetLoc = sub.targetLocation || 'กลุ่มงานการเงิน';
        const replacedName = sub.nightShiftNickname ? `คุณ${sub.nightShiftNickname}` : (sub.nightShiftRealName ? `คุณ${sub.nightShiftRealName}` : '');

        el.todayStationTitle.innerHTML = `
          <div class="flex flex-wrap items-baseline gap-2">
            <span>แทน บ่ายดึก</span>
            <span class="text-xs font-semibold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              ➔ เข้า: ${target}
            </span>
          </div>
        `;
        el.todayLocationDetail.innerHTML = `
          <div class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            📍 ${targetLoc} ${replacedName ? `• (ไปแทน${replacedName})` : ''}
          </div>
        `;
      } else if (sub && sub.isViewerNightShift) {
        // กรณีผู้ใช้อยู่เวรดึก/บ่าย (เช่น เอ็ม วันที่ 5) -> แจ้งว่ามีคนมาแทนที่จุดปกติ
        const subName = sub.substituteNickname ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';

        el.todayStationTitle.innerHTML = `
          <div class="flex flex-wrap items-baseline gap-2">
            <span>${day.regularDuty.title}</span>
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              🔄 ${subName} แทนบ่ายดึก
            </span>
          </div>
        `;
        el.todayLocationDetail.innerHTML = `
          <div class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            ${day.regularDuty.location} • มีคนปฏิบัติแทน : ${subName} (เวรแทนบ่ายดึก)
          </div>
        `;
      } else {
        el.todayStationTitle.textContent = day.regularDuty.title;
        el.todayLocationDetail.textContent = day.regularDuty.location;
      }
    } else if (day.isDayOff) {
      el.todayStationTitle.textContent = 'วันหยุด';
      el.todayLocationDetail.textContent = 'พักประจำสัปดาห์';
    } else {
      el.todayStationTitle.textContent = 'เวรวันหยุด';
      el.todayLocationDetail.textContent = 'ไม่มีงานเวลาปกติ';
    }

    // Extra / Night / Afternoon Shifts (Chronologically Sorted: Night first!)
    el.todayShiftsContainer.innerHTML = '';
    if (day.otDuties && day.otDuties.length > 0) {
      // Sort duties so night shift is ALWAYS at the top!
      const sortedDuties = [...day.otDuties].sort((a, b) => {
        const aNight = (a.name.includes("ดึก") || (a.shift && a.shift.includes("ดึก"))) ? 0 : 1;
        const bNight = (b.name.includes("ดึก") || (b.shift && b.shift.includes("ดึก"))) ? 0 : 1;
        return aNight - bNight;
      });

      sortedDuties.forEach(ot => {
        const item = document.createElement('div');
        const isNight = ot.name.includes("ดึก") || ot.shiftTime === "กะดึก" || (ot.shift && ot.shift.includes("ดึก"));
        item.className = `p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
          isNight 
            ? 'bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/25 text-purple-900 dark:text-purple-200' 
            : 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
        }`;
        item.innerHTML = `
          <div class="flex items-center space-x-2.5">
            <span class="w-2 h-2 rounded-full ${isNight ? 'bg-purple-500 shadow-xs' : 'bg-amber-500 shadow-xs'} shrink-0"></span>
            <div>
              <div class="font-bold text-xs">${ot.name}</div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                ${isNight ? 'เวรดึก (00:00 - 08:00 น.) • เข้างานเที่ยงคืน' : (ot.shiftTime || ot.category)}
              </div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${
            isNight 
              ? 'bg-purple-600 text-white shadow-xs' 
              : 'bg-white/80 dark:bg-white/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-white/10'
          }">
            ${isNight ? '★ ดึก' : 'ตามตาราง'}
          </span>
        `;
        el.todayShiftsContainer.appendChild(item);
      });
    } else {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-400 text-xs flex items-center space-x-2';
      emptyItem.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
        <span>ไม่มีเวรนอกเวลา</span>
      `;
      el.todayShiftsContainer.appendChild(emptyItem);
    }

    // User Custom Note Container
    if (day.userNote) {
      el.todayCustomNoteContainer.classList.remove('hidden');
      const isSwap = (day.userNote.type === 'swap');
      el.todayCustomNoteContainer.innerHTML = `
        <div class="p-2.5 rounded-xl ${isSwap ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'} text-xs flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="font-bold">${isSwap ? `สลับวันหยุดกับ: ${day.userNote.swapWith}` : day.userNote.title}</span>
            ${day.userNote.note ? `<span class="opacity-75">(${day.userNote.note})</span>` : ''}
          </div>
          <button onclick="window.triggerEditNote(${day.date})" class="font-bold text-[11px] underline">แก้ไข</button>
        </div>
      `;
    } else {
      el.todayCustomNoteContainer.classList.add('hidden');
    }
  }

  // TOMORROW CARD (COMPANION HERO COMPONENT)
  function renderTomorrowCard() {
    const tomorrowDate = (state.selectedDate < 30) ? (state.selectedDate + 1) : 1;
    const day = state.scheduleList[tomorrowDate - 1];
    if (!day) return;

    if (el.tomorrowDateLabel) {
      el.tomorrowDateLabel.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;
    }

    const tomorrowNightDuty = (day.otDuties || []).find(ot => ot.name.includes("ดึก") || (ot.shift && ot.shift.includes("ดึก")));
    const sub = day.substitutionInfo;
    const subName = (sub && sub.substituteNickname) ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';

    // Highlight whole card if tomorrow has night shift
    if (el.tomorrowCard) {
      el.tomorrowCard.classList.toggle('card-night-shift', !!tomorrowNightDuty);
    }

    if (el.tomorrowRegularStation) {
      if (tomorrowNightDuty) {
        // PRIORITIZE NIGHT SHIFT ON TOMORROW'S CARD!
        el.tomorrowRegularStation.innerHTML = `
          <div class="flex items-center space-x-2 text-purple-600 dark:text-purple-300 font-bold text-lg">
            <span>🌙</span>
            <span>${tomorrowNightDuty.name}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">เข้างานเที่ยงคืน</span>
          </div>
        `;
        el.tomorrowRegularLocation.innerHTML = `
          <div class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            กะดึก 00:00 - 08:00 น.
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            ${day.regularDuty ? `เวลาปกติ: ${day.regularDuty.title} • มีคนปฏิบัติแทน : ${subName} (เวรแทนบ่ายดึก)` : 'ไม่มีงานเวลาปกติ'}
          </div>
        `;
      } else if (day.regularDuty) {
        if (sub && sub.isViewerSubstitute) {
          const target = sub.targetStation || 'จุดเข้าเวร';
          const replacedName = sub.nightShiftNickname ? `คุณ${sub.nightShiftNickname}` : '';
          el.tomorrowRegularStation.innerHTML = `แทน บ่ายดึก <span class="text-xs font-semibold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">➔ ${target}</span>`;
          el.tomorrowRegularLocation.textContent = `${sub.targetLocation || 'กลุ่มงานการเงิน'} ${replacedName ? `• (แทน${replacedName})` : ''}`;
        } else if (sub && sub.isViewerNightShift) {
          el.tomorrowRegularStation.innerHTML = `${day.regularDuty.title} <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">(${subName} แทน)</span>`;
          el.tomorrowRegularLocation.textContent = `${day.regularDuty.location} • มีคนปฏิบัติแทน : ${subName} (เวรแทนบ่ายดึก)`;
        } else {
          el.tomorrowRegularStation.textContent = day.regularDuty.title;
          el.tomorrowRegularLocation.textContent = day.regularDuty.location;
        }
      } else if (day.isDayOff) {
        el.tomorrowRegularStation.textContent = 'วันหยุด';
        el.tomorrowRegularLocation.textContent = 'พักประจำสัปดาห์';
      } else {
        el.tomorrowRegularStation.textContent = 'เวรวันหยุด';
        el.tomorrowRegularLocation.textContent = 'ไม่มีงานเวลาปกติ';
      }
    }

    if (el.tomorrowOtSection) {
      el.tomorrowOtSection.innerHTML = '';
      if (day.otDuties && day.otDuties.length > 0) {
        day.otDuties.forEach(ot => {
          const isNight = ot.name.includes("ดึก") || (ot.shift && ot.shift.includes("ดึก"));
          const item = document.createElement('div');
          item.className = `inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ml-1 mb-1 border ${
            isNight 
              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' 
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
          }`;
          item.textContent = isNight ? `🌙 ${ot.name}` : ot.name;
          el.tomorrowOtSection.appendChild(item);
        });
      } else {
        el.tomorrowOtSection.innerHTML = `<span class="text-xs text-slate-400">ไม่มีเวรนอกเวลา</span>`;
      }
    }
  }

  // 7-DAY STRIP (CLEAN & COMPACT LINEAR STYLE)
  function renderSevenDaysStrip() {
    if (!el.sevenDaysStrip) return;
    el.sevenDaysStrip.innerHTML = '';

    const startIndex = state.selectedDate - 1; // 0-based
    const next7Days = [];

    for (let i = 0; i < 7; i++) {
      const idx = (startIndex + i) % 30;
      next7Days.push(state.scheduleList[idx]);
    }

    next7Days.forEach((day, index) => {
      const card = document.createElement('div');
      const isToday = (index === 0);
      const isHighlighted = day.hasDuty;
      const isDayOff = day.isDayOff;

      const nightDuty = (day.otDuties || []).find(ot => ot.name.includes("ดึก") || (ot.shift && ot.shift.includes("ดึก")));
      const afternoonDuty = (day.otDuties || []).find(ot => ot.name.includes("บ่าย") || (ot.shift && ot.shift.includes("บ่าย")));

      let cardClass = 'seven-day-card ';
      if (isToday) cardClass += 'card-today ';
      if (nightDuty) cardClass += 'card-night-shift ';

      let headerDotHtml = '';
      let mainText = '';
      let subText = '';

      if (nightDuty) {
        headerDotHtml = `<span class="w-2 h-2 rounded-full bg-purple-500 shadow-xs"></span>`;
        mainText = `
          <div class="text-xs font-bold text-purple-600 dark:text-purple-300 leading-tight">★ ${nightDuty.name}</div>
          <div class="text-[9px] text-slate-400 mt-0.5 font-mono">00:00 น.</div>
        `;
        const regular = day.regularDuty ? day.regularDuty.title : '-';
        const sub = day.substitutionInfo;
        const subName = (sub && sub.substituteNickname) ? `${sub.substituteNickname} แทน` : 'มีคนแทน';
        subText = `
          <div class="text-[9px] font-medium text-slate-500 dark:text-slate-400 truncate">${regular} (${subName})</div>
          ${afternoonDuty ? `<div class="text-[9px] font-semibold text-amber-500 truncate mt-0.5">+ ${afternoonDuty.name}</div>` : ''}
        `;
      } else if (isDayOff) {
        headerDotHtml = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>`;
        mainText = `<div class="text-sm font-bold text-rose-500 dark:text-rose-400 my-auto">วันหยุด</div>`;
        subText = `<div class="text-[9px] text-slate-400">พักประจำสัปดาห์</div>`;
      } else {
        const regular = day.regularDuty ? day.regularDuty.title : '-';
        const sub = day.substitutionInfo;
        headerDotHtml = `<span class="w-1.5 h-1.5 rounded-full ${isHighlighted ? 'bg-amber-400' : 'bg-emerald-400'}"></span>`;

        if (sub && sub.isViewerSubstitute) {
          const target = sub.targetStation || 'บ่ายดึก';
          mainText = `<div class="text-xs font-bold text-sky-600 dark:text-sky-300 leading-tight">แทน: ${target}</div>`;
          const replacedName = sub.nightShiftNickname ? `แทน${sub.nightShiftNickname}` : '';
          subText = `<div class="text-[9px] font-medium text-slate-400 truncate">📍 ${replacedName || 'แทนบ่ายดึก'}</div>`;
        } else if (sub && sub.isViewerNightShift) {
          mainText = `<div class="text-xs font-bold text-slate-900 dark:text-white leading-tight">${regular}</div>`;
          const subName = sub.substituteNickname ? `${sub.substituteNickname} แทน` : 'มีคนแทน';
          subText = `<div class="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 truncate">🔄 ${subName}</div>`;
        } else {
          mainText = `<div class="text-xs font-bold text-slate-900 dark:text-white leading-tight">${regular}</div>`;
          if (day.otDuties && day.otDuties.length > 0) {
            const shiftNames = day.otDuties.map(ot => {
              if (ot.name.includes("ดึก")) return "ดึก";
              if (ot.name.includes("บ่าย")) return "บ่าย";
              if (ot.name.includes("เช้า")) return "เช้า";
              return ot.name;
            }).join('+');
            subText = `<div class="text-[9px] font-semibold text-amber-500 truncate">เวร ${shiftNames}</div>`;
          } else {
            subText = `<div class="text-[9px] text-slate-400">เวลาปกติ</div>`;
          }
        }
      }

      if (day.userNote) {
        if (day.userNote.type === 'swap') {
          subText = `<div class="text-[9px] font-medium text-sky-400 truncate">สลับ: ${day.userNote.swapWith}</div>`;
        } else {
          subText = `<div class="text-[9px] font-medium text-rose-400 truncate">${day.userNote.title}</div>`;
        }
      }

      card.className = cardClass;
      card.innerHTML = `
        <div class="text-[10px] font-medium text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <span>${day.dayName} ${day.date}</span>
          ${headerDotHtml}
        </div>
        <div class="my-auto py-1">
          ${mainText}
        </div>
        <div>
          ${subText}
        </div>
      `;

      card.addEventListener('click', () => {
        state.selectedDate = day.date;
        renderTodayCard();
        renderTomorrowCard();
        renderSevenDaysStrip();
        renderMonthCalendar();
        openDayDetailModal(day);
      });

      el.sevenDaysStrip.appendChild(card);
    });
  }

  // MONTH VIEW CALENDAR (MONDAY-START: จ อ พ พฤ ศ ส อา + NIGHT SHIFT PURPLE BADGE)
  function renderMonthCalendar() {
    if (!el.monthCalendarGrid) return;
    el.monthCalendarGrid.innerHTML = '';

    // November 2569 starts on Sunday (1 พ.ย. 2569)
    // Starting with Monday: 6 leading days from October (26, 27, 28, 29, 30, 31)
    const prevMonthDays = [26, 27, 28, 29, 30, 31];
    prevMonthDays.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cal-month-cell text-slate-300 font-normal';
      cell.textContent = d;
      el.monthCalendarGrid.appendChild(cell);
    });

    // 30 Days of November
    state.scheduleList.forEach(day => {
      const cell = document.createElement('div');
      const isSelected = (day.date === state.selectedDate);
      const isHighlighted = day.hasDuty;
      const isDayOff = day.isDayOff;
      const hasNight = (day.otDuties || []).some(ot => ot.name.includes("ดึก") || (ot.shift && ot.shift.includes("ดึก")));

      let cellClass = 'cal-month-cell ';

      // COLOR CODING:
      // มีเวรดึก = สีม่วงไฮไลท์ (Purple / Night Shift)
      // มีเวรบ่าย/OT = สีเหลือง (Yellow / Amber)
      // วันหยุด = สีแดง (Red / Coral)
      if (isSelected) {
        cellClass += 'cal-cell-today ';
        if (hasNight) cellClass += 'ring-2 ring-purple-600 ';
      } else if (hasNight) {
        cellClass += 'cal-cell-night ';
      } else if (isHighlighted) {
        cellClass += 'cal-cell-duty ';
      } else if (isDayOff) {
        cellClass += 'cal-cell-off ';
      } else {
        cellClass += 'cal-cell-normal ';
      }

      cell.className = cellClass;
      if (hasNight) {
        cell.innerHTML = `
          <div class="flex flex-col items-center justify-center leading-none">
            <span class="font-bold">${day.date}</span>
            <span class="text-[8px] font-bold text-purple-700 dark:text-purple-300 tracking-tighter mt-0.5">🌙ดึก</span>
          </div>
        `;
      } else {
        cell.textContent = day.date;
      }

      cell.addEventListener('click', () => {
        state.selectedDate = day.date;
        renderTodayCard();
        renderTomorrowCard();
        renderSevenDaysStrip();
        renderMonthCalendar();
        openDayDetailModal(day);
      });

      el.monthCalendarGrid.appendChild(cell);
    });

    // Trailing days from December
    const nextMonthDays = [1, 2, 3, 4, 5, 6];
    nextMonthDays.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cal-month-cell text-slate-300 font-normal';
      cell.textContent = d;
      el.monthCalendarGrid.appendChild(cell);
    });
  }

  // BOTTOM KPI STATS (PCU, ER, ตึกรังสี ฯลฯ)
  function renderKPISummary() {
    if (typeof window.getStationStats !== 'function') return;
    const stats = window.getStationStats(state.currentUser);

    if (el.kpiTotalWorkDays) el.kpiTotalWorkDays.textContent = stats.totalWorkDays;
    if (el.kpiRegularDays) el.kpiRegularDays.textContent = `${stats.totalWorkDays} วัน`;
    if (el.kpiOtShifts) el.kpiOtShifts.textContent = `${stats.totalOtShifts} เวร`;
    if (el.kpiOffDays) el.kpiOffDays.textContent = `${stats.totalOffDays} วัน`;

    if (el.stationPillsGrid) {
      el.stationPillsGrid.innerHTML = '';
      const prominent = [
        { name: "PCU", color: "text-blue-700 bg-blue-50 border-blue-200" },
        { name: "ER", color: "text-rose-700 bg-rose-50 border-rose-200" },
        { name: "ตึกรังสี", color: "text-amber-700 bg-amber-50 border-amber-200" },
        { name: "เก็บเงิน 19", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
        { name: "คิดชาร์ท 19", color: "text-teal-700 bg-teal-50 border-teal-200" },
        { name: "คิดชาร์ท 999", color: "text-purple-700 bg-purple-50 border-purple-200" }
      ];

      prominent.forEach(st => {
        const count = stats.stationCounts[st.name] || 0;
        const pill = document.createElement('div');
        pill.className = `p-2 rounded-xl border text-center ${st.color}`;
        pill.innerHTML = `
          <div class="text-[10px] font-semibold opacity-80 truncate">${st.name}</div>
          <div class="text-sm font-bold font-mono mt-0.5">${count} <span class="text-[10px] font-normal">วัน</span></div>
        `;
        el.stationPillsGrid.appendChild(pill);
      });
    }
  }

  // ==========================================
  // EXCEL TABLE RENDER (100% OFFLINE VIA data.js)
  // ==========================================
  function setExcelMode(mode) {
    state.excelMode = mode;
    if (mode === 'summary') {
      if (el.excelModeSummaryBtn) {
        el.excelModeSummaryBtn.className = 'px-3 py-1.5 rounded-lg transition-all bg-white text-slate-900 shadow-sm font-bold';
      }
      if (el.excelModeDetailedBtn) {
        el.excelModeDetailedBtn.className = 'px-3 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold';
      }
      if (el.excelDetailedFilterContainer) {
        el.excelDetailedFilterContainer.classList.add('hidden');
        el.excelDetailedFilterContainer.classList.remove('flex');
      }
    } else {
      if (el.excelModeDetailedBtn) {
        el.excelModeDetailedBtn.className = 'px-3 py-1.5 rounded-lg transition-all bg-white text-slate-900 shadow-sm font-bold';
      }
      if (el.excelModeSummaryBtn) {
        el.excelModeSummaryBtn.className = 'px-3 py-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-semibold';
      }
      if (el.excelDetailedFilterContainer) {
        el.excelDetailedFilterContainer.classList.remove('hidden');
        el.excelDetailedFilterContainer.classList.add('flex');
      }
    }
    renderExcelTable();
  }

  function getDutyBadge(category) {
    if (!category) return { label: 'เวร', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    const cat = category.trim();
    if (cat.includes('ดึก')) {
      return { label: 'ดึก', cls: 'bg-purple-100 text-purple-900 border-purple-300' };
    }
    if (cat.includes('เซ็นทรัล')) {
      return { label: 'เซ็นทรัล', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    }
    if (cat.includes('19')) {
      return { label: 'บ.19', cls: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
    }
    if (cat.includes('เสริมเบอร์ 9/1') || cat.includes('เสริม 9/1')) {
      return { label: 'เสริม 9/1', cls: 'bg-rose-100 text-rose-900 border-rose-300' };
    }
    if (cat.includes('เสริมเบอร์ 9/2') || cat.includes('เสริม 9/2')) {
      return { label: 'เสริม 9/2', cls: 'bg-rose-100 text-rose-900 border-rose-300' };
    }
    if (cat.includes('เสริมเบอร์ 9/3') || cat.includes('เสริม 9/3')) {
      return { label: 'เสริม 9/3', cls: 'bg-rose-100 text-rose-900 border-rose-300' };
    }
    if (cat.includes('เช้าเบอร์ 9 เสริม') || cat.includes('เช้าเสริม 9')) {
      return { label: 'เช้าเสริม 9', cls: 'bg-cyan-100 text-cyan-900 border-cyan-300' };
    }
    if (cat.includes('เช้าเบอร์ 9') || cat.includes('เช้า 9')) {
      return { label: 'เช้า 9', cls: 'bg-sky-100 text-sky-900 border-sky-300' };
    }
    if (cat.includes('IPD เช้า')) {
      return { label: 'เช้า IPD', cls: 'bg-sky-100 text-sky-900 border-sky-300' };
    }
    if (cat.includes('บ่ายเบอร์ 9') || cat.includes('บ่าย 9')) {
      return { label: 'บ่าย 9', cls: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (cat.includes('บ่าย')) {
      return { label: 'บ่าย', cls: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (cat.includes('เช้า')) {
      return { label: 'เช้า', cls: 'bg-sky-100 text-sky-900 border-sky-300' };
    }
    return { label: cat.substring(0, 8), cls: 'bg-slate-100 text-slate-800 border-slate-200' };
  }

  function renderExcelTable() {
    if (!el.excelTableBody || !el.excelTableHead) return;
    el.excelTableHead.innerHTML = '';
    el.excelTableBody.innerHTML = '';

    const filter = (state.excelSearchKeyword || '').trim().toLowerCase();
    const dayShortNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const currentStaff = window.getResolvedStaff(state.currentUser);

    // ========================================================
    // MODE 1: SUMMARY MODE (1 Staff = 1 Clean Consolidated Row)
    // ========================================================
    if (state.excelMode === 'summary') {
      // 1. Build Header
      let headerHtml = `
        <tr class="bg-slate-900 text-white text-[11px] font-bold sticky top-0 z-20">
          <th class="p-2 border border-slate-700 sticky-col-1 whitespace-nowrap min-w-[130px] max-w-[160px]">ชื่อ - สกุล</th>
          <th class="p-1 border border-slate-700 text-center whitespace-nowrap min-w-[44px]">รวม</th>
      `;

      for (let d = 1; d <= 30; d++) {
        const dayOfWeek = (d - 1) % 7; // Nov 1 = Sunday = index 0
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        headerHtml += `
          <th class="p-1 text-center border border-slate-700 min-w-[36px] ${isWeekend ? 'bg-rose-950/80 text-rose-200' : 'bg-slate-800 text-slate-200'}">
            <div class="leading-tight font-extrabold">${d}</div>
            <div class="text-[9px] font-normal opacity-75">${dayShortNames[dayOfWeek]}</div>
          </th>
        `;
      }
      headerHtml += `</tr>`;
      el.excelTableHead.innerHTML = headerHtml;

      // 2. Build Rows for all 17 staff
      const staffList = window.REAL_NAME_LIST || (window.ALL_STAFF_OT ? Object.keys(window.ALL_STAFF_OT) : []);
      const rowsFragment = document.createDocumentFragment();
      let matchedCount = 0;

      staffList.forEach(realName => {
        const staffObj = window.getResolvedStaff(realName);
        const nickname = staffObj.nickname || '';

        // Search Keyword Filter
        if (filter) {
          const matchReal = realName.toLowerCase().includes(filter);
          const matchNick = nickname.toLowerCase().includes(filter);
          if (!matchReal && !matchNick) return;
        }

        matchedCount++;

        const isCurrentUser = (realName === currentStaff.realName || (nickname && nickname === currentStaff.nickname));
        const otObj = (window.ALL_STAFF_OT && window.ALL_STAFF_OT[realName]) ? window.ALL_STAFF_OT[realName] : {};

        // Calculate total duties
        let totalDuties = 0;
        for (let d = 1; d <= 30; d++) {
          totalDuties += (otObj[String(d)] || []).length;
        }

        const tr = document.createElement('tr');
        tr.className = `border-b border-slate-200 hover:bg-slate-50 transition-colors text-[11px] ${isCurrentUser ? 'bg-amber-50/60 font-semibold' : 'bg-white'}`;

        let rowHtml = `
          <td class="p-2 border-b border-r border-slate-200 sticky-col-1 whitespace-nowrap ${isCurrentUser ? 'bg-amber-50 text-amber-950' : 'bg-white text-slate-900'}">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold truncate">${realName}</span>
              ${nickname ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isCurrentUser ? 'bg-amber-200/90 text-amber-900' : 'bg-slate-100 text-coral-600'}">(${nickname})</span>` : ''}
              ${isCurrentUser ? `<span class="px-1.5 py-0.2 rounded-full bg-coral-500 text-white text-[9px] font-black">ฉัน</span>` : ''}
            </div>
          </td>
          <td class="p-1 text-center border-b border-r border-slate-200 ${isCurrentUser ? 'bg-amber-50/80' : 'bg-slate-50/70'}">
            <span class="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-black ${totalDuties > 0 ? 'bg-coral-50 border border-coral-200 text-coral-700' : 'text-slate-300'}">
              ${totalDuties}
            </span>
          </td>
        `;

        for (let d = 1; d <= 30; d++) {
          const dayOfWeek = (d - 1) % 7;
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          const duties = otObj[String(d)] || [];

          if (duties.length > 0) {
            let chipsHtml = '';
            duties.forEach(duty => {
              const b = getDutyBadge(duty.category || duty.name || duty.shift);
              chipsHtml += `<span class="px-1 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap leading-none shadow-2xs ${b.cls}">${b.label}</span>`;
            });
            rowHtml += `
              <td class="p-1 text-center border-b border-r border-slate-200 ${isWeekend ? 'bg-rose-50/50' : 'bg-amber-50/20'} min-w-[36px]">
                <div class="flex flex-col gap-0.5 items-center justify-center">
                  ${chipsHtml}
                </div>
              </td>
            `;
          } else {
            rowHtml += `
              <td class="p-1 text-center border-b border-r border-slate-200 ${isWeekend ? 'bg-rose-50/20 text-slate-300' : 'text-slate-200'} min-w-[36px]">
                <span class="text-slate-300 text-[10px] select-none">-</span>
              </td>
            `;
          }
        }

        tr.innerHTML = rowHtml;
        rowsFragment.appendChild(tr);
      });

      if (matchedCount === 0) {
        el.excelTableBody.innerHTML = `<tr><td colspan="32" class="p-8 text-center text-slate-400 font-medium">ไม่พบเจ้าหน้าที่ตรงกับคำค้นหา "${filter}"</td></tr>`;
      } else {
        el.excelTableBody.appendChild(rowsFragment);
      }

      if (el.excelResultCountLabel) {
        el.excelResultCountLabel.textContent = `กำลังแสดง ${matchedCount} คน (รวม 17 คน)`;
      }
      return;
    }

    // ========================================================
    // MODE 2: DETAILED MODE (Grouped by Shift Type from CSV)
    // ========================================================
    const rawCsv = window.RAW_SOURCE_CSV || '';
    if (!rawCsv) {
      el.excelTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">ไม่มีข้อมูลตารางเวร</td></tr>`;
      return;
    }

    const lines = rawCsv.split(/\r?\n/);
    if (lines.length < 4) return;

    // Header Titles & Dates from raw CSV lines
    const headerCols = lines[1].split(',');
    const dayNameCols = lines[2].split(',');

    let detailedHeaderHtml = `
      <tr class="bg-slate-900 text-white text-[11px] font-bold sticky top-0 z-20">
        <th class="p-2 border border-slate-700 sticky-col-1 whitespace-nowrap min-w-[130px] max-w-[160px]">ชื่อ - สกุล</th>
        <th class="p-2 border border-slate-700 whitespace-nowrap min-w-[110px]">ประเภทเวร</th>
        <th class="p-1 border border-slate-700 text-center whitespace-nowrap min-w-[40px]">รวม</th>
    `;

    for (let c = 5; c <= 34; c++) {
      const dateNum = headerCols[c] ? headerCols[c].trim() : '';
      const dayName = dayNameCols[c] ? dayNameCols[c].trim() : '';
      const isWeekend = (dayName === 'เสาร์' || dayName === 'อาทิต');
      detailedHeaderHtml += `
        <th class="p-1 text-center border border-slate-700 min-w-[34px] ${isWeekend ? 'bg-rose-950/80 text-rose-200' : 'bg-slate-800 text-slate-200'}">
          <div class="leading-tight font-extrabold">${dateNum}</div>
          <div class="text-[9px] font-normal opacity-75">${dayName}</div>
        </th>
      `;
    }
    detailedHeaderHtml += `</tr>`;
    el.excelTableHead.innerHTML = detailedHeaderHtml;

    const rowsFragment = document.createDocumentFragment();
    let rowCount = 0;

    for (let r = 4; r < lines.length; r++) {
      const line = lines[r];
      if (!line || !line.trim()) continue;
      const parts = line.split(',');
      const name = (parts[0] || '').trim();
      const type = (parts[1] || '').trim();
      const shift = (parts[2] || '').trim();

      if (!name || (!type && !shift)) continue;

      // Filter by search keyword (supports Real Name, Nickname, Shift Type)
      const staffInfo = window.getResolvedStaff(name);
      const nickname = (staffInfo && staffInfo.nickname) ? staffInfo.nickname.toLowerCase() : '';
      if (filter && !name.toLowerCase().includes(filter) && !nickname.includes(filter) && !type.toLowerCase().includes(filter) && !shift.toLowerCase().includes(filter)) {
        continue;
      }

      // Count duties in this row
      let rowDutyCount = 0;
      for (let c = 5; c <= 34; c++) {
        if ((parts[c] || '').trim() === '1') {
          rowDutyCount++;
        }
      }

      // Filter out empty rows if checkbox is checked
      if (state.excelHideEmptyRows && rowDutyCount === 0) {
        continue;
      }

      rowCount++;
      const isCurrentUser = (name === currentStaff.realName || name.includes(currentStaff.nickname));

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-200 hover:bg-slate-50 transition-colors text-[11px] ${isCurrentUser ? 'bg-amber-50/40' : 'bg-white'}`;

      let rowHtml = `
        <td class="p-2 border border-slate-200 sticky-col-1 font-bold whitespace-nowrap ${isCurrentUser ? 'bg-amber-50 text-amber-950' : 'bg-white text-slate-900'}">
          ${name}
        </td>
        <td class="p-1.5 border border-slate-200 whitespace-nowrap bg-white">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${shift.includes('ดึก') ? 'bg-purple-100 text-purple-900 border border-purple-200' : shift.includes('บ่าย') ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-sky-100 text-sky-900 border border-sky-200'}">
            ${type} ${shift}
          </span>
        </td>
        <td class="p-1 border border-slate-200 text-center font-black ${rowDutyCount > 0 ? 'text-coral-600 bg-coral-50/50' : 'text-slate-300'}">
          ${rowDutyCount}
        </td>
      `;

      for (let c = 5; c <= 34; c++) {
        const val = (parts[c] || '').trim();
        const dayName = dayNameCols[c] ? dayNameCols[c].trim() : '';
        const isWeekend = (dayName === 'เสาร์' || dayName === 'อาทิต');

        if (val === '1') {
          rowHtml += `
            <td class="p-1 text-center border border-slate-200 bg-amber-100/90 font-black text-amber-900 min-w-[34px]">
              ●
            </td>
          `;
        } else {
          rowHtml += `
            <td class="p-1 text-center border border-slate-200 ${isWeekend ? 'bg-rose-50/40 text-slate-300' : 'text-slate-200'} min-w-[34px]">
              ·
            </td>
          `;
        }
      }

      tr.innerHTML = rowHtml;
      rowsFragment.appendChild(tr);
    }

    if (rowCount === 0) {
      el.excelTableBody.innerHTML = `<tr><td colspan="34" class="p-8 text-center text-slate-400 font-medium">ไม่พบแถวกะเวรที่ค้นหา</td></tr>`;
    } else {
      el.excelTableBody.appendChild(rowsFragment);
    }

    if (el.excelResultCountLabel) {
      el.excelResultCountLabel.textContent = `กำลังแสดง ${rowCount} กะเวร ${state.excelHideEmptyRows ? '(ซ่อนแถว 0 เวร)' : ''}`;
    }
  }

  // ==========================================
  // USER SWITCHER & NAME MAPPING INTERFACE
  // ==========================================
  function setUserModalTab(tab) {
    state.activeUserModalTab = tab;
    
    // Reset all tabs
    [el.tabSwitchUserBtn, el.tabNameMappingBtn, el.tabAdminBtn].forEach(b => {
      if (b) {
        b.className = 'flex-1 py-1.5 rounded-lg font-bold transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center space-x-1';
      }
    });
    [el.tabContentSwitchUser, el.tabContentNameMapping, el.tabContentAdmin].forEach(c => {
      if (c) c.classList.add('hidden');
    });

    const activeClass = 'flex-1 py-1.5 rounded-lg font-bold transition-all bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm flex items-center justify-center space-x-1';

    if (tab === 'switch') {
      if (el.tabSwitchUserBtn) el.tabSwitchUserBtn.className = activeClass;
      if (el.tabContentSwitchUser) el.tabContentSwitchUser.classList.remove('hidden');
    } else if (tab === 'mapping') {
      if (el.tabNameMappingBtn) el.tabNameMappingBtn.className = activeClass;
      if (el.tabContentNameMapping) el.tabContentNameMapping.classList.remove('hidden');
      renderNameMappingSetup();
    } else if (tab === 'admin') {
      if (el.tabAdminBtn) el.tabAdminBtn.className = activeClass;
      if (el.tabContentAdmin) el.tabContentAdmin.classList.remove('hidden');
      renderAdminDashboard();
    }
  }

  function lockAdmin() {
    state.isAdmin = false;
    sessionStorage.removeItem('crh_is_admin');
    if (el.adminLockBadge) el.adminLockBadge.textContent = '🔒';
    renderAdminDashboard();
    renderNameMappingSetup();
  }

  function renderUserModalContent() {
    // Current user display
    const staff = window.getResolvedStaff(state.currentUser);
    if (el.currentUserDisplayLabel) {
      el.currentUserDisplayLabel.textContent = staff.displayName;
    }
    if (el.currentUserPairedBadge) {
      if (staff.isPaired) {
        el.currentUserPairedBadge.className = 'ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold';
        el.currentUserPairedBadge.textContent = 'จับคู่ชื่อแล้ว';
      } else {
        el.currentUserPairedBadge.className = 'ml-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold';
        el.currentUserPairedBadge.textContent = 'ยังไม่ได้จับคู่';
      }
    }

    if (el.adminLockBadge) {
      el.adminLockBadge.textContent = state.isAdmin ? '🛡️' : '🔒';
    }

    renderStaffSelectorGrid();
    renderNameMappingSetup();
    if (state.activeUserModalTab === 'admin') {
      renderAdminDashboard();
    }
  }

  function showOnboardingModal() {
    if (!el.onboardingModal) return;

    // Populate nicknames
    if (el.onboardingNicknameSelect) {
      let nickHtml = `<option value="" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100">-- กรุณาเลือกชื่อเล่นของคุณ --</option>`;
      const currentMap = window.getNameMapping();
      window.NICKNAME_LIST.forEach(nick => {
        const paired = currentMap[nick] ? `(จับคู่: คุณ${currentMap[nick]})` : `(ยังไม่จับคู่)`;
        nickHtml += `<option value="${nick}" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100">คุณ${nick} ${paired}</option>`;
      });
      el.onboardingNicknameSelect.innerHTML = nickHtml;
    }

    // Populate real names
    if (el.onboardingRealNameSelect) {
      let realHtml = `<option value="" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100">-- เลือกชื่อ-นามสกุลจริงของคุณ --</option>`;
      window.REAL_NAME_LIST.forEach(rn => {
        realHtml += `<option value="${rn}" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100">คุณ${rn}</option>`;
      });
      el.onboardingRealNameSelect.innerHTML = realHtml;
    }

    if (el.onboardingRealNameSection) el.onboardingRealNameSection.classList.add('hidden');
    if (el.onboardingSubmitBtn) {
      el.onboardingSubmitBtn.disabled = true;
      el.onboardingSubmitBtn.className = 'w-full py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed transition-all';
      el.onboardingSubmitBtn.textContent = 'กรุณาเลือกชื่อของคุณก่อน';
    }

    openModalWithHistory(el.onboardingModal);
  }

  function renderStaffSelectorGrid() {
    if (!el.staffListGrid) return;
    el.staffListGrid.innerHTML = '';

    const listToRender = (state.staffFilterMode === 'nickname')
      ? window.NICKNAME_LIST
      : window.REAL_NAME_LIST;

    listToRender.forEach(ident => {
      const staffInfo = window.getResolvedStaff(ident);
      const isSelected = (ident === state.currentUser || staffInfo.nickname === state.currentUser || staffInfo.realName === state.currentUser);

      const card = document.createElement('button');
      card.className = `p-3 rounded-2xl border text-left transition-all ${
        isSelected
          ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-400 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300 dark:ring-rose-500/20'
          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
      }`;

      let subtitle = '';
      if (staffInfo.isPaired) {
        subtitle = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">✓ ${state.staffFilterMode === 'nickname' ? staffInfo.realName : staffInfo.nickname}</span>`;
      } else {
        subtitle = `<span class="text-slate-400 dark:text-slate-500">(ยังไม่จับคู่)</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-slate-900 dark:text-white">${ident}</span>
          ${isSelected ? '<span class="w-2 h-2 rounded-full bg-rose-500"></span>' : ''}
        </div>
        <div class="text-[10px] truncate">${subtitle}</div>
      `;

      card.addEventListener('click', () => {
        switchUser(ident);
        closeModalWithHistory(el.userModal);
      });

      el.staffListGrid.appendChild(card);
    });
  }

  function renderNameMappingSetup() {
    if (!el.nameMappingTableContainer) return;
    el.nameMappingTableContainer.innerHTML = '';

    const currentMap = window.getNameMapping();

    // Collaborative Notice Banner for All Staff
    if (el.mappingAdminBanner) {
      el.mappingAdminBanner.className = 'p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-300 text-xs flex items-center space-x-2.5';
      el.mappingAdminBanner.innerHTML = `
        <span class="text-base shrink-0">🤝</span>
        <div>
          <div class="font-bold">จับคู่ชื่อร่วมกัน (ซิงค์ฐานข้อมูลกลาง)</div>
          <div class="text-[11px] text-sky-700 dark:text-sky-400">เจ้าหน้าที่ทุกคนสามารถช่วยกันเลือกจับคู่ชื่อตนเองหรือเพื่อนได้ เมื่อกดบันทึก ข้อมูลจะซิงค์ให้ทุกคนเห็นตรงกันทันที</div>
        </div>
      `;
    }

    // Save button & reset button enabled for all staff
    if (el.saveMappingBtn) {
      el.saveMappingBtn.disabled = false;
      el.saveMappingBtn.className = 'px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold text-xs shadow-md shadow-coral-500/20 active:scale-95 transition-all cursor-pointer';
      el.saveMappingBtn.textContent = '💾 บันทึกขึ้นระบบกลาง (Cloud)';
    }
    if (el.resetMappingBtn) {
      el.resetMappingBtn.style.display = 'block';
    }

    window.NICKNAME_LIST.forEach(nickname => {
      const assignedRealName = currentMap[nickname] || '';
      const isEm = (nickname === 'เอ็ม');

      const row = document.createElement('div');
      row.className = 'p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col space-y-1.5';

      let optionsHtml = `<option value="" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100">(ยังไม่ระบุชื่อจริง)</option>`;
      window.REAL_NAME_LIST.forEach(rn => {
        const isSelected = (rn === assignedRealName);
        optionsHtml += `<option value="${rn}" class="bg-white dark:bg-[#131b26] text-slate-900 dark:text-slate-100" ${isSelected ? 'selected' : ''}>${rn}</option>`;
      });

      let controlHtml = '';
      if (isEm) {
        controlHtml = `<input type="text" disabled value="จุรีพร ผาบสุวรรณ์" class="w-full bg-slate-200/70 dark:bg-white/10 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold cursor-not-allowed">`;
      } else {
        controlHtml = `
          <select data-nickname="${nickname}" class="mapping-select w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-coral-500">
            ${optionsHtml}
          </select>
        `;
      }

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center justify-center text-slate-800 dark:text-white">
              ${nickname.substring(0, 1)}
            </span>
            <span class="text-xs font-bold text-slate-900 dark:text-white">${nickname}</span>
          </div>
          ${isEm 
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">ยืนยัน 100%</span>' 
            : assignedRealName 
              ? '<span class="text-[10px] font-semibold text-sky-600 dark:text-sky-400">จับคู่แล้ว</span>' 
              : '<span class="text-[10px] text-slate-400">ยังไม่จับคู่</span>'}
        </div>
        <div>
          ${controlHtml}
        </div>
      `;

      el.nameMappingTableContainer.appendChild(row);
    });
  }

  async function renderAdminDashboard() {
    const isAdmin = state.isAdmin;

    if (el.adminLockBadge) {
      el.adminLockBadge.textContent = isAdmin ? '🛡️' : '🔒';
    }

    if (!isAdmin) {
      if (el.adminLockedView) el.adminLockedView.classList.remove('hidden');
      if (el.adminUnlockedView) el.adminUnlockedView.classList.add('hidden');
      if (el.adminPinInput) el.adminPinInput.value = '';
      return;
    }

    // Unlocked view
    if (el.adminLockedView) el.adminLockedView.classList.add('hidden');
    if (el.adminUnlockedView) el.adminUnlockedView.classList.remove('hidden');

    // Load configs into inputs
    const cfg = CloudDB.getConfig();
    if (el.supabaseUrlInput && !el.supabaseUrlInput.value) el.supabaseUrlInput.value = cfg.url;
    if (el.supabaseKeyInput && !el.supabaseKeyInput.value) el.supabaseKeyInput.value = cfg.key;

    // Update cloud status badge
    if (el.adminCloudStatusBadge) {
      if (CloudDB.isConfigured()) {
        el.adminCloudStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
        el.adminCloudStatusBadge.textContent = '☁️ ซิงค์ Cloud (Supabase) เรียบร้อย';
      } else {
        el.adminCloudStatusBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
        el.adminCloudStatusBadge.textContent = '💾 โหมดเครื่องส่วนตัว (Local)';
      }
    }

    // Fetch and display Analytics
    const stats = await CloudDB.getAnalyticsSummary();
    if (el.adminTotalViews) el.adminTotalViews.textContent = stats.totalViews;
    if (el.adminUniqueUsers) el.adminUniqueUsers.textContent = stats.uniqueUsers;

    // Render Recent Visitors
    if (el.adminRecentVisitorsList) {
      el.adminRecentVisitorsList.innerHTML = '';
      if (!stats.recentLogs || stats.recentLogs.length === 0) {
        el.adminRecentVisitorsList.innerHTML = `<div class="text-[11px] text-slate-400 italic p-2 text-center">ยังไม่มีประวัติการเข้าชม</div>`;
      } else {
        stats.recentLogs.forEach(log => {
          const row = document.createElement('div');
          row.className = 'p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]';
          
          const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
          const dateStr = log.created_at ? new Date(log.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
          
          row.innerHTML = `
            <div class="flex items-center space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <span class="font-bold text-slate-800 dark:text-slate-200">คุณ${log.active_user || 'ไม่ระบุ'}</span>
            </div>
            <div class="text-slate-400 font-mono text-[10px]">
              ${dateStr} ${timeStr}
            </div>
          `;
          el.adminRecentVisitorsList.appendChild(row);
        });
      }
    }
  }

  async function saveNameMappingFromUI() {
    const selects = el.nameMappingTableContainer.querySelectorAll('.mapping-select');
    const newMap = { "เอ็ม": "จุรีพร ผาบสุวรรณ์" };

    selects.forEach(sel => {
      const nick = sel.dataset.nickname;
      const val = sel.value.trim();
      if (val) {
        newMap[nick] = val;
      }
    });

    const res = await CloudDB.saveNameMappings(newMap);
    loadScheduleData();
    renderAll();
    renderUserModalContent();

    if (res.cloud) {
      alert('🎉 บันทึกการจับคู่ชื่อขึ้นระบบกลางเรียบร้อยแล้ว!\nเพื่อนร่วมงานทุกคนจะเห็นชื่อเล่นที่จับคู่ตรงกันทันทีครับ');
    } else {
      alert('💾 บันทึกในเครื่องเรียบร้อยแล้ว!\n(หากต้องการให้เพื่อนร่วมงานเห็นเหมือนกัน ให้เชื่อมต่อ Supabase ในแท็บ "สถิติ/แอดมิน" ครับ)');
    }
  }

  function switchUser(identifier) {
    state.currentUser = identifier;
    localStorage.setItem('crh_active_user', identifier);
    CloudDB.logVisit(identifier);
    loadScheduleData();
    renderAll();
  }

  // ==========================================
  // NOTE & DAY DETAIL MODALS
  // ==========================================
  function openNoteModal(date) {
    state.activeEditingDate = date;
    const day = state.scheduleList[date - 1];
    if (!day) return;

    if (el.noteModalDateLabel) {
      el.noteModalDateLabel.textContent = `วัน${day.dayName}ที่ ${day.date} พฤศจิกายน 2569`;
    }
    populateSwapStaffSelect();

    const existing = state.customNotes[date];
    if (existing) {
      setNoteType(existing.type || 'leave');
      if (existing.type === 'leave' && el.leaveReasonSelect) {
        el.leaveReasonSelect.value = existing.title || 'ลาพักร้อน';
      }
      if (existing.type === 'swap' && el.swapTargetSelect) {
        el.swapTargetSelect.value = existing.swapWith || 'เต่า';
      }
      if (el.noteTextInput) el.noteTextInput.value = existing.note || '';
      if (el.deleteNoteBtn) el.deleteNoteBtn.classList.remove('hidden');
    } else {
      setNoteType('leave');
      if (el.noteTextInput) el.noteTextInput.value = '';
      if (el.deleteNoteBtn) el.deleteNoteBtn.classList.add('hidden');
    }

    openModalWithHistory(el.noteModal);
  }

  function setNoteType(type) {
    state.activeNoteType = type;
    el.noteTypePills.forEach(pill => {
      if (pill.dataset.type === type) {
        pill.classList.add('bg-coral-50', 'border-coral-400', 'text-coral-700');
        pill.classList.remove('border-slate-200');
      } else {
        pill.classList.remove('bg-coral-50', 'border-coral-400', 'text-coral-700');
        pill.classList.add('border-slate-200');
      }
    });

    if (type === 'leave') {
      el.leaveReasonContainer.classList.remove('hidden');
      el.swapTargetContainer.classList.add('hidden');
    } else if (type === 'swap') {
      el.leaveReasonContainer.classList.add('hidden');
      el.swapTargetContainer.classList.remove('hidden');
    } else {
      el.leaveReasonContainer.classList.add('hidden');
      el.swapTargetContainer.classList.add('hidden');
    }
  }

  function populateSwapStaffSelect() {
    if (!el.swapTargetSelect) return;
    el.swapTargetSelect.innerHTML = '';
    window.NICKNAME_LIST.forEach(nick => {
      if (nick !== state.currentUser) {
        const opt = document.createElement('option');
        opt.value = nick;
        opt.textContent = `${nick}`;
        el.swapTargetSelect.appendChild(opt);
      }
    });
  }

  function saveNoteData() {
    const date = state.activeEditingDate;
    if (!date) return;

    let noteObj = {
      type: state.activeNoteType,
      date: date,
      note: el.noteTextInput.value.trim()
    };

    if (state.activeNoteType === 'leave') {
      noteObj.title = el.leaveReasonSelect.value;
    } else if (state.activeNoteType === 'swap') {
      noteObj.title = 'สลับวันหยุด';
      noteObj.swapWith = el.swapTargetSelect.value;
    } else {
      noteObj.title = 'บันทึกทั่วไป';
    }

    state.customNotes[date] = noteObj;
    localStorage.setItem('crh_custom_day_notes', JSON.stringify(state.customNotes));

    loadScheduleData();
    renderAll();
    closeModalWithHistory(el.noteModal);
  }

  function deleteNoteData() {
    const date = state.activeEditingDate;
    if (!date) return;

    delete state.customNotes[date];
    localStorage.setItem('crh_custom_day_notes', JSON.stringify(state.customNotes));

    loadScheduleData();
    renderAll();
    closeModalWithHistory(el.noteModal);
  }

  // Day Detail Modal
  function openDayDetailModal(day) {
    if (!el.dayDetailModal || !el.dayDetailContent) return;

    const sub = day.substitutionInfo;
    const otList = day.otDuties || [];
    const nightDuties = otList.filter(ot => ot.name.includes("ดึก") || (ot.shiftTime && ot.shiftTime.includes("ดึก")) || (ot.shift && ot.shift.includes("ดึก")));
    const afternoonDuties = otList.filter(ot => !nightDuties.includes(ot) && (ot.name.includes("บ่าย") || (ot.shiftTime && ot.shiftTime.includes("บ่าย")) || (ot.shift && ot.shift.includes("บ่าย"))));
    const otherOtDuties = otList.filter(ot => !nightDuties.includes(ot) && !afternoonDuties.includes(ot));

    const hasNightShift = nightDuties.length > 0;

    // Helper for regular duty HTML
    function getRegularDutyHtml() {
      if (day.regularDuty) {
        let subNoticeHtml = '';
        if (sub && sub.isViewerSubstitute) {
          const target = sub.targetStation || 'จุดเข้าเวร';
          const replacedName = sub.nightShiftNickname ? `คุณ${sub.nightShiftNickname}` : (sub.nightShiftRealName ? `คุณ${sub.nightShiftRealName}` : '');
          subNoticeHtml = `
            <div class="mt-2.5 p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs font-semibold flex items-center space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
              <span>ปฏิบัติงานแทน${replacedName ? ` : <strong class="text-sky-700 dark:text-sky-300 font-bold">${replacedName}</strong>` : ''} ➔ ไปเข้า <strong class="text-sky-800 dark:text-sky-200 font-bold">${target}</strong></span>
            </div>
          `;
        } else if (sub && sub.isViewerNightShift) {
          const subName = sub.substituteNickname ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';
          subNoticeHtml = `
            <div class="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center space-x-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>มีคนปฏิบัติแทน : <strong class="text-emerald-700 dark:text-emerald-300 font-bold">${subName}</strong> (เวรแทนบ่ายดึก)</span>
            </div>
          `;
        }

        return `
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
            <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">เวลาปกติ</div>
            <div class="text-lg font-bold text-slate-900 dark:text-white mt-1">${day.regularDuty.title}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">${day.regularDuty.location}</div>
            ${subNoticeHtml}
          </div>
        `;
      } else if (day.isDayOff) {
        return `
          <div class="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-rose-700 dark:text-rose-300">
            <div class="font-bold text-base text-rose-900 dark:text-rose-200">วันหยุดประจำสัปดาห์</div>
            <div class="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-medium">ไม่มีงานเวลาปกติ</div>
          </div>
        `;
      } else {
        return `
          <div class="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-800 dark:text-amber-300">
            <div class="font-bold text-base text-amber-900 dark:text-amber-200">เวรเฉพาะวันหยุด</div>
            <div class="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">ไม่มีงานเวลาปกติ</div>
          </div>
        `;
      }
    }

    // Helper for rendering an OT list
    function renderDutiesBlock(duties, fallbackEmptyText = '') {
      if (!duties || duties.length === 0) {
        return fallbackEmptyText ? `<div class="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-400 text-xs">${fallbackEmptyText}</div>` : '';
      }
      return duties.map(ot => {
        const isNight = ot.name.includes("ดึก") || ot.shiftTime === "กะดึก" || (ot.shift && ot.shift.includes("ดึก"));
        if (isNight) {
          return `
            <div class="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/25 text-purple-900 dark:text-purple-200 flex items-center justify-between">
              <div class="flex items-center space-x-2.5">
                <span class="text-lg">🌙</span>
                <div>
                  <div class="text-base font-bold text-purple-900 dark:text-purple-100">${ot.name}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">เวรดึก (00:00 - 08:00 น.) • เข้างานเที่ยงคืน</div>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs shadow-xs">★ ไฮไลท์</span>
            </div>
          `;
        } else {
          return `
            <div class="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between text-xs">
              <div>
                <div class="font-bold text-sm text-amber-950 dark:text-amber-200">${ot.name}</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">${ot.shiftTime || ot.category || (ot.name.includes("บ่าย") ? 'เวรบ่าย 16:00 - 24:00 น.' : 'เวรนอกเวลา')}</div>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-white/10 font-bold text-xs shadow-xs">ตามตาราง</span>
            </div>
          `;
        }
      }).join('');
    }

    let noteHtml = '';
    if (day.userNote) {
      const isSwap = (day.userNote.type === 'swap');
      noteHtml = `
        <div class="p-3 rounded-2xl ${isSwap ? 'bg-blue-50 border border-blue-100 text-blue-900' : 'bg-rose-50 border border-rose-100 text-rose-900'} mt-2">
          <div class="text-xs font-bold">${isSwap ? `สลับวันหยุดกับ: ${day.userNote.swapWith}` : day.userNote.title}</div>
          ${day.userNote.note ? `<div class="text-xs opacity-75 mt-0.5">${day.userNote.note}</div>` : ''}
        </div>
      `;
    }

    // BUILD CHRONOLOGICAL BODY
    let bodyHtml = '';

    if (hasNightShift) {
      // 1. IPD ดึก (00:00 - 08:00 น.) -> HIGHLIGHT AT THE TOP!
      bodyHtml += `
        <div>
          <div class="flex flex-wrap items-center justify-between gap-1 mb-1.5">
            <span class="text-xs font-bold text-purple-600 dark:text-purple-300 flex items-center space-x-1.5">
              <span>🌙</span>
              <span>เวรดึก (00:00 - 08:00 น.)</span>
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">เข้างานเที่ยงคืน</span>
          </div>
          <div class="space-y-2">
            ${renderDutiesBlock(nightDuties)}
          </div>
        </div>
      `;

      // 2. เวลาปกติ (08:00 - 16:00 น.) -> กลางวัน มีคนปฏิบัติแทน : คุณปอ (เวรแทนบ่ายดึก)
      bodyHtml += `
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">เวลาปกติ (08:00 - 16:00 น.)</div>
          ${getRegularDutyHtml()}
        </div>
      `;

      // 3. IPD บ่าย (16:00 - 24:00 น.) / เวรนอกเวลาช่วงบ่าย
      if (afternoonDuties.length > 0 || otherOtDuties.length > 0) {
        bodyHtml += `
          <div>
            <div class="text-xs font-semibold text-slate-400 mb-1">เวรนอกเวลาช่วงบ่าย/เย็น (16:00 - 24:00 น.)</div>
            <div class="space-y-1.5">
              ${renderDutiesBlock([...afternoonDuties, ...otherOtDuties])}
            </div>
          </div>
        `;
      }
    } else {
      // Standard chronological flow: เวลาปกติ -> เวรนอกเวลา
      bodyHtml += `
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">เวลาปกติ</div>
          ${getRegularDutyHtml()}
        </div>

        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">เวรนอกเวลา</div>
          <div class="space-y-1.5">
            ${renderDutiesBlock(otList, 'ไม่มีเวรนอกเวลา')}
          </div>
        </div>
      `;
    }

    if (day.userNote) {
      bodyHtml += `
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">บันทึกพิเศษ</div>
          ${noteHtml}
        </div>
      `;
    }

    el.dayDetailContent.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h4 class="text-base font-bold text-slate-900 leading-tight">วัน${day.dayName}ที่ ${day.date} พ.ย. 2569</h4>
          <p class="text-xs text-slate-400 mt-0.5">ผู้ปฏิบัติงาน: คุณ${state.currentUser}</p>
        </div>
        <button onclick="window.triggerEditNote(${day.date})" class="shrink-0 px-2.5 py-1.5 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-[11px] font-semibold hover:bg-coral-100 transition-colors">
          บันทึกวันลา / สลับวันหยุด
        </button>
      </div>

      <div class="space-y-3.5">
        ${bodyHtml}
      </div>
    `;

    openModalWithHistory(el.dayDetailModal);
  }

  // ==========================================
  // EXCEL UPLOADER
  // ==========================================
  function setupSheetUploader() {
    if (!el.excelFileInput || !el.dropZone) return;

    el.dropZone.addEventListener('click', () => el.excelFileInput.click());
    el.excelFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) processUploadedFile(e.target.files[0]);
    });

    el.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropZone.classList.add('border-coral-400', 'bg-coral-50/30');
    });

    el.dropZone.addEventListener('dragleave', () => {
      el.dropZone.classList.remove('border-coral-400', 'bg-coral-50/30');
    });

    el.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropZone.classList.remove('border-coral-400', 'bg-coral-50/30');
      if (e.dataTransfer.files.length > 0) {
        processUploadedFile(e.dataTransfer.files[0]);
      }
    });
  }

  function processUploadedFile(file) {
    if (!el.uploadStatus) return;
    el.uploadStatus.innerHTML = `<span class="text-slate-600">กำลังอ่านไฟล์ ${file.name}...</span>`;

    const reader = new FileReader();
    if (window.XLSX) {
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csvOutput = XLSX.utils.sheet_to_csv(firstSheet);

          window.RAW_SOURCE_CSV = csvOutput;

          el.uploadStatus.innerHTML = `
            <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              เชื่อมโยงข้อมูลจาก ${file.name} เรียบร้อยแล้ว!
            </div>
          `;
          setTimeout(() => {
            closeModalWithHistory(el.uploadExcelModal);
            renderExcelTable();
            renderAll();
          }, 1200);
        } catch (err) {
          el.uploadStatus.innerHTML = `<span class="text-rose-600 text-xs">เกิดข้อผิดพลาด: ${err.message}</span>`;
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // Global window triggers
  window.triggerEditNote = function(date) {
    openNoteModal(date);
  };

  window.triggerOpenDayDetail = function(date) {
    const day = state.scheduleList[date - 1];
    if (day) openDayDetailModal(day);
  };

  // Launch on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// ==========================================
// PWA INSTALLATION BANNER & IOS GUIDE
// ==========================================
(function() {
  let deferredPrompt = null;
  const pwaBanner = document.getElementById('pwaInstallBanner');
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');
  const closePwaBannerBtn = document.getElementById('closePwaBannerBtn');
  const iosModal = document.getElementById('iosInstallModal');
  const closeIosBtn = document.getElementById('closeIosInstallBtn');

  function initPWA() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      if (pwaBanner) pwaBanner.classList.add('hidden');
      return;
    }

    if (localStorage.getItem('crh_fs_pwa_banner_dismissed') === '1') {
      if (pwaBanner) pwaBanner.classList.add('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (pwaBanner) pwaBanner.classList.remove('hidden');
    });

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              if (pwaBanner) pwaBanner.classList.add('hidden');
            }
            deferredPrompt = null;
          });
        } else {
          if (iosModal) iosModal.classList.remove('hidden');
        }
      });
    }

    if (closePwaBannerBtn) {
      closePwaBannerBtn.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.classList.add('hidden');
        localStorage.setItem('crh_fs_pwa_banner_dismissed', '1');
      });
    }

    if (closeIosBtn) {
      closeIosBtn.addEventListener('click', () => {
        if (iosModal) iosModal.classList.add('hidden');
      });
    }

    if (iosModal) {
      iosModal.addEventListener('click', (e) => {
        if (e.target === iosModal) iosModal.classList.add('hidden');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
  } else {
    initPWA();
  }
})();
