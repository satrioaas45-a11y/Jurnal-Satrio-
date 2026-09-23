/* LOCAL STORAGE STATE */
let trades = JSON.parse(localStorage.getItem('trading_journal_trades')) || [];
let currentDate = new Date(); // Menyimpan acuan bulan yang aktif
let selectedDetailDateStr = ''; // Menyimpan tanggal yang sedang dibuka detailnya
let currentImageBase64 = ''; // Menyimpan temp gambar

// Inisialisasi Aplikasi saat Load
window.onload = () => {
  renderApp();
};

/* SAVE DATA TO LOCAL STORAGE */
function saveData() {
  localStorage.setItem('trading_journal_trades', JSON.stringify(trades));
}

/* FORMAT CURRENCY */
function formatUSD(amount) {
  const isNegative = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (amount > 0) return `+$${formatted}`;
  if (amount < 0) return `-$${formatted}`;
  return `$${formatted}`;
}

/* RENDER ALL APP COMPONENTS */
function renderApp() {
  populatePairFilter();
  renderCalendar();
  calculateDashboardStats();
}

/* GET FILTERED TRADES */
function getFilteredTrades() {
  const pairFilter = document.getElementById('filter-pair').value;
  const resultFilter = document.getElementById('filter-result').value;

  return trades.filter(t => {
    const matchPair = (pairFilter === 'ALL') || (t.pair === pairFilter);
    let matchResult = true;
    if (resultFilter === 'PROFIT') matchResult = t.pl > 0;
    if (resultFilter === 'LOSS') matchResult = t.pl < 0;
    return matchPair && matchResult;
  });
}

/* POPULATE FILTER PAIR DROPDOWN */
function populatePairFilter() {
  const pairSelect = document.getElementById('filter-pair');
  const currentSelected = pairSelect.value;
  const pairs = [...new Set(trades.map(t => t.pair.toUpperCase()))];
  
  pairSelect.innerHTML = '<option value="ALL">Semua Pair</option>';
  pairs.forEach(pair => {
    const opt = document.createElement('option');
    opt.value = pair;
    opt.innerText = pair;
    if (pair === currentSelected) opt.selected = true;
    pairSelect.appendChild(opt);
  });
}

/* NAVIGATION CALENDAR */
function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

function goToToday() {
  currentDate = new Date();
  renderCalendar();
}

/* RENDER CALENDAR CORE */
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;

  const calendarGrid = document.getElementById('calendar-grid');
  calendarGrid.innerHTML = '';

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let dateCounter = 1;
  let nextMonthCounter = 1;

  // Filtered trades
  const filteredTrades = getFilteredTrades();

  // Monthly Accumulator
  let monthTotalPL = 0;
  let monthTotalTrades = 0;
  let monthWins = 0;
  let monthLosses = 0;

  // Iterasi 6 Minggu Maksimal
  for (let week = 0; week < 6; week++) {
    // Cek jika sudah melampaui bulan dan bukan minggu pertama
    if (dateCounter > daysInMonth && week > 0) break;

    const weekRow = document.createElement('div');
    weekRow.className = 'calendar-week-row';

    let weeklyPL = 0;

    // Iterasi 7 Hari (Min-Sab)
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day-cell';

      let cellDateStr = '';

      if (week === 0 && dayOfWeek < firstDayOfMonth) {
        // Hari bulan sebelumnya
        const prevDate = daysInPrevMonth - firstDayOfMonth + dayOfWeek + 1;
        dayCell.classList.add('other-month');
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        cellDateStr = formatDateStr(prevYear, prevMonth, prevDate);
        dayCell.innerHTML = `<div class="day-header"><span class="day-number">${prevDate}</span></div>`;
      } else if (dateCounter > daysInMonth) {
        // Hari bulan berikutnya
        dayCell.classList.add('other-month');
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        cellDateStr = formatDateStr(nextYear, nextMonth, nextMonthCounter);
        dayCell.innerHTML = `<div class="day-header"><span class="day-number">${nextMonthCounter}</span></div>`;
        nextMonthCounter++;
      } else {
        // Hari bulan aktif
        cellDateStr = formatDateStr(year, month, dateCounter);
        const todayStr = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        
        if (cellDateStr === todayStr) {
          dayCell.classList.add('today');
        }

        // Hitung Trade pada tanggal ini
        const dayTrades = filteredTrades.filter(t => t.date === cellDateStr);
        const dayPL = dayTrades.reduce((sum, t) => sum + parseFloat(t.pl), 0);
        const tradeCount = dayTrades.length;

        weeklyPL += dayPL;

        // Update statistik bulanan jika dalam bulan aktif
        monthTotalPL += dayPL;
        monthTotalTrades += tradeCount;
        dayTrades.forEach(t => {
          if (t.pl > 0) monthWins++;
          if (t.pl < 0) monthLosses++;
        });

        // Tampilan Konten Hari
        let plClass = 'text-neutral';
        if (tradeCount > 0) {
          if (dayPL > 0) {
            dayCell.classList.add('is-profit');
            plClass = 'text-profit';
          } else if (dayPL < 0) {
            dayCell.classList.add('is-loss');
            plClass = 'text-loss';
          }
        }

        dayCell.innerHTML = `
          <div class="day-header">
            <span class="day-number">${dateCounter}</span>
            ${tradeCount > 0 ? `<span class="trade-count">${tradeCount} Trade${tradeCount > 1 ? 's' : ''}</span>` : ''}
          </div>
          ${tradeCount > 0 ? `<div class="day-pl ${plClass}">${formatUSD(dayPL)}</div>` : ''}
        `;

        dateCounter++;
      }

      // Listener untuk Membuka Detail Tanggal
      const targetDateStr = cellDateStr;
      dayCell.onclick = () => openDayDetailModal(targetDateStr);

      weekRow.appendChild(dayCell);
    }

    // Tampilkan Kolom Total Mingguan
    const weeklyCell = document.createElement('div');
    weeklyCell.className = 'weekly-summary-cell';
    let weeklyPlClass = 'text-neutral';
    if (weeklyPL > 0) weeklyPlClass = 'text-profit';
    if (weeklyPL < 0) weeklyPlClass = 'text-loss';

    weeklyCell.innerHTML = `
      <span class="label">W${week + 1} Total</span>
      <span class="value ${weeklyPlClass}">${formatUSD(weeklyPL)}</span>
    `;
    weekRow.appendChild(weeklyCell);

    calendarGrid.appendChild(weekRow);
  }

  // Update Header Ringkasan Bulanan
  document.getElementById('month-total-trades').innerText = monthTotalTrades;
  document.getElementById('month-wins').innerText = monthWins;
  document.getElementById('month-losses').innerText = monthLosses;
  
  const monthPlEl = document.getElementById('month-total-pl');
  monthPlEl.innerText = formatUSD(monthTotalPL);
  monthPlEl.className = monthTotalPL > 0 ? 'text-profit' : (monthTotalPL < 0 ? 'text-loss' : 'text-neutral');
}

/* CALCULATE DASHBOARD TOP STATS */
function calculateDashboardStats() {
  const filteredTrades = getFilteredTrades();
  const todayStr = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  // P/L Hari Ini
  const todayPL = filteredTrades
    .filter(t => t.date === todayStr)
    .reduce((sum, t) => sum + parseFloat(t.pl), 0);

  // P/L Minggu Ini (Minggu Berjalan berdasarkan Kalender Komputer)
  const now = new Date();
  const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekPL = filteredTrades.filter(t => {
    const d = new Date(t.date);
    return d >= firstDayOfWeek;
  }).reduce((sum, t) => sum + parseFloat(t.pl), 0);

  // Total P/L Keseluruhan
  const totalPL = filteredTrades.reduce((sum, t) => sum + parseFloat(t.pl), 0);

  // Wins, Losses, Avg
  let wins = 0, losses = 0;
  let totalWinAmount = 0, totalLossAmount = 0;

  filteredTrades.forEach(t => {
    const val = parseFloat(t.pl);
    if (val > 0) {
      wins++;
      totalWinAmount += val;
    } else if (val < 0) {
      losses++;
      totalLossAmount += Math.abs(val);
    }
  });

  const totalTrades = filteredTrades.length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
  const avgWin = wins > 0 ? (totalWinAmount / wins) : 0;
  const avgLoss = losses > 0 ? (totalLossAmount / losses) : 0;
  const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : (totalWinAmount > 0 ? 'INF' : '0.00');

  // Update UI Elements
  const statToday = document.getElementById('stat-today');
  statToday.innerText = formatUSD(todayPL);
  statToday.className = `stat-value ${todayPL > 0 ? 'text-profit' : (todayPL < 0 ? 'text-loss' : 'text-neutral')}`;

  const statWeek = document.getElementById('stat-week');
  statWeek.innerText = formatUSD(weekPL);
  statWeek.className = `stat-value ${weekPL > 0 ? 'text-profit' : (weekPL < 0 ? 'text-loss' : 'text-neutral')}`;

  const statMonth = document.getElementById('stat-month');
  statMonth.innerText = formatUSD(totalPL);
  statMonth.className = `stat-value ${totalPL > 0 ? 'text-profit' : (totalPL < 0 ? 'text-loss' : 'text-neutral')}`;

  document.getElementById('stat-trades').innerText = totalTrades;
  document.getElementById('stat-winrate').innerText = `${winRate}%`;
  document.getElementById('stat-wins').innerText = wins;
  document.getElementById('stat-losses').innerText = losses;
  document.getElementById('stat-pf').innerText = profitFactor;
  document.getElementById('stat-avg-win').innerText = `+$${avgWin.toFixed(2)}`;
  document.getElementById('stat-avg-loss').innerText = `-$${avgLoss.toFixed(2)}`;
}

/* HELPER: FORMAT DATE STRING (YYYY-MM-DD) */
function formatDateStr(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/* MODAL HANDLERS */
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openAddModal(defaultDate = '') {
  document.getElementById('trade-form').reset();
  document.getElementById('trade-id').value = '';
  document.getElementById('form-modal-title').innerText = 'Tambah Journal Entry';
  document.getElementById('image-preview-container').style.display = 'none';
  currentImageBase64 = '';

  // Default tanggal jika diset, jika tidak pakai tanggal hari ini
  const today = defaultDate || new Date().toISOString().split('T')[0];
  document.getElementById('trade-date').value = today;

  openModal('modal-trade-form');
}

function openAddModalForCurrentDetailDate() {
  closeModal('modal-day-details');
  openAddModal(selectedDetailDateStr);
}

/* PREVIEW AND CONVERT IMAGE TO BASE64 */
function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      currentImageBase64 = e.target.result;
      const imgPreview = document.getElementById('image-preview');
      imgPreview.src = currentImageBase64;
      document.getElementById('image-preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

/* SAVE / EDIT TRADE */
function saveTrade(event) {
  event.preventDefault();

  const id = document.getElementById('trade-id').value;
  const date = document.getElementById('trade-date').value;
  const pair = document.getElementById('trade-pair').value.toUpperCase();
  const type = document.getElementById('trade-type').value;
  const pl = parseFloat(document.getElementById('trade-pl').value);
  const lot = document.getElementById('trade-lot').value;
  const entry = document.getElementById('trade-entry').value;
  const sl = document.getElementById('trade-sl').value;
  const tp = document.getElementById('trade-tp').value;
  const reason = document.getElementById('trade-reason').value;
  const notes = document.getElementById('trade-notes').value;

  if (id) {
    // Edit Mode
    const index = trades.findIndex(t => t.id === id);
    if (index !== -1) {
      trades[index] = {
        ...trades[index],
        date, pair, type, pl, lot, entry, sl, tp, reason, notes,
        image: currentImageBase64 || trades[index].image
      };
    }
  } else {
    // Add Mode
    const newTrade = {
      id: Date.now().toString(),
      date, pair, type, pl, lot, entry, sl, tp, reason, notes,
      image: currentImageBase64
    };
    trades.push(newTrade);
  }

  saveData();
  renderApp();
  closeModal('modal-trade-form');

  // Jika modal detail sedang aktif, refresh isinya
  if (selectedDetailDateStr === date) {
    openDayDetailModal(date);
  }
}

/* EDIT TRADE TRIGGER */
function editTrade(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;

  closeModal('modal-day-details');

  document.getElementById('trade-id').value = trade.id;
  document.getElementById('trade-date').value = trade.date;
  document.getElementById('trade-pair').value = trade.pair;
  document.getElementById('trade-type').value = trade.type;
  document.getElementById('trade-pl').value = trade.pl;
  document.getElementById('trade-lot').value = trade.lot || '';
  document.getElementById('trade-entry').value = trade.entry || '';
  document.getElementById('trade-sl').value = trade.sl || '';
  document.getElementById('trade-tp').value = trade.tp || '';
  document.getElementById('trade-reason').value = trade.reason || '';
  document.getElementById('trade-notes').value = trade.notes || '';

  if (trade.image) {
    currentImageBase64 = trade.image;
    document.getElementById('image-preview').src = trade.image;
    document.getElementById('image-preview-container').style.display = 'block';
  } else {
    currentImageBase64 = '';
    document.getElementById('image-preview-container').style.display = 'none';
  }

  document.getElementById('form-modal-title').innerText = 'Edit Journal Entry';
  openModal('modal-trade-form');
}

/* DELETE TRADE */
function deleteTrade(id) {
  if (confirm('Apakah Anda yakin ingin menghapus catatan trade ini?')) {
    trades = trades.filter(t => t.id !== id);
    saveData();
    renderApp();
    if (selectedDetailDateStr) {
      openDayDetailModal(selectedDetailDateStr);
    }
  }
}

/* OPEN DAY DETAIL MODAL */
function openDayDetailModal(dateStr) {
  selectedDetailDateStr = dateStr;
  const dayTrades = trades.filter(t => t.date === dateStr);
  
  const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('detail-modal-date').innerText = `Detail Trading: ${formattedDate}`;

  const container = document.getElementById('day-trades-container');
  container.innerHTML = '';

  if (dayTrades.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Tidak ada trade pada tanggal ini.</p>`;
  } else {
    dayTrades.forEach(t => {
      const card = document.createElement('div');
      card.className = 'trade-card-detail';
      
      const plClass = t.pl > 0 ? 'text-profit' : (t.pl < 0 ? 'text-loss' : 'text-neutral');
      const badgeClass = t.type === 'BUY' ? 'badge-buy' : 'badge-sell';

      card.innerHTML = `
        <div class="trade-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="trade-badge ${badgeClass}">${t.type}</span>
            <strong style="font-size: 16px;">${t.pair}</strong>
          </div>
          <span class="${plClass}" style="font-size: 16px; font-weight: 700;">${formatUSD(t.pl)}</span>
        </div>

        <div class="trade-info-grid">
          <div class="trade-info-item"><span>Lot Size</span>${t.lot || '-'}</div>
          <div class="trade-info-item"><span>Entry Price</span>${t.entry || '-'}</div>
          <div class="trade-info-item"><span>Stop Loss</span>${t.sl || '-'}</div>
          <div class="trade-info-item"><span>Take Profit</span>${t.tp || '-'}</div>
        </div>

        ${t.reason ? `<div><span style="font-size: 11px; color: var(--text-muted);">Alasan Entry:</span><p style="font-size: 13px;">${t.reason}</p></div>` : ''}
        ${t.notes ? `<div><span style="font-size: 11px; color: var(--text-muted);">Catatan:</span><p style="font-size: 13px;">${t.notes}</p></div>` : ''}

        ${t.image ? `<img src="${t.image}" class="trade-chart-img" onclick="openLightbox('${t.image}')" title="Klik untuk memperbesar">` : ''}

        <div class="trade-actions">
          <button class="btn-secondary" onclick="editTrade('${t.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn-danger" onclick="deleteTrade('${t.id}')"><i class="fa-solid fa-trash"></i> Hapus</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  openModal('modal-day-details');
}

/* LIGHTBOX ZOOM FUNCTION */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}
