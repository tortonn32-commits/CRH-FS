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
    activeUserModalTab: 'switch', // 'switch' | 'mapping'
    staffFilterMode: 'nickname', // 'nickname' | 'realname'

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

  function init() {
    cacheElements();
    loadScheduleData();
    bindEvents();
    setupAndroidBackNavigation();
    setupPinchToZoom();
    renderAll();
    setupSheetUploader();
  }

  function cacheElements() {
    // Header
    el.headerFullName = document.getElementById('headerFullName');
    el.headerNickname = document.getElementById('headerNickname');
    el.openUserModalBtn = document.getElementById('openUserModalBtn');

    // Hero Today Card
    el.todayDateHeading = document.getElementById('todayDateHeading');
    el.todayDayOfWeekBadge = document.getElementById('todayDayOfWeekBadge');
    el.todayStationTitle = document.getElementById('todayStationTitle');
    el.todayLocationDetail = document.getElementById('todayLocationDetail');
    el.todayShiftsContainer = document.getElementById('todayShiftsContainer');
    el.todayCustomNoteContainer = document.getElementById('todayCustomNoteContainer');
    el.openTodayNoteBtn = document.getElementById('openTodayNoteBtn');

    // Hero Tomorrow Card
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

    // Excel Uploader Modal
    el.uploadExcelModal = document.getElementById('uploadExcelModal');
    el.openUploadModalBtn = document.getElementById('openUploadModalBtn');
    el.closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
    el.excelFileInput = document.getElementById('excelFileInput');
    el.dropZone = document.getElementById('dropZone');
    el.uploadStatus = document.getElementById('uploadStatus');
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
  // EVENT BINDINGS
  // ==========================================
  function bindEvents() {
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

    // User Modal Tabs
    if (el.tabSwitchUserBtn && el.tabNameMappingBtn) {
      el.tabSwitchUserBtn.addEventListener('click', () => setUserModalTab('switch'));
      el.tabNameMappingBtn.addEventListener('click', () => setUserModalTab('mapping'));
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

  // TODAY CARD (WARM CORAL THEME)
  function renderTodayCard() {
    const day = state.scheduleList[state.selectedDate - 1];
    if (!day) return;

    if (el.todayDateHeading) {
      el.todayDateHeading.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;
    }
    if (el.todayDayOfWeekBadge) {
      el.todayDayOfWeekBadge.textContent = day.dayName;
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
            <span class="text-sm font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-xl border border-sky-300">
              ➔ ไปเข้า: ${target}
            </span>
          </div>
        `;
        el.todayLocationDetail.innerHTML = `
          <div class="text-xs text-sky-800 font-semibold mt-1">
            📍 ${targetLoc} ${replacedName ? `• (ไปแทน${replacedName})` : ''}
          </div>
        `;
      } else if (sub && sub.isViewerNightShift) {
        // กรณีผู้ใช้อยู่เวรดึก/บ่าย (เช่น เอ็ม วันที่ 5) -> แจ้งว่ามีคนมาแทนที่จุดปกติ
        const subName = sub.substituteNickname ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';

        el.todayStationTitle.innerHTML = `
          <div class="flex flex-wrap items-baseline gap-2">
            <span>${day.regularDuty.title}</span>
            <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-xl border border-emerald-300">
              🔄 ${subName} แทนบ่ายดึก
            </span>
          </div>
        `;
        el.todayLocationDetail.innerHTML = `
          <div class="text-xs text-emerald-800 font-semibold mt-1">
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

    // Extra / Night / Afternoon Shifts
    el.todayShiftsContainer.innerHTML = '';
    if (day.otDuties && day.otDuties.length > 0) {
      day.otDuties.forEach(ot => {
        const item = document.createElement('div');
        const isNight = ot.name.includes("ดึก") || ot.shiftTime === "กะดึก";
        item.className = `p-2.5 rounded-xl border flex items-center justify-between text-xs ${
          isNight ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`;
        item.innerHTML = `
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full ${isNight ? 'bg-purple-600' : 'bg-amber-500'} shrink-0"></span>
            <div>
              <div class="font-bold text-xs">${ot.name}</div>
              <div class="text-[10px] opacity-75 font-medium">${ot.shiftTime || ot.category}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border ${isNight ? 'border-purple-200 text-purple-700' : 'border-amber-200 text-amber-700'}">
            ตามตาราง
          </span>
        `;
        el.todayShiftsContainer.appendChild(item);
      });
    } else {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center space-x-2';
      emptyItem.innerHTML = `
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>ไม่มีเวรนอกเวลา</span>
      `;
      el.todayShiftsContainer.appendChild(emptyItem);
    }

    // User Custom Note Container
    if (day.userNote) {
      el.todayCustomNoteContainer.classList.remove('hidden');
      const isSwap = (day.userNote.type === 'swap');
      el.todayCustomNoteContainer.innerHTML = `
        <div class="p-2.5 rounded-xl ${isSwap ? 'bg-blue-50 border border-blue-200 text-blue-900' : 'bg-rose-50 border border-rose-200 text-rose-900'} text-xs flex items-center justify-between">
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

  // TOMORROW CARD (FRESH SKY BLUE THEME)
  function renderTomorrowCard() {
    const tomorrowDate = (state.selectedDate < 30) ? (state.selectedDate + 1) : 1;
    const day = state.scheduleList[tomorrowDate - 1];
    if (!day) return;

    if (el.tomorrowDateLabel) {
      el.tomorrowDateLabel.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;
    }

    if (el.tomorrowRegularStation) {
      if (day.regularDuty) {
        const sub = day.substitutionInfo;
        if (sub && sub.isViewerSubstitute) {
          const target = sub.targetStation || 'จุดเข้าเวร';
          const replacedName = sub.nightShiftNickname ? `คุณ${sub.nightShiftNickname}` : '';
          el.tomorrowRegularStation.innerHTML = `แทน บ่ายดึก <span class="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-300">➔ ${target}</span>`;
          el.tomorrowRegularLocation.textContent = `${sub.targetLocation || 'กลุ่มงานการเงิน'} ${replacedName ? `• (แทน${replacedName})` : ''}`;
        } else if (sub && sub.isViewerNightShift) {
          const subName = sub.substituteNickname ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';
          el.tomorrowRegularStation.innerHTML = `${day.regularDuty.title} <span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">(${subName} แทน)</span>`;
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
          const item = document.createElement('div');
          item.className = 'inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 ml-1 mb-1';
          item.textContent = ot.name;
          el.tomorrowOtSection.appendChild(item);
        });
      } else {
        el.tomorrowOtSection.innerHTML = `<span class="text-xs text-slate-400">ไม่มีเวรนอกเวลา</span>`;
      }
    }
  }

  // 7-DAY STRIP (CLEAN SQUARE BLOCKS - 'ตารางทำงาน' TEXT REMOVED)
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
      const isHighlighted = day.hasDuty;
      const isDayOff = day.isDayOff;
      const isToday = (index === 0);

      let cardClass = 'seven-day-card ';
      if (isToday) cardClass += 'card-today ';
      if (isHighlighted) cardClass += 'card-duty ';
      if (isDayOff) cardClass += 'card-off ';

      let mainText = '';
      let subText = '';

      if (isDayOff) {
        mainText = `<div class="text-sm font-black text-rose-500 my-auto">วันหยุด</div>`;
        subText = `<div class="text-[9px] text-slate-400">พักประจำสัปดาห์</div>`;
      } else {
        const regular = day.regularDuty ? day.regularDuty.title : '-';
        const sub = day.substitutionInfo;

        if (sub && sub.isViewerSubstitute) {
          const target = sub.targetStation || 'บ่ายดึก';
          mainText = `<div class="text-xs font-black text-sky-700 leading-tight">แทน: ${target}</div>`;
          const replacedName = sub.nightShiftNickname ? `แทน${sub.nightShiftNickname}` : '';
          subText = `<div class="text-[9px] font-bold text-sky-700 bg-sky-50 rounded px-1 py-0.5 mt-1 border border-sky-200 truncate">📍 ${replacedName || 'แทนบ่ายดึก'}</div>`;
        } else if (sub && sub.isViewerNightShift) {
          mainText = `<div class="text-xs font-bold text-slate-900 leading-tight">${regular}</div>`;
          const subName = sub.substituteNickname ? `${sub.substituteNickname} แทน` : 'มีคนแทน';
          subText = `<div class="text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded px-1 py-0.5 mt-1 border border-emerald-200 truncate">🔄 ${subName}</div>`;
        } else {
          mainText = `<div class="text-xs font-bold text-slate-900 leading-tight">${regular}</div>`;
          if (day.otDuties && day.otDuties.length > 0) {
            const shiftNames = day.otDuties.map(ot => {
              if (ot.name.includes("ดึก")) return "IPD ดึก";
              if (ot.name.includes("บ่าย")) return "IPD บ่าย";
              if (ot.name.includes("เช้า")) return "IPD เช้า";
              return ot.name;
            }).join('+');
            subText = `<div class="text-[9px] font-bold text-amber-700 bg-amber-50 rounded px-1 py-0.5 mt-1 border border-amber-200 truncate">เวร ${shiftNames}</div>`;
          } else {
            subText = `<div class="text-[9px] text-slate-400 mt-1">เวลาปกติ</div>`;
          }
        }
      }

      if (day.userNote) {
        if (day.userNote.type === 'swap') {
          subText = `<div class="text-[9px] font-bold text-blue-600 bg-blue-50 rounded px-1 py-0.5 mt-1 truncate">สลับ: ${day.userNote.swapWith}</div>`;
        } else {
          subText = `<div class="text-[9px] font-bold text-rose-600 bg-rose-50 rounded px-1 py-0.5 mt-1 truncate">${day.userNote.title}</div>`;
        }
      }

      card.className = cardClass;
      card.innerHTML = `
        <div class="text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100">
          ${day.dayName} ${day.date}
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

  // MONTH VIEW CALENDAR (MONDAY-START: จ อ พ พฤ ศ ส อา)
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

      let cellClass = 'cal-month-cell ';

      // COLOR CODING:
      // มีเวร = สีเหลือง (Yellow / Amber)
      // วันหยุด = สีแดง (Red / Coral)
      if (isSelected) {
        cellClass += 'cal-cell-today ';
      } else if (isHighlighted) {
        cellClass += 'cal-cell-duty ';
      } else if (isDayOff) {
        cellClass += 'cal-cell-off ';
      } else {
        cellClass += 'cal-cell-normal ';
      }

      cell.className = cellClass;
      cell.textContent = day.date;

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
          <div class="text-sm font-black font-mono mt-0.5">${count} <span class="text-[10px] font-normal">วัน</span></div>
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
    if (tab === 'switch') {
      el.tabSwitchUserBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm';
      el.tabNameMappingBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900';
      el.tabContentSwitchUser.classList.remove('hidden');
      el.tabContentNameMapping.classList.add('hidden');
    } else {
      el.tabNameMappingBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-sm';
      el.tabSwitchUserBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:text-slate-900';
      el.tabContentSwitchUser.classList.add('hidden');
      el.tabContentNameMapping.classList.remove('hidden');
    }
  }

  function renderUserModalContent() {
    // Current user display
    const staff = window.getResolvedStaff(state.currentUser);
    if (el.currentUserDisplayLabel) {
      el.currentUserDisplayLabel.textContent = staff.displayName;
    }
    if (el.currentUserPairedBadge) {
      if (staff.isPaired) {
        el.currentUserPairedBadge.className = 'ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold';
        el.currentUserPairedBadge.textContent = 'จับคู่ชื่อแล้ว';
      } else {
        el.currentUserPairedBadge.className = 'ml-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold';
        el.currentUserPairedBadge.textContent = 'ยังไม่ได้จับคู่';
      }
    }

    renderStaffSelectorGrid();
    renderNameMappingSetup();
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
          ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-300'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`;

      let subtitle = '';
      if (staffInfo.isPaired) {
        subtitle = `<span class="text-emerald-600 font-semibold">✓ ${state.staffFilterMode === 'nickname' ? staffInfo.realName : staffInfo.nickname}</span>`;
      } else {
        subtitle = `<span class="text-slate-400">(ยังไม่จับคู่)</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-black text-slate-900">${ident}</span>
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

    window.NICKNAME_LIST.forEach(nickname => {
      const assignedRealName = currentMap[nickname] || '';
      const isEm = (nickname === 'เอ็ม');

      const row = document.createElement('div');
      row.className = 'p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col space-y-1.5';

      let optionsHtml = `<option value="">(ยังไม่ระบุชื่อจริง)</option>`;
      window.REAL_NAME_LIST.forEach(rn => {
        const isSelected = (rn === assignedRealName);
        optionsHtml += `<option value="${rn}" ${isSelected ? 'selected' : ''}>${rn}</option>`;
      });

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 rounded-full bg-white border border-slate-200 text-xs font-black flex items-center justify-center text-slate-800">
              ${nickname.substring(0, 1)}
            </span>
            <span class="text-xs font-extrabold text-slate-900">${nickname}</span>
          </div>
          ${isEm 
            ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ยืนยัน 100%</span>' 
            : assignedRealName 
              ? '<span class="text-[10px] font-semibold text-sky-600">จับคู่แล้ว</span>' 
              : '<span class="text-[10px] text-slate-400">ยังไม่จับคู่</span>'}
        </div>
        <div>
          ${isEm 
            ? `<input type="text" disabled value="จุรีพร ผาบสุวรรณ์" class="w-full bg-slate-200/70 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold cursor-not-allowed">`
            : `<select data-nickname="${nickname}" class="mapping-select w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-coral-500">
                ${optionsHtml}
               </select>`}
        </div>
      `;

      el.nameMappingTableContainer.appendChild(row);
    });
  }

  function saveNameMappingFromUI() {
    const selects = el.nameMappingTableContainer.querySelectorAll('.mapping-select');
    const newMap = { "เอ็ม": "จุรีพร ผาบสุวรรณ์" };

    selects.forEach(sel => {
      const nick = sel.dataset.nickname;
      const val = sel.value.trim();
      if (val) {
        newMap[nick] = val;
      }
    });

    localStorage.setItem('crh_staff_name_map', JSON.stringify(newMap));
    loadScheduleData();
    renderAll();
    renderUserModalContent();
    alert('บันทึกการจับคู่ชื่อเรียบร้อยแล้ว! ข้อมูลตารางทำงานและเวรถูกรวมเข้าด้วยกันแล้ว');
  }

  function switchUser(identifier) {
    state.currentUser = identifier;
    localStorage.setItem('crh_active_user', identifier);
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

    let regularHtml = '';
    const sub = day.substitutionInfo;

    if (day.regularDuty) {
      let subNoticeHtml = '';
      if (sub && sub.isViewerSubstitute) {
        const target = sub.targetStation || 'จุดเข้าเวร';
        const targetLoc = sub.targetLocation || 'กลุ่มงานการเงิน';
        const replacedName = sub.nightShiftNickname ? `คุณ${sub.nightShiftNickname}` : (sub.nightShiftRealName ? `คุณ${sub.nightShiftRealName}` : '');
        subNoticeHtml = `
          <div class="mt-2.5 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs font-bold flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
            <span>ปฏิบัติงานแทน${replacedName ? ` : <strong class="text-sky-800 font-extrabold">${replacedName}</strong>` : ''} ➔ ไปเข้า <strong class="text-sky-900 font-black">${target}</strong></span>
          </div>
        `;
      } else if (sub && sub.isViewerNightShift) {
        const subName = sub.substituteNickname ? `คุณ${sub.substituteNickname}` : 'มีเจ้าหน้าที่';
        subNoticeHtml = `
          <div class="mt-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>มีคนปฏิบัติแทน : <strong class="text-emerald-800 font-extrabold">${subName}</strong> (เวรแทนบ่ายดึก)</span>
          </div>
        `;
      }

      regularHtml = `
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div class="text-[10px] font-semibold text-slate-400 uppercase">เวลาปกติ</div>
          <div class="text-lg font-bold text-slate-900 mt-1">${day.regularDuty.title}</div>
          <div class="text-xs text-slate-500 mt-0.5">${day.regularDuty.location}</div>
          ${subNoticeHtml}
        </div>
      `;
    } else if (day.isDayOff) {
      regularHtml = `
        <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700">
          <div class="font-bold text-rose-900">วันหยุดประจำสัปดาห์</div>
          <div class="text-xs text-rose-600 mt-0.5">ไม่มีงานเวลาปกติ</div>
        </div>
      `;
    } else {
      regularHtml = `
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800">
          <div class="font-bold text-amber-900">เวรเฉพาะวันหยุด</div>
          <div class="text-xs text-amber-700 mt-0.5">ไม่มีงานเวลาปกติ</div>
        </div>
      `;
    }

    let otHtml = '';
    if (day.otDuties && day.otDuties.length > 0) {
      otHtml = day.otDuties.map(ot => {
        const isNight = ot.name.includes("ดึก") || ot.shiftTime === "กะดึก";
        return `
          <div class="p-3 rounded-2xl ${isNight ? 'bg-purple-50 border border-purple-100 text-purple-900' : 'bg-amber-50 border border-amber-100 text-amber-900'} flex items-center justify-between text-xs">
            <div>
              <div class="font-bold">${ot.name}</div>
              <div class="text-[10px] opacity-75">${ot.shiftTime || ot.category}</div>
            </div>
            <span class="px-2 py-0.5 rounded-lg bg-white font-bold text-[10px]">ตามตาราง</span>
          </div>
        `;
      }).join('');
    } else {
      otHtml = `<div class="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">ไม่มีเวรนอกเวลา</div>`;
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

    el.dayDetailContent.innerHTML = `
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h4 class="text-base font-bold text-slate-900">วัน${day.dayName}ที่ ${day.date} พ.ย. 2569</h4>
          <p class="text-xs text-slate-400">ผู้ปฏิบัติงาน: คุณ${state.currentUser}</p>
        </div>
        <button onclick="window.triggerEditNote(${day.date})" class="px-3 py-1.5 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 text-xs font-semibold hover:bg-coral-100">
          บันทึกวันลา / สลับวันหยุด
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">เวลาปกติ</div>
          ${regularHtml}
        </div>

        <div>
          <div class="text-xs font-semibold text-slate-400 mb-1">เวรนอกเวลา</div>
          <div class="space-y-1.5">
            ${otHtml}
          </div>
        </div>

        ${day.userNote ? `
          <div>
            <div class="text-xs font-semibold text-slate-400 mb-1">บันทึกพิเศษ</div>
            ${noteHtml}
          </div>
        ` : ''}
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
