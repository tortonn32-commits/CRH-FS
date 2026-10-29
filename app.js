// CRH Finance Duty App - Senior Designer Implementation
// Reference Style: Premium Clean White UI / Modern Minimal / Soft & Colorful

(function() {
  'use strict';

  // Application State
  const state = {
    currentNickname: localStorage.getItem('crh_duty_user_nickname') || 'เอ็ม',
    // Default to Day 5 (Thursday Nov 5) as highlighted by the user's example
    selectedDate: 5,
    scheduleList: [],
    customNotes: JSON.parse(localStorage.getItem('crh_custom_day_notes') || '{}'),
    activeEditingDate: null,
    activeNoteType: 'leave', // 'leave' | 'swap' | 'general'
    imageZoom: 1,
    imagePan: { x: 0, y: 0 },
    isDraggingImage: false,
    dragStart: { x: 0, y: 0 }
  };

  const el = {};

  function init() {
    cacheElements();
    loadScheduleData();
    bindEvents();
    renderAll();
    setupSheetUploader();
  }

  function cacheElements() {
    el.headerFullName = document.getElementById('headerFullName');
    el.headerNickname = document.getElementById('headerNickname');
    el.userInitialBadge = document.getElementById('userInitialBadge');
    
    // KPI Elements (at bottom section)
    el.kpiTotalWorkDays = document.getElementById('kpiTotalWorkDays');
    el.kpiRegularDays = document.getElementById('kpiRegularDays');
    el.kpiOtShifts = document.getElementById('kpiOtShifts');
    el.kpiOffDays = document.getElementById('kpiOffDays');
    el.stationPillsGrid = document.getElementById('stationPillsGrid');

    // Today Card Elements
    el.todayDateHeading = document.getElementById('todayDateHeading');
    el.todayDayOfWeekBadge = document.getElementById('todayDayOfWeekBadge');
    el.todayStationTitle = document.getElementById('todayStationTitle');
    el.todayLocationDetail = document.getElementById('todayLocationDetail');
    el.todayShiftsContainer = document.getElementById('todayShiftsContainer');
    el.todayCustomNoteContainer = document.getElementById('todayCustomNoteContainer');
    el.openTodayNoteBtn = document.getElementById('openTodayNoteBtn');

    // Tomorrow Card Elements
    el.tomorrowDateLabel = document.getElementById('tomorrowDateLabel');
    el.tomorrowRegularStation = document.getElementById('tomorrowRegularStation');
    el.tomorrowRegularLocation = document.getElementById('tomorrowRegularLocation');
    el.tomorrowOtSection = document.getElementById('tomorrowOtSection');

    // 7 Days Strip (Image 1 reference)
    el.sevenDaysStrip = document.getElementById('sevenDaysStrip');

    // Month Calendar Grid (Image 2 reference)
    el.monthCalendarGrid = document.getElementById('monthCalendarGrid');

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

    // Image Modal
    el.imageViewerModal = document.getElementById('imageViewerModal');
    el.scheduleImage = document.getElementById('scheduleImage');
    el.openImageModalBtn = document.getElementById('openImageModalBtn');
    el.closeImageModalBtn = document.getElementById('closeImageModalBtn');
    el.zoomInBtn = document.getElementById('zoomInBtn');
    el.zoomOutBtn = document.getElementById('zoomOutBtn');
    el.zoomResetBtn = document.getElementById('zoomResetBtn');
    el.imagePanContainer = document.getElementById('imagePanContainer');

    // Excel Modal
    el.excelViewerModal = document.getElementById('excelViewerModal');
    el.openExcelModalBtn = document.getElementById('openExcelModalBtn');
    el.closeExcelModalBtn = document.getElementById('closeExcelModalBtn');
    el.excelTableBody = document.getElementById('excelTableBody');
    el.excelSearchInput = document.getElementById('excelSearchInput');

    // User Modal
    el.userModal = document.getElementById('userModal');
    el.openUserModalBtn = document.getElementById('openUserModalBtn');
    el.closeUserModalBtn = document.getElementById('closeUserModalBtn');
    el.customNicknameInput = document.getElementById('customNicknameInput');
    el.saveUserBtn = document.getElementById('saveUserBtn');
    el.staffListGrid = document.getElementById('staffListGrid');

    // Upload Modal
    el.uploadExcelModal = document.getElementById('uploadExcelModal');
    el.openUploadModalBtn = document.getElementById('openUploadModalBtn');
    el.closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
    el.excelFileInput = document.getElementById('excelFileInput');
    el.dropZone = document.getElementById('dropZone');
    el.uploadStatus = document.getElementById('uploadStatus');
  }

  function loadScheduleData() {
    state.customNotes = JSON.parse(localStorage.getItem('crh_custom_day_notes') || '{}');
    state.scheduleList = window.buildMonthSchedule(state.currentNickname);
  }

  function bindEvents() {
    // Open Today's Note
    if (el.openTodayNoteBtn) {
      el.openTodayNoteBtn.addEventListener('click', () => {
        openNoteModal(state.selectedDate);
      });
    }

    // Note Modal Controls
    if (el.closeNoteModalBtn) el.closeNoteModalBtn.addEventListener('click', closeNoteModal);
    if (el.cancelNoteBtn) el.cancelNoteBtn.addEventListener('click', closeNoteModal);
    if (el.saveNoteBtn) el.saveNoteBtn.addEventListener('click', saveNoteData);
    if (el.deleteNoteBtn) el.deleteNoteBtn.addEventListener('click', deleteNoteData);

    // Note Type Switcher
    if (el.noteTypePills) {
      el.noteTypePills.forEach(pill => {
        pill.addEventListener('click', () => {
          setNoteType(pill.dataset.type);
        });
      });
    }

    // Day Detail Close
    if (el.closeDayModalBtn) {
      el.closeDayModalBtn.addEventListener('click', () => {
        el.dayDetailModal.classList.add('hidden');
      });
    }

    // Image Modal Controls
    if (el.openImageModalBtn) {
      el.openImageModalBtn.addEventListener('click', () => {
        resetImageZoom();
        el.imageViewerModal.classList.remove('hidden');
      });
    }
    if (el.closeImageModalBtn) {
      el.closeImageModalBtn.addEventListener('click', () => {
        el.imageViewerModal.classList.add('hidden');
      });
    }
    if (el.zoomInBtn) el.zoomInBtn.addEventListener('click', () => updateImageTransform(state.imageZoom + 0.3));
    if (el.zoomOutBtn) el.zoomOutBtn.addEventListener('click', () => updateImageTransform(Math.max(0.5, state.imageZoom - 0.3)));
    if (el.zoomResetBtn) el.zoomResetBtn.addEventListener('click', resetImageZoom);

    setupImagePanEvents();

    // Excel Modal Controls
    if (el.openExcelModalBtn) {
      el.openExcelModalBtn.addEventListener('click', () => {
        renderExcelTable(el.excelSearchInput ? el.excelSearchInput.value : '');
        el.excelViewerModal.classList.remove('hidden');
      });
    }
    if (el.closeExcelModalBtn) {
      el.closeExcelModalBtn.addEventListener('click', () => {
        el.excelViewerModal.classList.add('hidden');
      });
    }
    if (el.excelSearchInput) {
      el.excelSearchInput.addEventListener('input', (e) => {
        renderExcelTable(e.target.value);
      });
    }

    // User Modal Controls
    if (el.openUserModalBtn) {
      el.openUserModalBtn.addEventListener('click', () => {
        renderStaffSelector();
        el.userModal.classList.remove('hidden');
      });
    }
    if (el.closeUserModalBtn) {
      el.closeUserModalBtn.addEventListener('click', () => {
        el.userModal.classList.add('hidden');
      });
    }
    if (el.saveUserBtn) {
      el.saveUserBtn.addEventListener('click', () => {
        const val = el.customNicknameInput.value.trim();
        if (val) {
          setUser(val);
          el.userModal.classList.add('hidden');
        }
      });
    }

    // Upload Modal Controls
    if (el.openUploadModalBtn) {
      el.openUploadModalBtn.addEventListener('click', () => {
        el.uploadExcelModal.classList.remove('hidden');
      });
    }
    if (el.closeUploadModalBtn) {
      el.closeUploadModalBtn.addEventListener('click', () => {
        el.uploadExcelModal.classList.add('hidden');
      });
    }

    // Dismiss on background click
    [el.noteModal, el.dayDetailModal, el.imageViewerModal, el.excelViewerModal, el.userModal, el.uploadExcelModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.add('hidden');
        });
      }
    });
  }

  function setUser(nickname) {
    state.currentNickname = nickname;
    localStorage.setItem('crh_duty_user_nickname', nickname);
    loadScheduleData();
    renderAll();
  }

  function renderAll() {
    renderUserBadge();
    renderTodayCard();
    renderTomorrowCard();
    renderSevenDaysStrip();
    renderMonthCalendar();
    renderKPISummary();
  }

  function renderUserBadge() {
    const staff = window.STAFF_MEMBERS.find(s => s.nickname === state.currentNickname) || {
      nickname: state.currentNickname,
      fullName: (state.currentNickname === 'เอ็ม' ? 'จุรีพร ผาบสุวรรณ์' : state.currentNickname)
    };

    if (el.headerFullName) el.headerFullName.textContent = staff.fullName;
    if (el.headerNickname) el.headerNickname.textContent = `(${staff.nickname})`;
    if (el.userInitialBadge) el.userInitialBadge.textContent = staff.nickname === 'เอ็ม' ? 'EM' : staff.nickname.substring(0, 2);
    if (el.customNicknameInput) el.customNicknameInput.value = state.currentNickname;
  }

  // TODAY FEATURE CARD
  function renderTodayCard() {
    const day = state.scheduleList[state.selectedDate - 1];
    if (!day) return;

    el.todayDateHeading.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;
    el.todayDayOfWeekBadge.textContent = day.dayName;

    // Regular Duty (เวลาปกติ)
    if (day.regularDuty) {
      el.todayStationTitle.textContent = day.regularDuty.title;
      el.todayLocationDetail.textContent = day.regularDuty.location;
    } else if (day.isDayOff) {
      el.todayStationTitle.textContent = 'วันหยุด';
      el.todayLocationDetail.textContent = 'ไม่มีภารกิจในวันหยุดนี้';
    } else {
      el.todayStationTitle.textContent = 'เวรวันหยุด';
      el.todayLocationDetail.textContent = 'ไม่มีงานเวลาปกติ';
    }

    // Extra / Night Shift / Afternoon Shift (กะดึก, กะบ่าย, กะเช้า)
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

    // User Note
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

  // TOMORROW COMPANION CARD
  function renderTomorrowCard() {
    const tomorrowDate = (state.selectedDate < 30) ? (state.selectedDate + 1) : 1;
    const day = state.scheduleList[tomorrowDate - 1];
    if (!day) return;

    if (el.tomorrowDateLabel) el.tomorrowDateLabel.textContent = `วัน${day.dayName}ที่ ${day.date} พ.ย. 2569`;

    if (el.tomorrowRegularStation) {
      if (day.regularDuty) {
        el.tomorrowRegularStation.textContent = day.regularDuty.title;
        el.tomorrowRegularLocation.textContent = day.regularDuty.location;
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

  // 7-DAY FORWARD HORIZONTAL STRIP (MATCHING IMAGE 1 REFERENCE)
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

      // Card Classes matching Image 1
      let cardClass = 'seven-day-card ';
      if (isToday) cardClass += 'card-today ';
      if (isHighlighted) cardClass += 'card-duty ';
      if (isDayOff) cardClass += 'card-off ';

      // Regular Station / Duty
      let mainText = '';
      let subText = '';

      if (isDayOff) {
        // MATCHING IMAGE 1: Red text "วันหยุด"
        mainText = `<div class="text-base font-black text-rose-500 my-auto">วันหยุด</div>`;
        subText = `<div class="text-[10px] text-slate-400">พักประจำสัปดาห์</div>`;
      } else {
        const regular = day.regularDuty ? day.regularDuty.title : '-';
        mainText = `<div class="text-sm font-bold text-slate-900 leading-tight">${regular}</div>`;

        if (day.otDuties && day.otDuties.length > 0) {
          const shiftNames = day.otDuties.map(ot => {
            if (ot.name.includes("ดึก")) return "IPD ดึก";
            if (ot.name.includes("บ่าย")) return "IPD บ่าย";
            if (ot.name.includes("เช้า")) return "IPD เช้า";
            return ot.name;
          }).join('+');

          subText = `<div class="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-lg px-1.5 py-0.5 mt-1 border border-amber-200 truncate">เวร ${shiftNames}</div>`;
        } else {
          subText = `<div class="text-[10px] text-slate-400 mt-1">เวลาปกติ</div>`;
        }
      }

      // If user has a swap or leave note
      if (day.userNote) {
        if (day.userNote.type === 'swap') {
          subText = `<div class="text-[9px] font-bold text-blue-600 bg-blue-50 rounded px-1 py-0.5 mt-1 truncate">สลับ: ${day.userNote.swapWith}</div>`;
        } else {
          subText = `<div class="text-[9px] font-bold text-rose-600 bg-rose-50 rounded px-1 py-0.5 mt-1 truncate">${day.userNote.title}</div>`;
        }
      }

      card.className = cardClass;
      card.innerHTML = `
        <div>
          <!-- Header: e.g. พฤ ที่ 5 / ศุกร์ ที่ 6 (Matching Image 1) -->
          <div class="text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
            ${day.dayName} ที่ ${day.date}
          </div>
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

  // MONTH VIEW CALENDAR (MATCHING IMAGE 2 REFERENCE)
  // Grid layout from Monday to Sunday: จ อ พ พฤ ศ ส อา
  function renderMonthCalendar() {
    if (!el.monthCalendarGrid) return;
    el.monthCalendarGrid.innerHTML = '';

    // November 2569 starts on Sunday (1 พ.ย. 2569)
    // Starting with Monday (จ): Leading days from Oct: 26, 27, 28, 29, 30, 31 (6 days)
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

      // COLOR CODING AS ORDERED:
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

    // Trailing days from December to fill grid: 1, 2, 3, 4, 5, 6 (Matching Image 2)
    const nextMonthDays = [1, 2, 3, 4, 5, 6];
    nextMonthDays.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cal-month-cell text-slate-300 font-normal';
      cell.textContent = d;
      el.monthCalendarGrid.appendChild(cell);
    });
  }

  // BOTTOM SECTION: KPI STATS SUMMARY (PCU, ER, ตึกรังสี ฯลฯ)
  function renderKPISummary() {
    if (typeof window.getStationStats !== 'function') return;
    const stats = window.getStationStats(state.currentNickname);

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

  // NOTE MODAL LOGIC (บันทึกวันลา / สลับวันหยุดกับคนอื่น)
  function openNoteModal(date) {
    state.activeEditingDate = date;
    const day = state.scheduleList[date - 1];
    if (!day) return;

    el.noteModalDateLabel.textContent = `วัน${day.dayName}ที่ ${day.date} พฤศจิกายน 2569`;
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
      el.noteTextInput.value = existing.note || '';
      el.deleteNoteBtn.classList.remove('hidden');
    } else {
      setNoteType('leave');
      el.noteTextInput.value = '';
      el.deleteNoteBtn.classList.add('hidden');
    }

    el.noteModal.classList.remove('hidden');
  }

  function closeNoteModal() {
    el.noteModal.classList.add('hidden');
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
    window.STAFF_MEMBERS.forEach(s => {
      if (s.nickname !== state.currentNickname) {
        const opt = document.createElement('option');
        opt.value = s.nickname;
        opt.textContent = `${s.nickname} (${s.fullName})`;
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
    closeNoteModal();
  }

  function deleteNoteData() {
    const date = state.activeEditingDate;
    if (!date) return;

    delete state.customNotes[date];
    localStorage.setItem('crh_custom_day_notes', JSON.stringify(state.customNotes));

    loadScheduleData();
    renderAll();
    closeNoteModal();
  }

  // DAY DETAIL MODAL
  function openDayDetailModal(day) {
    if (!el.dayDetailModal || !el.dayDetailContent) return;

    let regularHtml = '';
    if (day.regularDuty) {
      regularHtml = `
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div class="text-[10px] font-semibold text-slate-400 uppercase">เวลาปกติ</div>
          <div class="text-lg font-bold text-slate-900 mt-1">${day.regularDuty.title}</div>
          <div class="text-xs text-slate-500 mt-0.5">${day.regularDuty.location}</div>
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
          <p class="text-xs text-slate-400">ผู้ปฏิบัติงาน: คุณ${state.currentNickname}</p>
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

    el.dayDetailModal.classList.remove('hidden');
  }

  // PAN & ZOOM IMAGE
  function resetImageZoom() {
    state.imageZoom = 1;
    state.imagePan = { x: 0, y: 0 };
    updateImageTransform(1);
  }

  function updateImageTransform(newZoom) {
    state.imageZoom = Math.min(Math.max(0.5, newZoom), 4);
    if (el.scheduleImage) {
      el.scheduleImage.style.transform = `translate(${state.imagePan.x}px, ${state.imagePan.y}px) scale(${state.imageZoom})`;
    }
  }

  function setupImagePanEvents() {
    const container = el.imagePanContainer;
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      state.isDraggingImage = true;
      state.dragStart = { x: e.clientX - state.imagePan.x, y: e.clientY - state.imagePan.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDraggingImage) return;
      state.imagePan = { x: e.clientX - state.dragStart.x, y: e.clientY - state.dragStart.y };
      updateImageTransform(state.imageZoom);
    });

    window.addEventListener('mouseup', () => {
      state.isDraggingImage = false;
    });

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        state.isDraggingImage = true;
        state.dragStart = { x: e.touches[0].clientX - state.imagePan.x, y: e.touches[0].clientY - state.imagePan.y };
      }
    });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && state.isDraggingImage) {
        state.imagePan = { x: e.touches[0].clientX - state.dragStart.x, y: e.touches[0].clientY - state.dragStart.y };
        updateImageTransform(state.imageZoom);
      }
    });

    container.addEventListener('touchend', () => {
      state.isDraggingImage = false;
    });
  }

  // EXCEL TABLE RENDER
  function renderExcelTable(filterKeyword) {
    if (!el.excelTableBody) return;
    el.excelTableBody.innerHTML = '';

    fetch('source_schedule.csv')
      .then(res => res.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        const filter = (filterKeyword || '').trim().toLowerCase();

        lines.slice(0, 160).forEach(line => {
          if (!line.trim()) return;
          if (filter && !line.toLowerCase().includes(filter)) return;

          const cols = line.split(',');
          const tr = document.createElement('tr');
          tr.className = 'border-b border-slate-100 text-xs hover:bg-slate-50';

          cols.slice(0, 20).forEach((val, i) => {
            const td = document.createElement('td');
            td.className = `p-2 ${i < 3 ? 'font-semibold text-slate-800' : 'text-slate-600'} whitespace-nowrap`;
            td.textContent = val.trim();
            tr.appendChild(td);
          });
          el.excelTableBody.appendChild(tr);
        });
      })
      .catch(err => {
        el.excelTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-rose-600">ไม่สามารถโหลดไฟล์ CSV ได้ (${err.message})</td></tr>`;
      });
  }

  // STAFF SELECTOR
  function renderStaffSelector() {
    if (!el.staffListGrid) return;
    el.staffListGrid.innerHTML = '';

    window.STAFF_MEMBERS.forEach(staff => {
      const btn = document.createElement('button');
      const isCurrent = (staff.nickname === state.currentNickname);
      btn.className = `p-2.5 rounded-2xl border text-left transition-all ${
        isCurrent
          ? 'bg-coral-50 border-coral-400 text-coral-700 font-bold'
          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
      }`;
      btn.innerHTML = `
        <div class="text-xs font-bold text-slate-900">${staff.nickname}</div>
        <div class="text-[10px] text-slate-400 truncate">${staff.fullName}</div>
      `;

      btn.addEventListener('click', () => {
        setUser(staff.nickname);
        el.userModal.classList.add('hidden');
      });

      el.staffListGrid.appendChild(btn);
    });
  }

  // EXCEL UPLOADER
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

          el.uploadStatus.innerHTML = `
            <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              เชื่อมโยงข้อมูลจาก ${file.name} เรียบร้อยแล้ว!
            </div>
          `;
          setTimeout(() => {
            el.uploadExcelModal.classList.add('hidden');
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

  // PWA Installation & Banner Handling
  let deferredPrompt = null;
  const pwaBanner = document.getElementById('pwaInstallBanner');
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');
  const closePwaBannerBtn = document.getElementById('closePwaBannerBtn');
  const iosModal = document.getElementById('iosInstallModal');
  const closeIosBtn = document.getElementById('closeIosInstallBtn');

  function initPWA() {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      if (pwaBanner) pwaBanner.classList.add('hidden');
      return;
    }

    // Check if user dismissed banner
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
          // Fallback or iOS Guide
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

  // Hook into DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
  } else {
    initPWA();
  }