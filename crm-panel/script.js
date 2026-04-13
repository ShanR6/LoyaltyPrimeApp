// ========== УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ==========
function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        if (type === 'promotion') {
            // Сбрасываем все поля
            const nameInput = document.getElementById('promoName');
            const emojiSelect = document.getElementById('promoEmoji');
            
            if (nameInput) {
                nameInput.disabled = false;
                nameInput.style.background = '';
                nameInput.style.cursor = '';
                nameInput.value = '';
            }
            if (emojiSelect) {
                emojiSelect.disabled = false;
                emojiSelect.style.background = '';
                emojiSelect.style.cursor = '';
                emojiSelect.value = '🎯';
            }
            
            // Очищаем обработчики
            const bonusInput = document.getElementById('promoBonusValue');
            if (bonusInput) bonusInput.oninput = null;
            
            const discountInput = document.getElementById('promoDiscountValue');
            if (discountInput) discountInput.oninput = null;
            
            const rewardTypeSelect = document.getElementById('promoRewardType');
            if (rewardTypeSelect) rewardTypeSelect.onchange = null;
            
            // Сбрасываем переменные
            cleanPromoDescription = '';
            currentEditingPromotionId = null;
            
            // Очищаем предпросмотр
            const previewDiv = document.getElementById('promoDescriptionPreview');
            if (previewDiv) previewDiv.innerHTML = '';
        }
        
        if (type === 'quest') {
            // Сбрасываем поля задания
            const titleInput = document.getElementById('questTitle');
            const descInput = document.getElementById('questDesc');
            const rewardInput = document.getElementById('questReward');
            const activeCheckbox = document.getElementById('questActive');
            const endDateInput = document.getElementById('questEndDate');
            const modalTitle = document.getElementById('questModalTitle');
            
            if (titleInput) {
                titleInput.disabled = false;
                titleInput.style.background = '';
                titleInput.style.cursor = '';
                titleInput.value = '';
            }
            if (descInput) {
                descInput.disabled = false;
                descInput.style.background = '';
                descInput.style.cursor = '';
                descInput.value = '';
            }
            if (rewardInput) rewardInput.value = 10;
            if (activeCheckbox) activeCheckbox.checked = true;
            if (endDateInput) endDateInput.value = '';
            if (modalTitle) modalTitle.textContent = 'Добавить задание';
            
            currentEditingQuestId = null;
        }
    }
}

function switchToRegister() {
    closeModal('login');
    openModal('register');
}

function switchToLogin() {
    closeModal('register');
    openModal('login');
}

function toggleFaq(element) {
    const item = element.closest('.faq-item');
    if (item) {
        item.classList.toggle('active');
        const span = element.querySelector('span');
        if (span) span.textContent = item.classList.contains('active') ? '−' : '+';
    }
}

function submitDemo() {
    const email = document.getElementById('demoEmail')?.value;
    if (email && email.includes('@')) {
        alert('Спасибо! Мы свяжемся с вами в ближайшее время.');
    } else {
        alert('Пожалуйста, введите корректный email');
    }
}

// ========== CRM PANEL DATA ==========
let currentBusiness = null;
let notificationsHistory = [];
let tiers = [];


let promotions = [];
let questsManager = [];
let currentEditingQuestId = null;
let currentEditingPromotionId = null;
let presetQuestsList = [];

const API_URL = 'http://localhost:3001';

// ========== РЕГИСТРАЦИЯ И ВХОД ==========
function openCRMLogin() { openModal('login'); }
function openCRMRegister() { openModal('register'); }

async function handleCRMRegister() {
    const company = document.getElementById('registerCompany').value;
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const errorElement = document.getElementById('registerError');
    
    if (!company || !name || !email || !phone || !password || !confirm) {
        errorElement.textContent = 'Заполните все поля';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    if (password !== confirm) {
        errorElement.textContent = 'Пароли не совпадают';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    if (password.length < 6) {
        errorElement.textContent = 'Пароль должен быть не менее 6 символов';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/companies/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company, name, email, phone, password,
                brandColor: '#2A4B7C',
                description: `Добро пожаловать в ${company}!`
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Регистрация успешна! Теперь вы можете войти в CRM.');
            closeModal('register');
            openModal('login');
        } else {
            errorElement.textContent = data.message || 'Ошибка регистрации';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorElement.textContent = 'Сервер не доступен. Убедитесь, что backend запущен на порту 3001';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
    }
}

async function handleCRMLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        errorElement.textContent = 'Заполните все поля';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/companies/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (data.success) {
            currentBusiness = data.company;
            closeModal('login');
            loadCRMPanel();
        } else {
            errorElement.textContent = 'Неверный email или пароль';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorElement.textContent = 'Сервер не доступен. Проверьте подключение к бэкенду.';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
    }
}

// ========== CRM ПАНЕЛЬ ==========
async function loadCRMPanel() {
    document.getElementById('mainSite').style.display = 'none';
    document.getElementById('crmPanel').style.display = 'block';
    document.body.style.background = '#f0f2f5';
    document.body.classList.add('crm-open');
    
    const businessInfo = document.getElementById('businessInfo');
    if (businessInfo) {
        businessInfo.innerHTML = `
            <div class="business-name">${escapeHtml(currentBusiness.company || currentBusiness.name || 'Бизнес')}</div>
            <div class="business-email">${escapeHtml(currentBusiness.email || '')}</div>
        `;
    }
    
    await loadPresetQuests();
    await loadPromotionsAndQuestsFromDB();
    loadAnalytics();
    loadLoyaltySettings();
    await loadWheelSettings();
    await loadScratchSettings();
    await loadDiceSettings();  
    loadNotificationsHistory();
}

function closeCRMPanel() {
    document.getElementById('mainSite').style.display = 'block';
    document.getElementById('crmPanel').style.display = 'none';
    document.body.style.background = '#ffffff';
    document.body.classList.remove('crm-open');
    currentBusiness = null;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ========== МОДУЛЬ 1: АНАЛИТИКА ==========
function loadAnalytics() {
    const stats = {
        revenue: 1250000, activeUsers: 1234, newUsers: 89,
        segments: [
            { name: 'Новые', count: 234, percent: 18, color: '#3498db' },
            { name: 'Активные', count: 567, percent: 44, color: '#2ecc71' },
            { name: 'Постоянные', count: 345, percent: 27, color: '#f39c12' },
            { name: 'Спящие', count: 456, percent: 35, color: '#e74c3c' }
        ],
        dailyActivity: [45, 52, 48, 61, 55, 67, 72, 68, 75, 82, 78, 85, 91, 88],
        topProducts: [
            { name: 'Пицца Маргарита', sales: 234, revenue: 234000 },
            { name: 'Капучино', sales: 189, revenue: 94500 },
            { name: 'Бургер Классик', sales: 156, revenue: 156000 }
        ]
    };
    const totalRevenue = stats.revenue;
    
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = `
            <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-value">${stats.revenue.toLocaleString()} ₽</div><div class="stat-label">Выручка за месяц</div><div class="stat-trend up">↑ +12%</div></div></div>
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-value">${stats.activeUsers}</div><div class="stat-label">Активных пользователей</div><div class="stat-trend up">↑ +8%</div></div></div>
            <div class="stat-card"><div class="stat-icon">🆕</div><div class="stat-info"><div class="stat-value">${stats.newUsers}</div><div class="stat-label">Новых за месяц</div><div class="stat-trend up">↑ +23%</div></div></div>
        `;
    }
    
    const segmentsList = document.getElementById('segmentsList');
    if (segmentsList) {
        segmentsList.innerHTML = stats.segments.map(seg => `
            <div class="segment-item"><div class="segment-header"><div class="segment-color" style="background-color: ${seg.color}"></div><div class="segment-name">${seg.name}</div><div class="segment-count">${seg.count} чел.</div><div class="segment-percent">${seg.percent}%</div></div><div class="segment-bar"><div class="segment-fill" style="width: ${seg.percent}%; background-color: ${seg.color}"></div></div></div>
        `).join('');
    }
    
    const activityChart = document.getElementById('activityChart');
    if (activityChart) {
        const maxValue = Math.max(...stats.dailyActivity);
        activityChart.innerHTML = `<div class="activity-chart">${stats.dailyActivity.slice(-14).map((val, i) => `<div class="bar-container"><div class="bar" style="height: ${(val / maxValue) * 150}px"><span class="bar-value">${val}</span></div><div class="bar-label">Д${i+1}</div></div>`).join('')}</div>`;
    }
    
    const topProducts = document.getElementById('topProducts');
    if (topProducts) {
        topProducts.innerHTML = `
            <div class="products-table"><div class="table-header"><div>Продукт</div><div>Продажи</div><div>Выручка</div><div>Доля</div></div>
            ${stats.topProducts.map((p,i) => `<div class="table-row"><div class="product-name"><span class="product-rank">${i+1}</span> ${p.name}</div><div>${p.sales} шт.</div><div>${p.revenue.toLocaleString()} ₽</div><div><div class="product-bar"><div class="product-fill" style="width: ${(p.revenue/totalRevenue)*100}%"></div><span>${Math.round((p.revenue/totalRevenue)*100)}%</span></div></div></div>`).join('')}
            </div>`;
    }
}

// ========== МОДУЛЬ 2: ЛОЯЛЬНОСТЬ (УРОВНИ) ==========
async function loadTiersSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`);
        const data = await response.json();
        
        if (data.success && data.tiers && data.tiers.length > 0) {
            tiers = data.tiers;
            renderTiersSettings();
        } else {
            tiers = [
                { name: "🌱 Новичок", threshold: 0, multiplier: 1, cashback: 3, color: "#95a5a6", icon: "🌱" },
                { name: "🥉 Бронза", threshold: 500, multiplier: 1.2, cashback: 5, color: "#cd7f32", icon: "🥉" },
                { name: "🥈 Серебро", threshold: 2000, multiplier: 1.5, cashback: 7, color: "#bdc3c7", icon: "🥈" },
                { name: "🥇 Золото", threshold: 8000, multiplier: 2, cashback: 10, color: "#f1c40f", icon: "🥇" },
                { name: "💎 Бриллиант", threshold: 20000, multiplier: 2.5, cashback: 15, color: "#00b4d8", icon: "💎" }
            ];
            renderTiersSettings();
        }
    } catch (error) {
        console.error('Ошибка загрузки уровней:', error);
        renderTiersSettings();
    }
}

function renderTiersSettings() {
    const container = document.getElementById('tiersSettingsList');
    if (!container) return;
    
    const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
    
    container.innerHTML = sortedTiers.map((tier, idx) => `
        <div class="tier-config-item" style="border-left: 4px solid ${tier.color}">
            <div class="tier-config-header">
                <div class="tier-config-title">
                    <div class="tier-icon-preview" style="background: ${tier.color}20; border-radius: 12px; padding: 4px 8px;">
                        <span style="font-size: 20px;">${tier.icon || '⭐'}</span>
                        <input type="text" value="${escapeHtml(tier.name)}" 
                               onchange="updateTierConfig(${idx}, 'name', this.value)" 
                               class="tier-name-input"
                               style="width: 120px; margin-left: 8px;">
                    </div>
                    <input type="color" value="${tier.color}" 
                           onchange="updateTierConfig(${idx}, 'color', this.value)" 
                           class="tier-color-input">
                    <select onchange="updateTierConfig(${idx}, 'icon', this.value)" class="tier-icon-select">
                        ${getIconOptions(tier.icon)}
                    </select>
                </div>
                <button class="btn-remove" onclick="removeTierConfig(${idx})" ${sortedTiers.length <= 1 ? 'disabled style="opacity:0.5"' : ''}>🗑️</button>
            </div>
            
            <div class="tier-config-fields">
                <div class="config-field">
                    <label>💰 Порог LTV (₽):</label>
                    <input type="number" value="${tier.threshold}" 
                           onchange="updateTierConfig(${idx}, 'threshold', parseInt(this.value))" 
                           class="config-input">
                </div>
                
                <div class="config-field">
                    <label>⚡ Множитель бонусов:</label>
                    <input type="number" step="0.1" value="${tier.multiplier}" 
                           onchange="updateTierConfig(${idx}, 'multiplier', parseFloat(this.value))" 
                           class="config-input">
                </div>
                
                <div class="config-field">
                    <label>💰 Кешбэк (%):</label>
                    <input type="number" step="0.5" value="${tier.cashback || tier.multiplier * 5}" 
                           onchange="updateTierConfig(${idx}, 'cashback', parseFloat(this.value))" 
                           class="config-input">
                </div>
            </div>
            
            <div class="tier-preview">
                <div style="background: ${tier.color}; padding: 8px 12px; border-radius: 12px; color: white;">
                    ${tier.icon} ${escapeHtml(tier.name)}: x${tier.multiplier} бонусов • ${tier.cashback || tier.multiplier * 5}% кешбэк
                </div>
            </div>
        </div>
    `).join('');
}

function getIconOptions(selectedIcon) {
    const icons = ['🌱', '🥉', '🥈', '🥇', '💎', '⭐', '🏆', '👑', '🔥', '⚡', '🎯'];
    return icons.map(icon => `<option value="${icon}" ${selectedIcon === icon ? 'selected' : ''}>${icon}</option>`).join('');
}

function updateTierConfig(index, field, value) {
    if (tiers[index]) {
        tiers[index][field] = value;
        renderTiersSettings();
        if (window.tiersSaveTimeout) clearTimeout(window.tiersSaveTimeout);
        window.tiersSaveTimeout = setTimeout(() => saveTiersToServer(), 1000);
    }
}

function addTierConfig() {
    const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
    const lastTier = sortedTiers[sortedTiers.length - 1];
    const newThreshold = lastTier ? lastTier.threshold + 5000 : 1000;
    const newMultiplier = lastTier ? Math.min(5, lastTier.multiplier + 0.3) : 1;
    
    tiers.push({
        name: `Уровень ${tiers.length + 1}`,
        threshold: newThreshold,
        multiplier: newMultiplier,
        cashback: Math.min(25, newMultiplier * 5),
        color: getNextColor(tiers.length),
        icon: getNextIcon(tiers.length)
    });
    renderTiersSettings();
    saveTiersToServer();
}

function getNextColor(index) {
    const colors = ['#95a5a6', '#cd7f32', '#bdc3c7', '#f1c40f', '#00b4d8', '#9b59b6', '#e74c3c', '#2ecc71', '#e67e22', '#1abc9c'];
    return colors[index % colors.length];
}

function getNextIcon(index) {
    const icons = ['🌱', '🥉', '🥈', '🥇', '💎', '⭐', '🏆', '👑', '🔥', '⚡'];
    return icons[index % icons.length];
}

function removeTierConfig(index) {
    if (tiers.length <= 1) {
        alert('❌ Нельзя удалить последний уровень');
        return;
    }
    if (confirm(`Удалить уровень "${tiers[index].name}"?`)) {
        tiers.splice(index, 1);
        renderTiersSettings();
        saveTiersToServer();
    }
}

async function saveTiersToServer() {
    if (!currentBusiness) return;
    
    const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tiers: sortedTiers })
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
        }
    } catch (error) {
        console.error('Ошибка сохранения уровней:', error);
    }
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 1500);
    }
}

function loadLoyaltySettings() {
    loadTiersSettings();
    loadDailyBonusSettings();
}

// ========== НАСТРОЙКИ ЕЖЕДНЕВНОГО БОНУСА ==========
let dailyBonusConfig = {
    enabled: true,
    baseAmount: 10,
    streakBonus: 5
};

async function loadDailyBonusSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/dailyBonusSettings`);
        const data = await response.json();
        
        if (data.success && data.settings) {
            dailyBonusConfig = data.settings;
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек ежедневного бонуса:', error);
    }
    
    renderDailyBonusSettings();
}

function renderDailyBonusSettings() {
    const enabledCheckbox = document.getElementById('dailyBonusEnabled');
    const baseAmountInput = document.getElementById('dailyBonusBaseAmount');
    const streakBonusInput = document.getElementById('dailyBonusStreakBonus');
    const statusSpan = document.getElementById('dailyBonusStatus');
    const previewBase = document.getElementById('previewBaseAmount');
    const previewStreak = document.getElementById('previewStreakBonus');
    
    if (enabledCheckbox) {
        enabledCheckbox.checked = dailyBonusConfig.enabled;
    }
    
    if (baseAmountInput) {
        baseAmountInput.value = dailyBonusConfig.baseAmount || 10;
    }
    
    if (streakBonusInput) {
        streakBonusInput.value = dailyBonusConfig.streakBonus || 5;
    }
    
    if (statusSpan) {
        statusSpan.textContent = dailyBonusConfig.enabled ? '✅ Включен' : '❌ Отключен';
        statusSpan.style.color = dailyBonusConfig.enabled ? '#2ecc71' : '#e74c3c';
    }
    
    if (previewBase) {
        previewBase.textContent = dailyBonusConfig.baseAmount || 10;
    }
    
    if (previewStreak) {
        previewStreak.textContent = dailyBonusConfig.streakBonus || 5;
    }
}

async function updateDailyBonusSetting(field, value) {
    if (!currentBusiness) return;
    
    dailyBonusConfig[field] = value;
    
    // Обновляем статус
    const statusSpan = document.getElementById('dailyBonusStatus');
    if (statusSpan && field === 'enabled') {
        statusSpan.textContent = value ? '✅ Включен' : '❌ Отключен';
        statusSpan.style.color = value ? '#2ecc71' : '#e74c3c';
    }
    
    // Обновляем предпросмотр
    if (field === 'baseAmount') {
        const previewBase = document.getElementById('previewBaseAmount');
        if (previewBase) previewBase.textContent = value;
    }
    if (field === 'streakBonus') {
        const previewStreak = document.getElementById('previewStreakBonus');
        if (previewStreak) previewStreak.textContent = value;
    }
    
    // Сохраняем с задержкой
    if (window.dailyBonusSaveTimeout) clearTimeout(window.dailyBonusSaveTimeout);
    window.dailyBonusSaveTimeout = setTimeout(() => saveDailyBonusSettings(), 500);
}

async function saveDailyBonusSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/dailyBonusSettings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dailyBonusConfig)
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек ежедневного бонуса:', error);
    }
}

function saveLoyaltySettings() {
    saveTiersToServer();
    alert('✅ Настройки сохранены!');
}

// ========== МОДУЛЬ 3: УВЕДОМЛЕНИЯ ==========
function sendNotification() {
    const type = document.getElementById('notifType')?.value || 'Push';
    const segment = document.getElementById('notifSegment')?.value || 'all';
    const title = document.getElementById('notifTitle')?.value || '';
    const message = document.getElementById('notifMessage')?.value || '';
    
    if (!title || !message) {
        alert('Заполните заголовок и сообщение');
        return;
    }
    
    const notification = { 
        id: Date.now(), 
        type, 
        segment, 
        title, 
        message, 
        date: new Date().toLocaleString(), 
        status: 'sent' 
    };
    notificationsHistory.unshift(notification);
    if (notificationsHistory.length > 20) notificationsHistory.pop();
    loadNotificationsHistory();
    
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifMessage').value = '';
    alert(`✅ Уведомление отправлено!\nАудитория: ${getSegmentName(segment)}`);
}

function getSegmentName(segment) {
    const segments = { 'all':'Все', 'active':'Активные', 'sleeping':'Спящие', 'vip':'VIP', 'new':'Новые' };
    return segments[segment] || segment;
}

function loadNotificationsHistory() {
    const container = document.getElementById('notificationsHistory');
    if (!container) return;
    if (notificationsHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет отправленных уведомлений</div>';
        return;
    }
    container.innerHTML = notificationsHistory.map(n => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-title">${escapeHtml(n.title)}</div>
                <div class="history-message">${escapeHtml(n.message)}</div>
                <div class="history-meta">Аудитория: ${getSegmentName(n.segment)} • ${n.date}</div>
            </div>
            <div class="history-status sent">✅ Отправлено</div>
        </div>
    `).join('');
}

// ========== МОДУЛЬ 4: МАРКЕТИНГ ==========

async function loadPresetQuests() {
    try {
        const response = await fetch(`${API_URL}/api/preset-quests`);
        const data = await response.json();
        if (data.success) {
            presetQuestsList = data.quests;
            const select = document.getElementById('questPresetSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Выберите готовое задание --</option>' +
                    presetQuestsList.map(q => `<option value="${escapeHtml(q.title)}" data-emoji="${q.emoji}" data-desc="${escapeHtml(q.description)}" data-reward="${q.reward}">${q.emoji} ${q.title}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки предустановленных заданий:', error);
    }
}

function loadPresetQuest() {
    const select = document.getElementById('questPresetSelect');
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.value) {
        document.getElementById('questTitle').value = selectedOption.value;
        document.getElementById('questDesc').value = selectedOption.getAttribute('data-desc') || '';
        document.getElementById('questReward').value = selectedOption.getAttribute('data-reward') || 10;
        const emoji = selectedOption.getAttribute('data-emoji') || '✅';
        const emojiSelect = document.getElementById('questEmoji');
        if (emojiSelect) {
            for (let i = 0; i < emojiSelect.options.length; i++) {
                if (emojiSelect.options[i].value === emoji) {
                    emojiSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
}

async function loadPromotionsAndQuestsFromDB() {
    if (!currentBusiness) return;
    const companyId = currentBusiness.id;
    
    try {
        const promotionsResponse = await fetch(`${API_URL}/api/promotions/${companyId}`);
        if (promotionsResponse.ok) {
            promotions = await promotionsResponse.json();
            promotions = promotions.map(p => ({
                ...p,
                reward_type: p.reward_type || 'bonus',
                reward_value: p.reward_value || (p.discount || 0)
            }));
        } else {
            promotions = [];
        }
        
        const questsResponse = await fetch(`${API_URL}/api/quests/${companyId}`);
        if (questsResponse.ok) {
            questsManager = await questsResponse.json();
        } else {
            questsManager = [];
        }
        
        // Важно: вызываем рендер после загрузки данных
        renderPromotionsList();
        renderQuestsManagerList();
    } catch (error) {
        console.error('Ошибка загрузки из БД:', error);
        promotions = [];
        questsManager = [];
        renderPromotionsList();
        renderQuestsManagerList();
    }
}

// ========== АКЦИИ ==========


function loadPresetPromotion() {
    const select = document.getElementById('promoPresetSelect');
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.value) {
        document.getElementById('promoName').value = selectedOption.value;
        document.getElementById('promoDesc').value = selectedOption.getAttribute('data-desc') || '';
        const emoji = selectedOption.getAttribute('data-emoji') || '🎯';
        const emojiSelect = document.getElementById('promoEmoji');
        if (emojiSelect) {
            for (let i = 0; i < emojiSelect.options.length; i++) {
                if (emojiSelect.options[i].value === emoji) {
                    emojiSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
}
function renderPromotionsList() {
    const container = document.getElementById('promotionsList');
    if (!container) return;
    
    if (!promotions || promotions.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет акций. Акции создаются автоматически при регистрации компании.</div>';
        return;
    }
    
    container.innerHTML = promotions.map(promo => {
        const startDate = promo.start_date ? new Date(promo.start_date) : null;
        const endDate = promo.end_date ? new Date(promo.end_date) : null;
        const now = new Date();
        
        // Проверяем, указаны ли даты
        const hasDates = startDate && endDate;
        
        // Если даты не указаны - акция НЕ активна
        if (!hasDates) {
            return `
                <div class="promotion-item" style="opacity: 0.7; background: #f8f9fa;">
                    <div class="promotion-header">
                        <div class="promotion-emojis">${promo.emoji || '🎯'}</div>
                        <div class="promotion-name">${escapeHtml(promo.name)}</div>
                        <div class="promotion-reward" style="background:#ffd966; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:700;">${promo.reward_type === 'bonus' ? `+${promo.reward_value} бонусов` : `${promo.reward_value}% скидка`}</div>
                        <div class="promotion-status inactive" style="background:#e2e3e5; color:#383d41;">❌ Неактивна</div>
                        <button class="btn-edit" onclick="editPromotion(${promo.id})" style="background:#17a2b8; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">✏️</button>
                    </div>
                    <div class="promotion-desc" style="font-size:13px; color:#e74c3c; margin:8px 0 4px 60px;">
                        ⚠️ Для активации акции необходимо указать дату начала и окончания!
                    </div>
                    <div class="promotion-dates" style="font-size:11px; color:#999; margin-left:60px;">
                        📅 Дата не указана
                    </div>
                </div>
            `;
        }
        
        // Проверяем, истекла ли акция (дата окончания в прошлом)
        const isExpired = endDate < now;
        
        // Проверяем, активна ли по датам (текущее время между start и end)
        const isActiveByDate = !isExpired && startDate <= now && endDate >= now;
        
        // Определяем статус
        let status = 'inactive';
        let statusText = '';
        
        if (isExpired) {
            status = 'expired';
            statusText = 'Истекла';
        } else if (promo.active && isActiveByDate) {
            status = 'active';
            statusText = 'Активна';
        } else if (promo.active && !isActiveByDate && startDate > now) {
            status = 'waiting';
            statusText = 'Ожидает дат';
        } else if (promo.active && !isActiveByDate && startDate <= now && endDate < now) {
            status = 'expired';
            statusText = 'Истекла';
        } else {
            status = 'inactive';
            statusText = 'Отключена';
        }
        
        const rewardType = promo.reward_type || 'bonus';
        const rewardValue = promo.reward_value || 0;
        const rewardText = rewardType === 'bonus' ? `+${rewardValue} бонусов` : `${rewardValue}% скидка`;
        
        let displayDescription = promo.description || '';
        
        const formatDateTime = (date) => {
            if (!date) return 'не указана';
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        };
        
        return `
            <div class="promotion-item">
                <div class="promotion-header">
                    <div class="promotion-emojis">${promo.emoji || '🎯'}</div>
                    <div class="promotion-name">${escapeHtml(promo.name)}</div>
                    <div class="promotion-reward" style="background:#ffd966; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:700;">${rewardText}</div>
                    <div class="promotion-status ${status}">${statusText}</div>
                    <button class="btn-edit" onclick="editPromotion(${promo.id})" style="background:#17a2b8; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">✏️</button>
                </div>
                <div class="promotion-desc" style="font-size:13px; color:#555; margin:8px 0 4px 60px;">${escapeHtml(displayDescription)}</div>
                <div class="promotion-dates" style="font-size:11px; color:#999; margin-left:60px;">
                    📅 ${formatDateTime(startDate)} → ${formatDateTime(endDate)}
                    ${status === 'waiting' ? '<span style="color:#f39c12; margin-left:8px;">⏳ Акция начнется позже</span>' : ''}
                    ${status === 'active' ? '<span style="color:#2ecc71; margin-left:8px;">✅ Активна сейчас</span>' : ''}
                    ${status === 'expired' ? '<span style="color:#e74c3c; margin-left:8px;">⏰ Акция завершена</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}
async function loadPresetPromotions() {
    try {
        const response = await fetch(`${API_URL}/api/preset-promotions`);
        const data = await response.json();
        if (data.success) {
            presetPromotionsList = data.promotions;
        }
    } catch (error) {
        console.error('Ошибка загрузки пресетов акций:', error);
    }
}

function showAddPromotionModal() {
    alert('❌ Добавление новых акций отключено.\nВы можете только редактировать существующие акции через кнопку ✏️');
}

// Глобальная переменная для хранения чистого описания (без любых упоминаний скидок/бонусов)
let cleanPromoDescription = '';

async function editPromotion(promotionId) {
    const promo = promotions.find(p => p.id === promotionId);
    if (!promo) return;
    
    currentEditingPromotionId = promotionId;
    
    // Заполняем поля (делаем их только для чтения)
    const nameInput = document.getElementById('promoName');
    const emojiSelect = document.getElementById('promoEmoji');
    
    nameInput.value = promo.name;
    nameInput.disabled = true;
    nameInput.style.background = '#f0f0f0';
    nameInput.style.cursor = 'not-allowed';
    
    emojiSelect.value = promo.emoji || '🎯';
    emojiSelect.disabled = true;
    emojiSelect.style.background = '#f0f0f0';
    emojiSelect.style.cursor = 'not-allowed';
    
    // Полное описание
    let fullDescription = promo.description || '';
    
    // Получаем текущую награду из БД
    const currentRewardType = promo.reward_type || 'bonus';
    const currentRewardValue = promo.reward_value || 0;
    let currentRewardText = '';
    if (currentRewardType === 'bonus') {
        currentRewardText = `+${currentRewardValue} бонусов`;
    } else {
        currentRewardText = `${currentRewardValue}% скидка`;
    }
    
    // 1. Удаляем награду из НАЧАЛА строки
    let cleanDescription = fullDescription;
    cleanDescription = cleanDescription.replace(new RegExp(`^${escapeRegex(currentRewardText)}\\s*[•|,-]?\\s*`, 'i'), '');
    cleanDescription = cleanDescription.replace(/^[-+]\d+\s*%\s*скидка\s*[•|,-]?\s*/i, '');
    cleanDescription = cleanDescription.replace(/^[-+]\d+\s*бонусов?\s*[•|,-]?\s*/i, '');
    
    // 2. Удаляем ВСЕ упоминания скидок и бонусов из ОСТАВШЕГОСЯ текста
    // Удаляем "скидка X%" и "X% скидка"
    cleanDescription = cleanDescription.replace(/\d+\s*%\s*скидк[аи]/gi, '');
    cleanDescription = cleanDescription.replace(/скидк[аи]\s*\d+\s*%/gi, '');
    cleanDescription = cleanDescription.replace(/-\d+%\s*скидка/gi, '');
    cleanDescription = cleanDescription.replace(/\+\d+\s*бонусов?/gi, '');
    cleanDescription = cleanDescription.replace(/\d+\s*бонусов?/gi, '');
    
    // 3. Удаляем одиночные проценты и числа с процентами
    cleanDescription = cleanDescription.replace(/\d+\s*%/g, '');
    cleanDescription = cleanDescription.replace(/-\d+/g, '');
    cleanDescription = cleanDescription.replace(/\+\d+/g, '');
    
    // 4. Удаляем лишние слова-маркеры
    cleanDescription = cleanDescription.replace(/скидк[аи]/gi, '');
    cleanDescription = cleanDescription.replace(/бонусов?/gi, '');
    
    // 5. Очищаем от лишних символов и пробелов
    cleanDescription = cleanDescription.replace(/[•|,\s-]+/g, ' ');
    cleanDescription = cleanDescription.replace(/\s{2,}/g, ' ');
    cleanDescription = cleanDescription.trim();
    
    // 6. Удаляем предлоги в начале если остались
    cleanDescription = cleanDescription.replace(/^(на|при|за|с|со|в|во|для)\s+/i, '');
    cleanDescription = cleanDescription.trim();
    
    // Сохраняем чистое описание
    cleanPromoDescription = cleanDescription;
    
    console.log('Оригинальное описание:', fullDescription);
    console.log('Текущая награда:', currentRewardText);
    console.log('Чистое описание:', cleanPromoDescription);
    
    // Загружаем тип и значение вознаграждения
    const rewardTypeSelect = document.getElementById('promoRewardType');
    rewardTypeSelect.value = currentRewardType;
    rewardTypeSelect.disabled = false;
    toggleRewardFields(currentRewardType);
    
    if (currentRewardType === 'bonus') {
        document.getElementById('promoBonusValue').value = currentRewardValue;
        document.getElementById('promoBonusValue').disabled = false;
    } else {
        document.getElementById('promoDiscountValue').value = currentRewardValue;
        document.getElementById('promoDiscountValue').disabled = false;
    }
    
    // Добавляем обработчики
    const bonusInput = document.getElementById('promoBonusValue');
    const discountInput = document.getElementById('promoDiscountValue');
    if (bonusInput) bonusInput.oninput = () => updatePreview();
    if (discountInput) discountInput.oninput = () => updatePreview();
    rewardTypeSelect.onchange = () => {
        toggleRewardFields(rewardTypeSelect.value);
        updatePreview();
    };
    
    // Даты
    if (promo.start_date) {
        const startDate = new Date(promo.start_date);
        document.getElementById('promoStartDate').value = startDate.toISOString().slice(0, 16);
    } else {
        document.getElementById('promoStartDate').value = '';
    }
    document.getElementById('promoStartDate').disabled = false;
    
    if (promo.end_date) {
        const endDate = new Date(promo.end_date);
        document.getElementById('promoEndDate').value = endDate.toISOString().slice(0, 16);
    } else {
        document.getElementById('promoEndDate').value = '';
    }
    document.getElementById('promoEndDate').disabled = false;
    
    document.getElementById('promoActive').disabled = false;
    document.getElementById('promoActive').checked = promo.active;
    
    // Обновляем предпросмотр
    updatePreview();
    
    document.getElementById('promotionModalTitle').textContent = '✏️ Редактировать акцию';
    openModal('promotion');
}
// Функция для экранирования спецсимволов в регулярном выражении
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Функция обновления предпросмотра
function updatePreview() {
    const rewardType = document.getElementById('promoRewardType').value;
    let rewardText = '';
    let rewardValue = 0;
    
    if (rewardType === 'bonus') {
        rewardValue = parseInt(document.getElementById('promoBonusValue').value) || 0;
        rewardText = `+${rewardValue} бонусов`;
    } else {
        rewardValue = parseInt(document.getElementById('promoDiscountValue').value) || 0;
        rewardText = `${rewardValue}% скидка`;  
    }
    
    // Формируем новое описание
    let newDescription = rewardText;
    if (cleanPromoDescription && cleanPromoDescription.length > 0) {
        newDescription += ' • ' + cleanPromoDescription;
    }
    
    const previewDiv = document.getElementById('promoDescriptionPreview');
    if (previewDiv) {
        previewDiv.innerHTML = newDescription;
    }
}


function toggleRewardFields(type) {
    const bonusGroup = document.getElementById('promoBonusGroup');
    const discountGroup = document.getElementById('promoDiscountGroup');
    if (type === 'bonus') {
        if (bonusGroup) bonusGroup.style.display = 'block';
        if (discountGroup) discountGroup.style.display = 'none';
    } else {
        if (bonusGroup) bonusGroup.style.display = 'none';
        if (discountGroup) discountGroup.style.display = 'block';
    }
    updatePreview();
}

async function savePromotion() {
    const rewardType = document.getElementById('promoRewardType').value;
    const rewardValue = rewardType === 'bonus' 
        ? parseInt(document.getElementById('promoBonusValue').value) || 0
        : parseInt(document.getElementById('promoDiscountValue').value) || 0;
    const startDate = document.getElementById('promoStartDate').value;
    const endDate = document.getElementById('promoEndDate').value;
    const active = document.getElementById('promoActive').checked;
    const errorElement = document.getElementById('promotionError');
    
    // Формируем новое описание
    let rewardText = '';
    if (rewardType === 'bonus') {
        rewardText = `+${rewardValue} бонусов`;
    } else {
        rewardText = `${rewardValue}% скидка`;
    }
    
    let finalDescription = rewardText;
    if (cleanPromoDescription && cleanPromoDescription.length > 0) {
        finalDescription += ' • ' + cleanPromoDescription;
    }
    
    // ВАЛИДАЦИЯ ДАТ
    if (!startDate) {
        errorElement.textContent = '❌ Укажите дату начала акции (обязательное поле)';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    if (!endDate) {
        errorElement.textContent = '❌ Укажите дату окончания акции (обязательное поле)';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Проверка: дата окончания должна быть ПОСЛЕ даты начала (с учетом времени)
    // Дата начала может быть в прошлом, но окончание должно быть позже начала
    if (end <= start) {
        errorElement.textContent = '❌ Дата и время окончания должны быть ПОСЛЕ даты и времени начала.';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    // Проверка: минимальная длительность акции - 12 часов
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 12) {
        const remainingMinutes = Math.ceil((12 - diffHours) * 60);
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        
        let timeText = '';
        if (remainingHours > 0) {
            timeText = `${remainingHours} ${getHoursWord(remainingHours)}`;
            if (remainingMins > 0) timeText += ` ${remainingMins} минут`;
        } else {
            timeText = `${remainingMins} минут`;
        }
        
        errorElement.textContent = `❌ Акция должна длиться минимум 12 часов. Добавьте ещё ${timeText}.`;
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 5000);
        return;
    }
    
    // Валидация значения награды
    if (rewardValue <= 0) {
        errorElement.textContent = rewardType === 'bonus' ? '❌ Укажите количество бонусов (больше 0)' : '❌ Укажите размер скидки (больше 0)';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    if (rewardType === 'discount' && rewardValue > 100) {
        errorElement.textContent = '❌ Скидка не может превышать 100%';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    try {
        if (!currentEditingPromotionId) {
            errorElement.textContent = 'Добавление новых акций отключено. Вы можете только редактировать существующие.';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
            return;
        }
        
        const response = await fetch(`${API_URL}/api/promotions/${currentEditingPromotionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                startDate, 
                endDate, 
                active,
                reward_type: rewardType,
                reward_value: rewardValue,
                description: finalDescription
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadPromotionsAndQuestsFromDB();
            closeModal('promotion');
            
            const formattedStart = start.toLocaleString('ru-RU');
            const formattedEnd = end.toLocaleString('ru-RU');
            const durationHours = Math.round(diffHours * 10) / 10;
            alert(`✅ Акция обновлена!\n📅 ${formattedStart} → ${formattedEnd}\n⏱️ Длительность: ${durationHours} часов\n${finalDescription}`);
        } else {
            errorElement.textContent = data.message || 'Ошибка сохранения';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorElement.textContent = 'Ошибка подключения к серверу';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
    }
}

// Вспомогательная функция для склонения слова "час"
function getHoursWord(hours) {
    const lastDigit = hours % 10;
    const lastTwoDigits = hours % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return 'часов';
    }
    
    switch (lastDigit) {
        case 1: return 'час';
        case 2:
        case 3:
        case 4: return 'часа';
        default: return 'часов';
    }
}



async function togglePromotion(id, isActive) {
    const promo = promotions.find(p => p.id === id);
    if (promo) {
        promo.active = isActive;
        try {
            await fetch(`${API_URL}/api/promotions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(promo)
            });
        } catch (error) {}
        renderPromotionsList();
    }
}

// ========== ЗАДАНИЯ ==========
function renderQuestsManagerList() {
    const container = document.getElementById('questsManagerList');
    if (!container) return;
    if (!questsManager || questsManager.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет заданий. Задания создаются автоматически при регистрации компании.</div>';
        return;
    }
    
    container.innerHTML = questsManager.map(quest => {
        const endDate = quest.end_date ? new Date(quest.end_date) : null;
        const isExpired = endDate ? endDate < new Date() : false;
        const status = isExpired ? 'expired' : (quest.active ? 'active' : 'inactive');
        const statusText = isExpired ? 'Окончено' : (quest.active ? 'Активно' : 'Отключено');
        
        return `
            <div class="promotion-item">
                <div class="promotion-header">
                    <div class="promotion-emojis">${quest.emoji || '✅'}</div>
                    <div class="promotion-name">${escapeHtml(quest.title)}</div>
                    <div class="promotion-reward" style="background:#ffd966; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:700;">+${quest.reward} бонусов</div>
                    <div class="promotion-status ${status}">${statusText}</div>
                    <button class="btn-edit" onclick="editQuest(${quest.id})" style="background:#17a2b8; color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer;">✏️</button>
                </div>
                <div class="promotion-desc" style="font-size:13px; color:#555; margin:8px 0 4px 60px;">${escapeHtml(quest.description || '')}</div>
                <div class="promotion-dates" style="font-size:11px; color:#999; margin-left:60px;">
                    ${endDate ? `📅 Действует до: ${endDate.toLocaleDateString('ru-RU')}` : '⏱️ Срок не установлен'}
                    ${isExpired ? '<span style="color:#e74c3c; margin-left:8px;">⏰ Задание завершено</span>' : ''}
                    ${status === 'active' ? '<span style="color:#2ecc71; margin-left:8px;">✅ Активно сейчас</span>' : ''}
                </div>
                <div class="promotion-actions" style="margin-left:60px; margin-top:8px;">
                    <label style="font-size:13px;">Активно: <input type="checkbox" ${quest.active && !isExpired ? 'checked' : ''} ${isExpired ? 'disabled' : ''} onchange="toggleQuest(${quest.id}, this.checked)"></label>
                </div>
            </div>
        `;
    }).join('');
}

function showAddQuestModal() {
    alert('❌ Добавление новых заданий отключено.\nЗадания создаются автоматически при регистрации компании.\nВы можете только редактировать существующие задания через кнопку ✏️');
}

async function editQuest(questId) {
    const quest = questsManager.find(q => q.id === questId);
    if (!quest) return;
    
    currentEditingQuestId = questId;
    
    // Заполняем поля названия и описания (только для чтения)
    const titleInput = document.getElementById('questTitle');
    const descInput = document.getElementById('questDesc');
    
    if (titleInput) {
        titleInput.value = quest.title;
        titleInput.disabled = true;
        titleInput.style.background = '#f0f0f0';
        titleInput.style.cursor = 'not-allowed';
    }
    
    if (descInput) {
        descInput.value = quest.description || '';
        descInput.disabled = true;
        descInput.style.background = '#f0f0f0';
        descInput.style.cursor = 'not-allowed';
    }
    
    // Разрешаем редактировать только награду и срок
    const rewardInput = document.getElementById('questReward');
    if (rewardInput) {
        rewardInput.value = quest.reward;
    }
    
    const activeCheckbox = document.getElementById('questActive');
    if (activeCheckbox) {
        activeCheckbox.checked = quest.active;
    }
    
    // Устанавливаем дату окончания если есть
    const endDateInput = document.getElementById('questEndDate');
    if (endDateInput) {
        if (quest.end_date) {
            const endDate = new Date(quest.end_date);
            endDateInput.value = endDate.toISOString().slice(0, 16);
        } else {
            endDateInput.value = '';
        }
    }
    
    document.getElementById('questModalTitle').textContent = 'Редактировать задание';
    openModal('quest');
}

async function saveQuest() {
    const reward = parseInt(document.getElementById('questReward').value) || 10;
    const active = document.getElementById('questActive').checked;
    const endDate = document.getElementById('questEndDate').value;
    const errorElement = document.getElementById('questError');
    
    // Валидация награды
    if (reward <= 0) {
        errorElement.textContent = '❌ Укажите количество бонусов (больше 0)';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    const saveBtn = document.getElementById('saveQuestBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/quests/${currentEditingQuestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reward, active, endDate })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadPromotionsAndQuestsFromDB();
            closeModal('quest');
            alert('✅ Задание обновлено!');
        } else {
            errorElement.textContent = data.message || 'Ошибка сохранения';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        errorElement.textContent = 'Ошибка подключения к серверу';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function toggleQuest(id, isActive) {
    const quest = questsManager.find(q => q.id === id);
    if (quest) {
        quest.active = isActive;
        try {
            await fetch(`${API_URL}/api/quests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: isActive })
            });
        } catch (error) {}
        renderQuestsManagerList();
    }
}

// ========== НАСТРОЙКИ ==========
async function saveBusinessSettings() {
    if (!currentBusiness) {
        alert('Ошибка: не загружены данные компании');
        return;
    }
    
    try {
        const brandColor = document.getElementById('brandColor')?.value || '#2A4B7C';
        
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/branding`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandColor })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Настройки брендирования сохранены!\n\nЦвет будет применен в mini-app при следующем открытии.');
        } else {
            alert('❌ Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка подключения к серверу');
    }
}

// Загрузить информацию о компании (только для чтения)
function loadCompanyInformation() {
    if (!currentBusiness) return;
    
    document.getElementById('infoCompanyName').textContent = currentBusiness.company || '-';
    document.getElementById('infoOwnerName').textContent = currentBusiness.name || '-';
    document.getElementById('infoEmail').textContent = currentBusiness.email || '-';
    document.getElementById('infoPhone').textContent = currentBusiness.phone || '-';
}

// Загрузить цвет бренда
function loadBrandColor() {
    if (!currentBusiness) return;
    
    const brandColor = currentBusiness.brand_color || currentBusiness.brandColor || '#2A4B7C';
    const colorInput = document.getElementById('brandColor');
    if (colorInput) {
        colorInput.value = brandColor;
        updateBrandPreview(brandColor);
    }
}

// Обновить предпросмотр брендирования
function updateBrandPreview(color) {
    const previewBtn = document.querySelector('.preview-btn');
    const previewBar = document.querySelector('.preview-bar');
    const previewBadge = document.querySelector('.preview-badge');
    
    if (previewBtn) previewBtn.style.background = color;
    if (previewBar) previewBar.style.background = `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`;
    if (previewBadge) previewBadge.style.background = color;
}

// Обработчик изменения цвета бренда
document.addEventListener('DOMContentLoaded', () => {
    const brandColorInput = document.getElementById('brandColor');
    if (brandColorInput) {
        brandColorInput.addEventListener('input', (e) => {
            updateBrandPreview(e.target.value);
        });
    }
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.crm-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const module = btn.dataset.module;
            document.querySelectorAll('.crm-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.crm-module').forEach(m => m.classList.remove('active'));
            const activeModule = document.getElementById(`${module}Module`);
            if (activeModule) activeModule.classList.add('active');
            if (module === 'marketing') {
                renderPromotionsList();
                renderQuestsManagerList();
            }
            if (module === 'loyalty') {
                loadLoyaltySettings();
            }
            if (module === 'information') {
                loadCompanyInformation();
            }
            if (module === 'settings') {
                loadBrandColor();
            }
        });
    });
    
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadAnalytics();
        });
    });
    
    const programActive = document.getElementById('programActive');
    if (programActive) {
        programActive.addEventListener('change', () => {
            const label = document.getElementById('programStatusLabel');
            if (label) label.textContent = programActive.checked ? 'Активна' : 'Приостановлена';
        });
    }
    
    const savedGames = localStorage.getItem('loyalty_games');
    if (savedGames) try { games = JSON.parse(savedGames); } catch(e) {}
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
	const rewardTypeSelect = document.getElementById('promoRewardType');
    if (rewardTypeSelect) {
        rewardTypeSelect.addEventListener('change', (e) => toggleRewardFields(e.target.value));
    }
});

// Добавьте эти функции в script.js

// ========== НАСТРОЙКА КОЛЕСА ФОРТУНЫ ==========
let wheelSettings = {
    spinCost: 25,
    sectors: [
        { name: 'x5', value: 5, multiplier: 5, color: '#2ecc71', icon: '⭐', weight: 15 },
        { name: 'x2', value: 2, multiplier: 2, color: '#3498db', icon: '🎯', weight: 25 },
        { name: 'x10', value: 10, multiplier: 10, color: '#e74c3c', icon: '🔥', weight: 5 },
        { name: 'x0', value: 0, multiplier: 0, color: '#95a5a6', icon: '💀', weight: 30 },
        { name: 'x3', value: 3, multiplier: 3, color: '#f39c12', icon: '✨', weight: 20 },
        { name: 'x1', value: 1, multiplier: 1, color: '#1abc9c', icon: '🍀', weight: 35 },
        { name: 'x20', value: 20, multiplier: 20, color: '#9b59b6', icon: '💎', weight: 3 },
        { name: 'x15', value: 15, multiplier: 15, color: '#e67e22', icon: '🏆', weight: 10 }
    ],
    maxSpinsPerDay: 10,
    freeSpinDaily: false,
    active: true
};

let wheelSettingsLoaded = false;

async function loadWheelSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/wheel`);
        const data = await response.json();
        
        if (data.success) {
            wheelSettings = {
                spinCost: data.settings.spinCost || 25,
                sectors: data.settings.sectors || wheelSettings.sectors,
                maxSpinsPerDay: data.settings.maxSpinsPerDay || 10,
                freeSpinDaily: data.settings.freeSpinDaily || false
            };
            wheelSettings.active = data.active;
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек колеса:', error);
    }
    
    wheelSettingsLoaded = true;
    renderWheelSettings();
}

function renderWheelSettings() {
    const container = document.getElementById('wheelSettingsContainer');
    if (!container) return;
    
    const totalWeight = wheelSettings.sectors.reduce((sum, s) => sum + (s.weight || 10), 0);
    
    container.innerHTML = `
        <div class="wheel-settings-card">
            <div class="wheel-header">
                <h3>🎡 Колесо фортуны</h3>
                <div class="toggle-switch">
                    <input type="checkbox" id="wheelActive" ${wheelSettings.active ? 'checked' : ''} onchange="toggleWheelActive(this.checked)">
                    <span>${wheelSettings.active ? 'Активно' : 'Отключено'}</span>
                </div>
            </div>
            
            <div class="wheel-settings-grid">
                <div class="wheel-setting-group">
                    <label>💰 Стоимость вращения (бонусов)</label>
                    <input type="number" id="wheelSpinCost" value="${wheelSettings.spinCost}" min="1" max="1000" onchange="updateWheelSpinCost(this.value)">
                </div>
                <div class="wheel-setting-group">
                    <label>🔄 Максимум вращений в день</label>
                    <input type="number" id="wheelMaxSpins" value="${wheelSettings.maxSpinsPerDay}" min="1" max="100" onchange="updateWheelMaxSpins(this.value)">
                </div>
                <div class="wheel-setting-group">
                    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                        <span>🎁 Бесплатное вращение в день</span>
                        <input type="checkbox" 
                               id="wheelFreeSpin" 
                               ${wheelSettings.freeSpinDaily ? 'checked' : ''} 
                               onchange="updateWheelFreeSpin(this.checked)"
                               style="width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: #ff4d4d;">
                        <span id="wheelFreeSpinStatus" style="font-size: 12px; color: ${wheelSettings.freeSpinDaily ? '#2ecc71' : '#888'}">
                            ${wheelSettings.freeSpinDaily ? '✅ Включена' : '⭕ Отключена'}
                        </span>
                    </label>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">🎯 Сектора колеса</h4>
                <div class="sectors-list" id="sectorsList"></div>
                <button class="btn-add-sector" onclick="addSector()">+ Добавить сектор</button>
            </div>
            
            <div class="wheel-stats">
                <h4>📊 Статистика вероятностей</h4>
                <div class="wheel-stats-grid" id="wheelStats"></div>
            </div>
        </div>
    `;
    
    renderSectorsList();
    renderWheelStats();
}

function renderSectorsList() {
    const container = document.getElementById('sectorsList');
    if (!container) return;
    
    container.innerHTML = wheelSettings.sectors.map((sector, idx) => `
        <div class="sector-item">
            <div class="sector-preview" style="background: ${sector.color}">
                <span>${sector.icon}</span>
                <span>${sector.name}</span>
            </div>
            <div class="sector-fields">
                <div class="sector-field">
                    <label>Название</label>
                    <input type="text" value="${sector.name}" onchange="updateSector(${idx}, 'name', this.value)" style="width: 60px;">
                </div>
                <div class="sector-field">
                    <label>Значение</label>
                    <input type="number" value="${sector.value}" onchange="updateSector(${idx}, 'value', parseInt(this.value))" style="width: 70px;">
                </div>
                <div class="sector-field">
                    <label>Вес (%)</label>
                    <input type="number" value="${sector.weight || 10}" onchange="updateSector(${idx}, 'weight', parseInt(this.value))" min="1" max="100" style="width: 70px;">
                </div>
                <div class="sector-field">
                    <label>Цвет</label>
                    <input type="color" value="${sector.color}" onchange="updateSector(${idx}, 'color', this.value)" style="width: 50px; height: 32px;">
                </div>
                <div class="sector-field">
                    <label>Иконка</label>
                    <select onchange="updateSector(${idx}, 'icon', this.value)" style="width: 60px;">
                        ${getIconOptions(sector.icon)}
                    </select>
                </div>
            </div>
            <button class="sector-remove" onclick="removeSector(${idx})" ${wheelSettings.sectors.length <= 3 ? 'disabled style="opacity:0.5"' : ''}>🗑️</button>
        </div>
    `).join('');
}

function renderWheelStats() {
    const container = document.getElementById('wheelStats');
    if (!container) return;
    
    const totalWeight = wheelSettings.sectors.reduce((sum, s) => sum + (s.weight || 10), 0);
    const expectedValue = wheelSettings.sectors.reduce((sum, s) => sum + (s.value * (s.weight / totalWeight)), 0);
    
    container.innerHTML = `
        <div>
            <div class="wheel-stat-value">${totalWeight}%</div>
            <div class="wheel-stat-label">Сумма весов</div>
        </div>
        <div>
            <div class="wheel-stat-value">${expectedValue.toFixed(2)}</div>
            <div class="wheel-stat-label">Ожидаемый выигрыш</div>
        </div>
        <div>
            <div class="wheel-stat-value">${wheelSettings.spinCost}</div>
            <div class="wheel-stat-label">Стоимость вращения</div>
        </div>
    `;
    
    // Предупреждение если ожидаемый выигрыш слишком большой
    if (expectedValue > wheelSettings.spinCost) {
        const warning = document.createElement('div');
        warning.className = 'warning-text';
        warning.innerHTML = '⚠️ Внимание: ожидаемый выигрыш превышает стоимость вращения! Это может привести к быстрому накоплению бонусов у пользователей.';
        if (!container.parentElement.querySelector('.warning-text')) {
            container.parentElement.appendChild(warning);
        }
    } else if (container.parentElement.querySelector('.warning-text')) {
        container.parentElement.querySelector('.warning-text').remove();
    }
}

function getIconOptions(selectedIcon) {
    const icons = ['⭐', '🎯', '🔥', '💀', '✨', '🍀', '💎', '🏆', '🎲', '💰', '🎁', '⚡', '👑', '🎉'];
    return icons.map(icon => `<option value="${icon}" ${selectedIcon === icon ? 'selected' : ''}>${icon}</option>`).join('');
}

function updateSector(index, field, value) {
    if (wheelSettings.sectors[index]) {
        wheelSettings.sectors[index][field] = value;
        renderSectorsList();
        renderWheelStats();
        saveWheelSettingsDebounced();
    }
}

function addSector() {
    const newSector = {
        name: `x${wheelSettings.sectors.length + 1}`,
        value: wheelSettings.sectors.length + 1,
        multiplier: wheelSettings.sectors.length + 1,
        color: getRandomColor(),
        icon: '🎲',
        weight: 10
    };
    wheelSettings.sectors.push(newSector);
    renderSectorsList();
    renderWheelStats();
    saveWheelSettingsDebounced();
}

function removeSector(index) {
    if (wheelSettings.sectors.length <= 3) {
        alert('❌ Нельзя удалить сектор. Минимум 3 сектора');
        return;
    }
    if (confirm(`Удалить сектор "${wheelSettings.sectors[index].name}"?`)) {
        wheelSettings.sectors.splice(index, 1);
        renderSectorsList();
        renderWheelStats();
        saveWheelSettingsDebounced();
    }
}

function getRandomColor() {
    const colors = ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#1abc9c', '#9b59b6', '#e67e22', '#95a5a6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function updateWheelSpinCost(value) {
    wheelSettings.spinCost = parseInt(value) || 25;
    renderWheelStats();
    saveWheelSettingsDebounced();
}

function updateWheelMaxSpins(value) {
    wheelSettings.maxSpinsPerDay = parseInt(value) || 10;
    saveWheelSettingsDebounced();
}

function updateWheelFreeSpin(checked) {
    wheelSettings.freeSpinDaily = checked;
    
    // Обновляем текст статуса
    const statusSpan = document.getElementById('wheelFreeSpinStatus');
    if (statusSpan) {
        statusSpan.textContent = checked ? '✅ Включена' : '⭕ Отключена';
        statusSpan.style.color = checked ? '#2ecc71' : '#888';
    }
    
    saveWheelSettingsDebounced();
}

function toggleWheelActive(active) {
    wheelSettings.active = active;
    saveWheelSettingsDebounced();
}

let saveWheelTimeout = null;

function saveWheelSettingsDebounced() {
    if (saveWheelTimeout) clearTimeout(saveWheelTimeout);
    saveWheelTimeout = setTimeout(() => saveWheelSettings(), 1000);
}

async function saveWheelSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/wheel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: {
                    spinCost: wheelSettings.spinCost,
                    sectors: wheelSettings.sectors,
                    maxSpinsPerDay: wheelSettings.maxSpinsPerDay,
                    freeSpinDaily: wheelSettings.freeSpinDaily
                },
                active: wheelSettings.active
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек колеса:', error);
    }
}

async function saveAllGameSettings() {
    await saveWheelSettings();
    await saveScratchSettings();
	await saveDiceSettings();
    alert('✅ Все настройки игр сохранены!');
}

// ========== НАСТРОЙКА СКРЕТЧ-КАРТЫ ==========
let scratchSettings = {
    cost: 20,
    maxAttempts: 3,
    symbols: [
        { id: '🍒', name: 'Вишня', value: 10, multiplier: 1, color: '#e74c3c', prob: 15 },
        { id: '🍋', name: 'Лимон', value: 15, multiplier: 1.5, color: '#f1c40f', prob: 14 },
        { id: '🍊', name: 'Апельсин', value: 20, multiplier: 2, color: '#e67e22', prob: 13 },
        { id: '🍉', name: 'Арбуз', value: 25, multiplier: 2.5, color: '#2ecc71', prob: 12 },
        { id: '⭐', name: 'Звезда', value: 50, multiplier: 5, color: '#f39c12', prob: 10 },
        { id: '💎', name: 'Алмаз', value: 100, multiplier: 10, color: '#9b59b6', prob: 8 },
        { id: '7️⃣', name: 'Семёрка', value: 200, multiplier: 20, color: '#e74c3c', prob: 5 },
        { id: '🎰', name: 'ДЖЕКПОТ', value: 500, multiplier: 50, color: '#ff4d4d', prob: 3 }
    ],
    hintCost: 15,
    freeHintDaily: false,
    active: true
};

let scratchSettingsLoaded = false;

async function loadScratchSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/scratch`);
        const data = await response.json();
        
        if (data.success) {
            scratchSettings = {
                cost: data.settings.cost || 20,
                maxAttempts: data.settings.maxAttempts || 3,
                symbols: data.settings.symbols || scratchSettings.symbols,
                hintCost: data.settings.hintCost || 15,
                freeHintDaily: data.settings.freeHintDaily || false
            };
            scratchSettings.active = data.active;
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек скретч-карты:', error);
    }
    
    scratchSettingsLoaded = true;
    renderScratchSettings();
}

function renderScratchSettings() {
    const container = document.getElementById('scratchSettingsContainer');
    if (!container) return;
    
    const totalProb = scratchSettings.symbols.reduce((sum, s) => sum + (s.prob || 10), 0);
    
    container.innerHTML = `
        <div class="scratch-settings-card">
            <div class="scratch-header">
                <h3>🎫 Скретч-карта (Найди 3 одинаковых)</h3>
                <div class="toggle-switch">
                    <input type="checkbox" id="scratchActive" ${scratchSettings.active ? 'checked' : ''} onchange="toggleScratchActive(this.checked)">
                    <span>${scratchSettings.active ? 'Активна' : 'Отключена'}</span>
                </div>
            </div>
            
            <div class="scratch-settings-grid">
                <div class="scratch-setting-group">
                    <label>💰 Стоимость игры (бонусов)</label>
                    <input type="number" id="scratchCost" value="${scratchSettings.cost}" min="1" max="500" onchange="updateScratchCost(this.value)">
                </div>
                <div class="scratch-setting-group">
                    <label>🖱️ Максимум попыток</label>
                    <input type="number" id="scratchMaxAttempts" value="${scratchSettings.maxAttempts}" min="1" max="10" onchange="updateScratchMaxAttempts(this.value)">
                </div>
                <div class="scratch-setting-group">
                    <label>💡 Стоимость подсказки (бонусов)</label>
                    <input type="number" id="scratchHintCost" value="${scratchSettings.hintCost}" min="0" max="100" onchange="updateScratchHintCost(this.value)">
                </div>
                <div class="scratch-setting-group">
                    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                        <span>🎁 Бесплатная подсказка в день</span>
                        <input type="checkbox" 
                               id="scratchFreeHint" 
                               ${scratchSettings.freeHintDaily ? 'checked' : ''} 
                               onchange="updateScratchFreeHint(this.checked)"
                               style="width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: #ff4d4d;">
                        <span id="scratchFreeHintStatus" style="font-size: 12px; color: ${scratchSettings.freeHintDaily ? '#2ecc71' : '#888'}">
                            ${scratchSettings.freeHintDaily ? '✅ Включена' : '⭕ Отключена'}
                        </span>
                    </label>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">🎯 Символы и призы</h4>
                <div class="symbols-list" id="symbolsList"></div>
                <button class="btn-add-symbol" onclick="addSymbol()">+ Добавить символ</button>
            </div>
            
            <div class="scratch-stats">
                <h4>📊 Статистика вероятностей</h4>
                <div class="scratch-stats-grid" id="scratchStats"></div>
            </div>
        </div>
    `;
    
    renderSymbolsList();
    renderScratchStats();
}

function renderSymbolsList() {
    const container = document.getElementById('symbolsList');
    if (!container) return;
    
    container.innerHTML = scratchSettings.symbols.map((symbol, idx) => `
        <div class="symbol-item">
            <div class="symbol-preview" style="background: ${symbol.color}">
                <span>${symbol.id}</span>
                <span>${symbol.name}</span>
            </div>
            <div class="symbol-fields">
                <div class="symbol-field">
                    <label>Эмодзи</label>
                    <input type="text" value="${symbol.id}" onchange="updateSymbol(${idx}, 'id', this.value)" maxlength="2" style="width: 50px;">
                </div>
                <div class="symbol-field">
                    <label>Название</label>
                    <input type="text" value="${symbol.name}" onchange="updateSymbol(${idx}, 'name', this.value)" style="width: 80px;">
                </div>
                <div class="symbol-field">
                    <label>Бонус</label>
                    <input type="number" value="${symbol.value}" onchange="updateSymbol(${idx}, 'value', parseInt(this.value))" style="width: 70px;">
                </div>
                <div class="symbol-field">
                    <label>Множитель</label>
                    <input type="number" step="0.5" value="${symbol.multiplier}" onchange="updateSymbol(${idx}, 'multiplier', parseFloat(this.value))" style="width: 70px;">
                </div>
                <div class="symbol-field">
                    <label>Вес (%)</label>
                    <input type="number" value="${symbol.prob || 10}" onchange="updateSymbol(${idx}, 'prob', parseInt(this.value))" min="1" max="100" style="width: 70px;">
                </div>
                <div class="symbol-field">
                    <label>Цвет</label>
                    <input type="color" value="${symbol.color}" onchange="updateSymbol(${idx}, 'color', this.value)" style="width: 50px; height: 32px;">
                </div>
            </div>
            <button class="symbol-remove" onclick="removeSymbol(${idx})" ${scratchSettings.symbols.length <= 3 ? 'disabled style="opacity:0.5"' : ''}>🗑️</button>
        </div>
    `).join('');
}

function renderScratchStats() {
    const container = document.getElementById('scratchStats');
    if (!container) return;
    
    const totalProb = scratchSettings.symbols.reduce((sum, s) => sum + (s.prob || 10), 0);
    const avgWin = scratchSettings.symbols.reduce((sum, s) => sum + (s.value * s.multiplier * (s.prob / totalProb)), 0);
    const maxWin = Math.max(...scratchSettings.symbols.map(s => s.value * s.multiplier));
    
    container.innerHTML = `
        <div>
            <div class="scratch-stat-value">${totalProb}%</div>
            <div class="scratch-stat-label">Сумма весов</div>
        </div>
        <div>
            <div class="scratch-stat-value">${avgWin.toFixed(0)}</div>
            <div class="scratch-stat-label">Ср. выигрыш</div>
        </div>
        <div>
            <div class="scratch-stat-value">${maxWin}</div>
            <div class="scratch-stat-label">Макс. выигрыш</div>
        </div>
        <div>
            <div class="scratch-stat-value">${scratchSettings.cost}</div>
            <div class="scratch-stat-label">Стоимость</div>
        </div>
    `;
}

function updateSymbol(index, field, value) {
    if (scratchSettings.symbols[index]) {
        scratchSettings.symbols[index][field] = value;
        renderSymbolsList();
        renderScratchStats();
        saveScratchSettingsDebounced();
    }
}

function addSymbol() {
    const newSymbol = {
        id: '🎲',
        name: `Символ ${scratchSettings.symbols.length + 1}`,
        value: 50,
        multiplier: 5,
        color: getRandomColor(),
        prob: 10
    };
    scratchSettings.symbols.push(newSymbol);
    renderSymbolsList();
    renderScratchStats();
    saveScratchSettingsDebounced();
}

function removeSymbol(index) {
    if (scratchSettings.symbols.length <= 3) {
        alert('❌ Нельзя удалить символ. Минимум 3 символа');
        return;
    }
    if (confirm(`Удалить символ "${scratchSettings.symbols[index].name}"?`)) {
        scratchSettings.symbols.splice(index, 1);
        renderSymbolsList();
        renderScratchStats();
        saveScratchSettingsDebounced();
    }
}

function updateScratchCost(value) {
    scratchSettings.cost = parseInt(value) || 20;
    renderScratchStats();
    saveScratchSettingsDebounced();
}

function updateScratchMaxAttempts(value) {
    scratchSettings.maxAttempts = parseInt(value) || 3;
    saveScratchSettingsDebounced();
}

function updateScratchHintCost(value) {
    scratchSettings.hintCost = parseInt(value) || 15;
    saveScratchSettingsDebounced();
}

function updateScratchFreeHint(checked) {
    scratchSettings.freeHintDaily = checked;
    
    // Обновляем текст статуса
    const statusSpan = document.getElementById('scratchFreeHintStatus');
    if (statusSpan) {
        statusSpan.textContent = checked ? '✅ Включена' : '⭕ Отключена';
        statusSpan.style.color = checked ? '#2ecc71' : '#888';
    }
    
    saveScratchSettingsDebounced();
}

function toggleScratchActive(active) {
    scratchSettings.active = active;
    saveScratchSettingsDebounced();
}

let saveScratchTimeout = null;

function saveScratchSettingsDebounced() {
    if (saveScratchTimeout) clearTimeout(saveScratchTimeout);
    saveScratchTimeout = setTimeout(() => saveScratchSettings(), 1000);
}

async function saveScratchSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/scratch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: {
                    cost: scratchSettings.cost,
                    maxAttempts: scratchSettings.maxAttempts,
                    symbols: scratchSettings.symbols,
                    hintCost: scratchSettings.hintCost,
                    freeHintDaily: scratchSettings.freeHintDaily
                },
                active: scratchSettings.active
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек скретч-карты:', error);
    }
}
// Добавьте в script.js после функций для скретч-карты

// ========== НАСТРОЙКА ИГРЫ В КОСТИ ==========
let diceSettings = {
    cost: 25,
    jackpotBase: 1000,
    betMultipliers: [1, 2, 3, 5, 10],
    combinations: {
        '2': { name: 'Змеиные глаза', multiplier: 15, icon: '🐍', color: '#2ecc71', description: 'Редкая комбинация!', enabled: true },
        '3': { name: 'Тройка', multiplier: 4, icon: '3️⃣', color: '#f39c12', description: 'Счастливое число', enabled: true },
        '4': { name: 'Четверка', multiplier: 3, icon: '4️⃣', color: '#16a085', description: 'Хорошо!', enabled: true },
        '5': { name: 'Пятерка', multiplier: 2.5, icon: '5️⃣', color: '#27ae60', description: 'Неплохо!', enabled: true },
        '6': { name: 'Шестерка', multiplier: 2, icon: '6️⃣', color: '#2980b9', description: 'Средний результат', enabled: true },
        '7': { name: 'Счастливая семерка', multiplier: 8, icon: '🍀', color: '#f1c40f', description: 'Удача на вашей стороне!', enabled: true },
        '8': { name: 'Восьмерка', multiplier: 2.5, icon: '8️⃣', color: '#8e44ad', description: 'Хорошо!', enabled: true },
        '9': { name: 'Девятка', multiplier: 3, icon: '9️⃣', color: '#d35400', description: 'Отлично!', enabled: true },
        '10': { name: 'Десятка', multiplier: 4, icon: '🔟', color: '#c0392b', description: 'Прекрасно!', enabled: true },
        '11': { name: 'Одиннадцать', multiplier: 6, icon: '✨', color: '#e67e22', description: 'Отличная комбинация!', enabled: true },
        '12': { name: 'Боксерские перчатки', multiplier: 15, icon: '🥊', color: '#e74c3c', description: 'Максимальная удача!', enabled: true },
        'double': { name: 'Дубль', multiplier: 5, icon: '🎲', color: '#9b59b6', description: 'Одинаковые кости!', enabled: true },
        'even': { name: 'Четная сумма', multiplier: 1.5, icon: '📊', color: '#3498db', description: 'Хороший результат', enabled: true },
        'odd': { name: 'Нечетная сумма', multiplier: 1.2, icon: '🎯', color: '#1abc9c', description: 'Неплохо!', enabled: true }
    },
    jackpotChance: 1,
    jackpotContribution: 10,
    active: true
};

let diceSettingsLoaded = false;

async function loadDiceSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/dice`);
        const data = await response.json();
        
        if (data.success) {
            diceSettings = {
                cost: data.settings.cost || 25,
                jackpotBase: data.settings.jackpotBase || 1000,
                betMultipliers: data.settings.betMultipliers || [1, 2, 3, 5, 10],
                combinations: data.settings.combinations || diceSettings.combinations,
                jackpotChance: data.settings.jackpotChance || 1,
                jackpotContribution: data.settings.jackpotContribution || 10
            };
            diceSettings.active = data.active;
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек костей:', error);
    }
    
    diceSettingsLoaded = true;
    renderDiceSettings();
}

function renderDiceSettings() {
    const container = document.getElementById('diceSettingsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dice-settings-card">
            <div class="dice-header-settings">
                <h3>🎲 Кости (Dice Roll)</h3>
                <div class="toggle-switch">
                    <input type="checkbox" id="diceActive" ${diceSettings.active ? 'checked' : ''} onchange="toggleDiceActive(this.checked)">
                    <span>${diceSettings.active ? 'Активна' : 'Отключена'}</span>
                </div>
            </div>
            
            <div class="dice-settings-grid">
                <div class="dice-setting-group">
                    <label>💰 Стоимость игры (бонусов)</label>
                    <input type="number" id="diceCost" value="${diceSettings.cost}" min="1" max="500" onchange="updateDiceCost(this.value)">
                </div>
                <div class="dice-setting-group">
                    <label>💎 Базовый джекпот</label>
                    <input type="number" id="diceJackpotBase" value="${diceSettings.jackpotBase}" min="100" max="10000" onchange="updateDiceJackpotBase(this.value)">
                </div>
                <div class="dice-setting-group">
                    <label>🎲 Шанс на джекпот (%)</label>
                    <input type="number" id="diceJackpotChance" value="${diceSettings.jackpotChance}" min="0" max="10" step="0.5" onchange="updateDiceJackpotChance(this.value)">
                    <small style="font-size: 10px; color: #666;">0.5 = 0.5% шанс</small>
                </div>
                <div class="dice-setting-group">
                    <label>📈 Пополнение джекпота (%)</label>
                    <input type="number" id="diceJackpotContribution" value="${diceSettings.jackpotContribution}" min="0" max="50" onchange="updateDiceJackpotContribution(this.value)">
                    <small style="font-size: 10px; color: #666;">% от проигрыша в джекпот</small>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">⚡ Множители ставки</h4>
                <div class="multipliers-list" id="multipliersList"></div>
                <button class="btn-add-multiplier" onclick="addMultiplier()">+ Добавить множитель</button>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">🎯 Комбинации и выигрыши</h4>
                <div class="combinations-list" id="diceCombinationsList"></div>
            </div>
            
            <div class="dice-stats-info">
                <h4>📊 Информация</h4>
                <div class="dice-stats-grid" id="diceStatsInfo"></div>
            </div>
        </div>
    `;
    
    renderMultipliersList();
    renderDiceCombinationsList();
    renderDiceStatsInfo();
}

function renderMultipliersList() {
    const container = document.getElementById('multipliersList');
    if (!container) return;
    
    if (diceSettings.betMultipliers.length === 0) {
        container.innerHTML = '<div style="color: #888; padding: 10px;">Нет множителей</div>';
        return;
    }
    
    container.innerHTML = diceSettings.betMultipliers.map((mult, idx) => `
        <div class="multiplier-tag">
            <span style="font-weight: bold;">x${mult}</span>
            <button onclick="removeMultiplier(${idx})" 
                    style="
                        background: #dc3545; 
                        color: white; 
                        border: none; 
                        border-radius: 50%; 
                        width: 22px; 
                        height: 22px; 
                        font-size: 14px; 
                        cursor: pointer;
                        margin-left: 8px;
                    ">×</button>
        </div>
    `).join('');
}

// Замените существующую функцию addMultiplier на эту:

function addMultiplier() {
    // Создаём модальное окно для ввода множителя
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: #1e2538;
            border-radius: 24px;
            padding: 24px;
            width: 300px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        ">
            <h3 style="color: white; margin-bottom: 20px;">➕ Добавить множитель</h3>
            <input type="number" 
                   id="newMultiplierInput" 
                   placeholder="Например: 1.5, 2, 3.7..."
                   step="0.1"
                   min="0.5"
                   max="50"
                   style="
                       width: 100%;
                       padding: 12px;
                       border-radius: 12px;
                       border: 1px solid #ff4d4d;
                       background: #2a2f3f;
                       color: white;
                       font-size: 16px;
                       text-align: center;
                       margin-bottom: 20px;
                   "
                   autofocus>
            <div style="display: flex; gap: 12px;">
                <button id="confirmMultiplier" style="
                    flex: 1;
                    padding: 12px;
                    background: linear-gradient(135deg, #2ecc71, #27ae60);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                ">✅ Добавить</button>
                <button id="cancelMultiplier" style="
                    flex: 1;
                    padding: 12px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                ">❌ Отмена</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('newMultiplierInput');
    const confirmBtn = document.getElementById('confirmMultiplier');
    const cancelBtn = document.getElementById('cancelMultiplier');
    
    const addMultiplierValue = () => {
        let newMult = parseFloat(input.value);
        
        // Валидация
        if (isNaN(newMult)) {
            alert('❌ Пожалуйста, введите число');
            return;
        }
        
        if (newMult < 0.5) {
            alert('❌ Множитель не может быть меньше 0.5');
            return;
        }
        
        if (newMult > 50) {
            alert('❌ Множитель не может быть больше 50');
            return;
        }
        
        // Проверка на дубликат
        if (diceSettings.betMultipliers.includes(newMult)) {
            alert(`❌ Множитель x${newMult} уже существует`);
            return;
        }
        
        // Добавляем множитель и сортируем
        diceSettings.betMultipliers.push(newMult);
        diceSettings.betMultipliers.sort((a, b) => a - b);
        
        renderMultipliersList();
        saveDiceSettingsDebounced();
        
        modal.remove();
        alert(`✅ Множитель x${newMult} добавлен!`);
    };
    
    confirmBtn.onclick = addMultiplierValue;
    cancelBtn.onclick = () => modal.remove();
    
    // Закрытие по Escape
    const onKeyDown = (e) => {
        if (e.key === 'Escape') modal.remove();
        if (e.key === 'Enter') addMultiplierValue();
    };
    document.addEventListener('keydown', onKeyDown);
    
    // Убираем обработчик при закрытии
    const removeHandler = () => {
        document.removeEventListener('keydown', onKeyDown);
    };
    modal.addEventListener('remove', removeHandler);
}

function removeMultiplier(index) {
    if (diceSettings.betMultipliers.length <= 1) {
        alert('❌ Нельзя удалить последний множитель');
        return;
    }
    
    const multiplier = diceSettings.betMultipliers[index];
    
    // Подтверждение удаления с указанием значения
    if (confirm(`Удалить множитель x${multiplier}?`)) {
        diceSettings.betMultipliers.splice(index, 1);
        renderMultipliersList();
        saveDiceSettingsDebounced();
        alert(`✅ Множитель x${multiplier} удалён`);
    }
}

function renderDiceCombinationsList() {
    const container = document.getElementById('diceCombinationsList');
    if (!container) return;
    
    const combos = Object.entries(diceSettings.combinations);
    
    container.innerHTML = combos.map(([key, combo]) => `
        <div class="combo-config-item">
            <div class="combo-preview" style="background: ${combo.color}20; border-left: 3px solid ${combo.color}">
                <span>${combo.icon}</span>
                <span>${combo.name.substring(0, 10)}</span>
            </div>
            <div class="combo-fields">
                <div class="combo-field">
                    <label>Название</label>
                    <input type="text" value="${combo.name}" onchange="updateDiceCombo('${key}', 'name', this.value)" style="width: 100px;">
                </div>
                <div class="combo-field">
                    <label>Множитель</label>
                    <input type="number" step="0.5" value="${combo.multiplier}" onchange="updateDiceCombo('${key}', 'multiplier', parseFloat(this.value))" style="width: 70px;">
                </div>
                <div class="combo-field">
                    <label>Иконка</label>
                    <input type="text" value="${combo.icon}" onchange="updateDiceCombo('${key}', 'icon', this.value)" maxlength="2" style="width: 50px;">
                </div>
                <div class="combo-field">
                    <label>Цвет</label>
                    <input type="color" value="${combo.color}" onchange="updateDiceCombo('${key}', 'color', this.value)" style="width: 50px; height: 32px;">
                </div>
            </div>
            <div class="combo-toggle">
                <label>Активна</label>
                <input type="checkbox" ${combo.enabled !== false ? 'checked' : ''} onchange="updateDiceCombo('${key}', 'enabled', this.checked)">
            </div>
        </div>
    `).join('');
}

function renderDiceStatsInfo() {
    const container = document.getElementById('diceStatsInfo');
    if (!container) return;
    
    const totalCombos = Object.values(diceSettings.combinations).filter(c => c.enabled !== false).length;
    const maxMultiplier = Math.max(...Object.values(diceSettings.combinations).map(c => c.multiplier));
    const minMultiplier = Math.min(...Object.values(diceSettings.combinations).map(c => c.multiplier));
    
    container.innerHTML = `
        <div>
            <div class="dice-stat-value">${totalCombos}</div>
            <div class="dice-stat-label">Активных комбинаций</div>
        </div>
        <div>
            <div class="dice-stat-value">x${maxMultiplier}</div>
            <div class="dice-stat-label">Макс. множитель</div>
        </div>
        <div>
            <div class="dice-stat-value">x${minMultiplier}</div>
            <div class="dice-stat-label">Мин. множитель</div>
        </div>
        <div>
            <div class="dice-stat-value">${diceSettings.betMultipliers.length}</div>
            <div class="dice-stat-label">Доступно ставок</div>
        </div>
    `;
}

function updateDiceCombo(key, field, value) {
    if (diceSettings.combinations[key]) {
        diceSettings.combinations[key][field] = value;
        renderDiceCombinationsList();
        renderDiceStatsInfo();
        saveDiceSettingsDebounced();
    }
}

function updateDiceCost(value) {
    diceSettings.cost = parseInt(value) || 25;
    renderDiceStatsInfo();
    saveDiceSettingsDebounced();
}

function updateDiceJackpotBase(value) {
    diceSettings.jackpotBase = parseInt(value) || 1000;
    saveDiceSettingsDebounced();
}

function updateDiceJackpotChance(value) {
    diceSettings.jackpotChance = parseFloat(value) || 1;
    saveDiceSettingsDebounced();
}

function updateDiceJackpotContribution(value) {
    diceSettings.jackpotContribution = parseInt(value) || 10;
    saveDiceSettingsDebounced();
}

function toggleDiceActive(active) {
    diceSettings.active = active;
    saveDiceSettingsDebounced();
}

let saveDiceTimeout = null;

function saveDiceSettingsDebounced() {
    if (saveDiceTimeout) clearTimeout(saveDiceTimeout);
    saveDiceTimeout = setTimeout(() => saveDiceSettings(), 1000);
}

async function saveDiceSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/games/${currentBusiness.id}/dice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: {
                    cost: diceSettings.cost,
                    jackpotBase: diceSettings.jackpotBase,
                    betMultipliers: diceSettings.betMultipliers,
                    combinations: diceSettings.combinations,
                    jackpotChance: diceSettings.jackpotChance,
                    jackpotContribution: diceSettings.jackpotContribution
                },
                active: diceSettings.active
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек костей:', error);
    }
}