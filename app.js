/**
 * Daily Learn Tracker - Application logic
 * التحكم بمنطق التطبيق، حفظ البيانات محلياً، تحديث الواجهات وحساب الإحصائيات
 */

// --- 1. حالة التطبيق (State) ---
let appState = {
    logs: [],
    dailyGoalMinutes: 240, // 4 ساعات هدف يومي كما في الجدول
};

// أسماء التصنيفات باللغة العربية
const categoryNames = {
    python: '🐍 Python (برمجة)',
    linux: '🐧 Linux (أنظمة)',
    network: '🌐 Networks (شبكات)',
    security: '🛡️ Cyber Security (أمن)',
    other: '⚙️ أخرى'
};

// --- 2. مراجع عناصر الواجهة (DOM Elements) ---
const DOM = {
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    liveDate: document.getElementById('live-date'),
    btnAddLogHeader: document.getElementById('btn-add-log-header'),
    modalBackdrop: document.getElementById('add-log-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    addLogForm: document.getElementById('add-log-form'),
    timelineList: document.getElementById('timeline-list'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    
    // عناصر الإحصائيات
    valStreak: document.getElementById('val-streak'),
    textStreakFeedback: document.getElementById('text-streak-feedback'),
    valHours: document.getElementById('val-hours'),
    valLogsCount: document.getElementById('val-logs-count'),
    
    // هدف المذاكرة اليومي
    goalProgressCircle: document.getElementById('goal-progress-circle'),
    goalPercent: document.getElementById('goal-percent'),
    goalCompletedMinutes: document.getElementById('goal-completed-minutes'),
    goalTargetMinutes: document.getElementById('goal-target-minutes'),
    goalBadge: document.getElementById('goal-badge'),
    
    // العناصر التفاعلية الأخرى
    heatmapContainer: document.getElementById('heatmap-container'),
    categoryDistributionContainer: document.getElementById('category-distribution-container')
};

// --- 3. تهيئة التطبيق عند التشغيل ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    updateDateDisplay();
    setupEventListeners();
    renderAll();
});

// --- 4. معالجة التاريخ ---
function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.liveDate.textContent = new Date().toLocaleDateString('ar-EG', options);
}

// --- 5. ربط أحداث العناصر (Event Listeners) ---
function setupEventListeners() {
    // التنقل بين التبويبات (Tabs)
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // فتح وإغلاق النافذة المنبثقة (Modal)
    DOM.btnAddLogHeader.addEventListener('click', openModal);
    DOM.btnCloseModal.addEventListener('click', closeModal);
    DOM.btnCancelModal.addEventListener('click', closeModal);
    DOM.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.modalBackdrop) closeModal();
    });

    // حفظ نموذج الإضافة
    DOM.addLogForm.addEventListener('submit', handleAddLogSubmit);

    // البحث والفلترة في السجل
    DOM.searchInput.addEventListener('input', filterAndRenderTimeline);
    DOM.categoryFilter.addEventListener('change', filterAndRenderTimeline);
}

// --- 6. منطق التنقل بين التبويبات ---
function switchTab(tabId) {
    DOM.navItems.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    DOM.tabContents.forEach(tab => {
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// --- 7. منطق النافذة المنبثقة (Modal Logic) ---
function openModal() {
    DOM.modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden'; // منع سكرول الصفحة الخلفية
}

function closeModal() {
    DOM.modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    DOM.addLogForm.reset();
}

// --- 8. إدخال وحفظ البيانات محلياً (Data Management) ---
function loadDataFromStorage() {
    const data = localStorage.getItem('daily_learn_tracker_data');
    if (data) {
        try {
            appState = JSON.parse(data);
            if (!appState.logs) appState.logs = [];
            if (!appState.dailyGoalMinutes) appState.dailyGoalMinutes = 240;
        } catch (e) {
            console.error('Error parsing stored data', e);
        }
    }
}

function saveDataToStorage() {
    localStorage.setItem('daily_learn_tracker_data', JSON.stringify(appState));
}

function handleAddLogSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('log-title').value.trim();
    const category = document.getElementById('log-category').value;
    const duration = parseInt(document.getElementById('log-duration').value, 10);
    const source = document.getElementById('log-source').value.trim();
    const confidence = parseInt(document.querySelector('input[name="confidence"]:checked').value, 10);
    const notes = document.getElementById('log-notes').value.trim();
    
    // إنشاء إدخال جديد بالتاريخ الحالي
    const newLog = {
        id: Date.now().toString(),
        title,
        category,
        duration,
        source,
        confidence,
        notes,
        date: new Date().toISOString() // بصيغة ISO لحسابات التواريخ لاحقاً
    };
    
    appState.logs.unshift(newLog); // إضافة في البداية
    saveDataToStorage();
    closeModal();
    renderAll();
}

function deleteLog(id) {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الدرس من سجلك؟')) {
        appState.logs = appState.logs.filter(log => log.id !== id);
        saveDataToStorage();
        renderAll();
    }
}

// --- 9. منطق الحسابات والإحصائيات ---

// حساب الأيام المتتالية (Streak)
function calculateStreak() {
    if (appState.logs.length === 0) return 0;

    // استخراج التواريخ بصيغة YYYY-MM-DD وتصفية المتكرر
    const dates = appState.logs.map(log => log.date.split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a)); // من الأحدث للأقدم

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // إذا لم يذاكر اليوم ولا أمس، الـ Streak مكسور (0)
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
        return 0;
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0]); // نبدأ بأحدث يوم مذاكرة

    for (let i = 0; i < uniqueDates.length; i++) {
        const expectedStr = checkDate.toISOString().split('T')[0];
        
        if (uniqueDates[i] === expectedStr) {
            streak++;
            // نرجع يوم للخلف للتحقق من اليوم السابق له
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // انقطاع التتالي
            break;
        }
    }

    return streak;
}

// حساب المجموع الكلي للساعات
function calculateTotalHours() {
    const totalMinutes = appState.logs.reduce((sum, log) => sum + log.duration, 0);
    return (totalMinutes / 60).toFixed(1);
}

// حساب الوقت المستغرق اليوم للهدف
function getTodayMinutes() {
    const todayStr = new Date().toISOString().split('T')[0];
    return appState.logs
        .filter(log => log.date.split('T')[0] === todayStr)
        .reduce((sum, log) => sum + log.duration, 0);
}

// --- 10. تحديث الواجهات (UI Rendering) ---

function renderAll() {
    // 1. تحديث الإحصائيات الفردية
    const streak = calculateStreak();
    DOM.valStreak.textContent = streak;
    
    // نص تحفيزي بناءً على الـ Streak
    if (streak === 0) {
        DOM.textStreakFeedback.textContent = 'ابدأ أول درس اليوم للتفعيل!';
    } else if (streak < 3) {
        DOM.textStreakFeedback.textContent = 'بداية رائعة، استمر! 🔥';
    } else if (streak < 7) {
        DOM.textStreakFeedback.textContent = 'أداء بطل، شعلة شغف! ⚡';
    } else {
        DOM.textStreakFeedback.textContent = 'مستوى خارق! لا تتوقف أبداً! 🚀';
    }

    DOM.valHours.textContent = calculateTotalHours();
    DOM.valLogsCount.textContent = appState.logs.length;

    // 2. تحديث دائرة الهدف اليومي
    renderGoalProgress();

    // 3. رسم خريطة النشاط (Heatmap)
    renderHeatmap();

    // 4. رسم المجالات المفضلة
    renderCategoriesBreakdown();

    // 5. تحديث قائمة السجل والخط الزمني
    filterAndRenderTimeline();
}

// رسم حلقة تقدم الهدف اليومي
function renderGoalProgress() {
    const todayMins = getTodayMinutes();
    const targetMins = appState.dailyGoalMinutes;
    DOM.goalCompletedMinutes.textContent = todayMins;
    DOM.goalTargetMinutes.textContent = targetMins;

    const percent = Math.min(100, Math.round((todayMins / targetMins) * 100));
    DOM.goalPercent.textContent = `${percent}%`;

    // حساب داش ستايل للرينغ
    // القطر r=50، المحيط = 2 * PI * r = 314.159
    const circumference = 2 * Math.PI * 50;
    DOM.goalProgressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    DOM.goalProgressCircle.style.strokeDashoffset = offset;

    // شارة الحالة للهدف
    if (percent >= 100) {
        DOM.goalBadge.textContent = 'اكتمل الهدف! 🎉';
        DOM.goalBadge.className = 'badge completed';
    } else {
        DOM.goalBadge.textContent = 'لم يكتمل بعد';
        DOM.goalBadge.className = 'badge';
    }
}

// رسم خريطة نشاط التقويم (Activity Heatmap) لآخر 30 يوم
function renderHeatmap() {
    DOM.heatmapContainer.innerHTML = '';
    
    // مصفوفة لآخر 30 يوم
    const daysData = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // حساب إجمالي الدقائق لهذا اليوم
        const dailyMinutes = appState.logs
            .filter(log => log.date.split('T')[0] === dateStr)
            .reduce((sum, log) => sum + log.duration, 0);

        daysData.push({
            date: d,
            dateStr,
            minutes: dailyMinutes
        });
    }

    // بناء الواجهة لكل يوم في خريطة النشاط
    daysData.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('heatmap-day');
        
        // مستويات الألوان بناءً على الدقائق المذاكرة
        let levelClass = 'level-0';
        if (day.minutes > 0 && day.minutes <= 60) {
            levelClass = 'level-1';
        } else if (day.minutes > 60 && day.minutes <= 180) {
            levelClass = 'level-2';
        } else if (day.minutes > 180) {
            levelClass = 'level-3';
        }
        dayDiv.classList.add(levelClass);

        // رقم اليوم باللغة الإنجليزية للتقويم العصري
        const dayNumSpan = document.createElement('span');
        dayNumSpan.classList.add('day-num');
        dayNumSpan.textContent = day.date.getDate();
        dayDiv.appendChild(dayNumSpan);

        // تنسيق التاريخ والتلميح (Tooltip)
        const dateOptions = { month: 'short', day: 'numeric' };
        const formattedDate = day.date.toLocaleDateString('ar-EG', dateOptions);
        
        const tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        tooltip.textContent = `${formattedDate}: ${day.minutes > 0 ? `${day.minutes} دقيقة مذاكرة` : 'لم تذاكر'}`;
        dayDiv.appendChild(tooltip);

        DOM.heatmapContainer.appendChild(dayDiv);
    });
}

// رسم بارات تقسيم المجالات الأكثر تفضيلاً
function renderCategoriesBreakdown() {
    DOM.categoryDistributionContainer.innerHTML = '';

    if (appState.logs.length === 0) {
        DOM.categoryDistributionContainer.innerHTML = '<p class="empty-state-text">ابدأ بتدوين أول درس لرؤية مجالات اهتمامك!</p>';
        return;
    }

    // حساب إجمالي الدقائق لكل تصنيف
    const categoriesMins = {};
    let grandTotalMins = 0;

    appState.logs.forEach(log => {
        categoriesMins[log.category] = (categoriesMins[log.category] || 0) + log.duration;
        grandTotalMins += log.duration;
    });

    // فرز التصنيفات حسب الدقائق من الأكبر للأصغر
    const sortedCategories = Object.keys(categoriesMins).sort((a, b) => categoriesMins[b] - categoriesMins[a]);

    sortedCategories.forEach(cat => {
        const mins = categoriesMins[cat];
        const percentage = grandTotalMins > 0 ? Math.round((mins / grandTotalMins) * 100) : 0;
        
        const catItem = document.createElement('div');
        catItem.classList.add('category-bar-item');

        // كلاس الألوان المخصص في CSS
        const catClass = `cat-${cat}`;

        catItem.innerHTML = `
            <div class="category-bar-label">
                <span>${categoryNames[cat] || cat}</span>
                <span>${percentage}% (${(mins / 60).toFixed(1)} س)</span>
            </div>
            <div class="category-bar-bg">
                <div class="category-bar-fill ${catClass}" style="width: ${percentage}%"></div>
            </div>
        `;
        DOM.categoryDistributionContainer.appendChild(catItem);
    });
}

// فلترة وعرض قائمة السجل (Logs Timeline)
function filterAndRenderTimeline() {
    const searchQuery = DOM.searchInput.value.toLowerCase().trim();
    const selectedCategory = DOM.categoryFilter.value;
    
    // تصفية السجلات بناءً على الفلتر والبحث
    const filteredLogs = appState.logs.filter(log => {
        const matchesCategory = (selectedCategory === 'all' || log.category === selectedCategory);
        const matchesSearch = (
            log.title.toLowerCase().includes(searchQuery) ||
            log.notes.toLowerCase().includes(searchQuery) ||
            (categoryNames[log.category] || '').toLowerCase().includes(searchQuery)
        );
        return matchesCategory && matchesSearch;
    });

    DOM.timelineList.innerHTML = '';

    // حالة عدم وجود نتائج
    if (filteredLogs.length === 0) {
        DOM.timelineList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <h3>لا توجد دروس مدونة حالياً</h3>
                <p>سجل ما تعلمته اليوم من الخطة الدراسية، وابدأ في بناء سلسلة إنجازاتك!</p>
                <button class="btn btn-primary" onclick="document.getElementById('btn-add-log-header').click()">
                    <span>سجل درسك الأول الآن</span>
                </button>
            </div>
        `;
        return;
    }

    // رسم بطاقات الدروس
    filteredLogs.forEach(log => {
        const card = document.createElement('div');
        card.classList.add('timeline-card');
        card.classList.add(`cat-${log.category}`);

        // تنسيق التاريخ والوقت للبطاقة
        const logDateObj = new Date(log.date);
        const formattedDate = logDateObj.toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
        
        // إعداد زر الرابط للمرجع
        const sourceLinkHTML = log.source 
            ? `<a href="${log.source}" target="_blank" class="log-source-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                <span>المرجع الدراسي</span>
               </a>`
            : '<span></span>';

        // إيموجي الفهم بناءً على التقييم
        const confidenceEmojis = ['🥱 ضعيف', '🤨 مقبول', '🙂 جيد', '😎 ممتاز', '🧠 عبقري'];
        const confidenceText = confidenceEmojis[log.confidence - 1] || '🙂 جيد';

        card.innerHTML = `
            <div class="log-header">
                <div class="log-meta-left">
                    <h4 class="log-title">${escapeHTML(log.title)}</h4>
                    <div class="log-badges">
                        <span class="tag-badge">${categoryNames[log.category] || log.category}</span>
                        <span class="log-duration">⏱️ ${log.duration} دقيقة</span>
                    </div>
                </div>
                <div class="log-actions">
                    <span class="log-date">${formattedDate}</span>
                    <button class="btn-icon-danger" onclick="deleteLog('${log.id}')" title="حذف">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
            <p class="log-notes">${escapeHTML(log.notes)}</p>
            <div class="log-footer">
                ${sourceLinkHTML}
                <span class="log-confidence">مستوى الاستيعاب: <strong>${confidenceText}</strong></span>
            </div>
        `;
        
        DOM.timelineList.appendChild(card);
    });
}

// دالة لحماية النصوص المدخلة من هجمات XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
