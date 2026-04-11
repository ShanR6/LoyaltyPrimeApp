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
let games = [
    { id: 1, name: 'Колесо фортуны', active: true, cost: 25, icon: '🎡' },
    { id: 2, name: 'Скретч-карта', active: true, cost: 15, icon: '🎫' }
];

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
    if (businessInfo && currentBusiness) {
        businessInfo.innerHTML = `
            <div class="business-name">${escapeHtml(currentBusiness.company || currentBusiness.name || 'Бизнес')}</div>
            <div class="business-email">${escapeHtml(currentBusiness.email || '')}</div>
        `;
        
        // Загружаем данные бизнеса в модуль информации
        const infoCompanyName = document.getElementById('infoCompanyName');
        const infoOwnerName = document.getElementById('infoOwnerName');
        const infoEmail = document.getElementById('infoEmail');
        const infoPhone = document.getElementById('infoPhone');
        
        if (infoCompanyName) infoCompanyName.textContent = currentBusiness.company || 'Не указано';
        if (infoOwnerName) infoOwnerName.textContent = currentBusiness.name || 'Не указано';
        if (infoEmail) infoEmail.textContent = currentBusiness.email || 'Не указано';
        if (infoPhone) infoPhone.textContent = currentBusiness.phone || 'Не указано';
        
        // Загружаем цвет бренда в форму настроек
        const brandColor = document.getElementById('brandColor');
        const colorPreview = document.getElementById('colorPreview');
        
        if (brandColor) {
            const color = currentBusiness.brand_color || '#2A4B7C';
            brandColor.value = color;
            if (colorPreview) colorPreview.style.backgroundColor = color;
        }
    }
    
    await loadPresetQuests();
    await loadPromotionsAndQuestsFromDB();
    loadAnalytics();
    loadLoyaltySettings();
    loadGamesList();
    loadNotificationsHistory();
    loadUserCount();
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

// ========== МОДУЛЬ 1: АНАЛИТИКА (без VIP) ==========
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
}

function saveLoyaltySettings() {
    saveTiersToServer();
    alert('✅ Настройки уровней сохранены!');
}

// ========== МОДУЛЬ 3: УВЕДОМЛЕНИЯ ==========
async function sendNotification() {
    const title = document.getElementById('notifTitle')?.value || '';
    const message = document.getElementById('notifMessage')?.value || '';
    
    if (!title || !message) {
        alert('Заполните заголовок и сообщение');
        return;
    }
    
    if (!currentBusiness) {
        alert('Ошибка: не загружены данные компании');
        return;
    }
    
    try {
        // Отправляем запрос на бэкенд для рассылки через бота
        const response = await fetch(`${API_URL}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyId: currentBusiness.id,
                segment: 'all',
                title: title,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const notification = { 
                id: Date.now(), 
                segment: 'all', 
                title, 
                message, 
                date: new Date().toLocaleString(), 
                status: 'sent',
                sentCount: data.sentCount || 0
            };
            notificationsHistory.unshift(notification);
            if (notificationsHistory.length > 20) notificationsHistory.pop();
            loadNotificationsHistory();
            
            document.getElementById('notifTitle').value = '';
            document.getElementById('notifMessage').value = '';
            alert(`✅ Уведомление отправлено через бота!\nПолучателей: ${data.sentCount || 0}`);
        } else {
            alert('❌ Ошибка отправки: ' + (data.message || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка подключения к серверу');
    }
}

function getSegmentName(segment) {
    return 'Все пользователи';
}

// Загрузить количество пользователей компании
async function loadUserCount() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/users/count/${currentBusiness.id}`);
        const data = await response.json();
        
        const userCountEl = document.getElementById('userCount');
        if (userCountEl && data.count !== undefined) {
            userCountEl.innerHTML = `👥 В базе данных: <strong>${data.count} пользователей</strong>`;
        }
    } catch (error) {
        console.error('Ошибка загрузки количества пользователей:', error);
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) {
            userCountEl.innerHTML = '❌ Не удалось загрузить количество';
        }
    }
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
                <div class="history-meta">Аудитория: ${getSegmentName(n.segment)} • ${n.sentCount ? n.sentCount + ' получателей • ' : ''}${n.date}</div>
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
        }
        
        const questsResponse = await fetch(`${API_URL}/api/quests/${companyId}`);
        if (questsResponse.ok) {
            questsManager = await questsResponse.json();
        }
        
        renderPromotionsList();
        renderQuestsManagerList();
    } catch (error) {
        console.error('Ошибка загрузки из БД:', error);
    }
}

// ========== АКЦИИ ==========
function renderPromotionsList() {
    const container = document.getElementById('promotionsList');
    if (!container) return;
    if (promotions.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет акций. Добавьте первую!</div>';
        return;
    }
    
    container.innerHTML = promotions.map(promo => {
        const startDate = promo.start_date ? new Date(promo.start_date).toLocaleString() : 'не указана';
        const endDate = promo.end_date ? new Date(promo.end_date).toLocaleString() : 'не указана';
        const now = new Date();
        const isExpired = promo.end_date && new Date(promo.end_date) < now;
        const status = isExpired ? 'expired' : (promo.active ? 'active' : 'inactive');
        const statusText = isExpired ? 'Истекла' : (promo.active ? 'Активна' : 'Отключена');
        
        return `
            <div class="promotion-item">
                <div class="promotion-header">
                    <div class="promotion-emojis">${promo.emoji || '🎯'}</div>
                    <div class="promotion-name">${escapeHtml(promo.name)}</div>
                    <div class="promotion-status ${status}">${statusText}</div>
                    <button class="btn-remove" onclick="deletePromotion(${promo.id})">🗑️</button>
                    <button class="btn-edit" onclick="editPromotion(${promo.id})">✏️</button>
                </div>
                <div class="promotion-desc">${escapeHtml(promo.description)}</div>
                <div class="promotion-dates">📅 ${startDate} → ${endDate}</div>
                <div class="promotion-actions">
                    <label>Активна: <input type="checkbox" ${promo.active && !isExpired ? 'checked' : ''} ${isExpired ? 'disabled' : ''} onchange="togglePromotion(${promo.id}, this.checked)"></label>
                </div>
            </div>
        `;
    }).join('');
}

function showAddPromotionModal() {
    openModal('promotion');
    document.getElementById('promoName').value = '';
    document.getElementById('promoDesc').value = '';
    document.getElementById('promoActive').checked = true;
    document.getElementById('promoEmoji').value = '🎯';
    document.getElementById('promoStartDate').value = '';
    document.getElementById('promoEndDate').value = '';
    document.getElementById('promotionModalTitle').textContent = 'Добавить акцию';
    currentEditingPromotionId = null;
}

async function editPromotion(promotionId) {
    const promo = promotions.find(p => p.id === promotionId);
    if (!promo) return;
    
    currentEditingPromotionId = promotionId;
    document.getElementById('promoName').value = promo.name;
    document.getElementById('promoDesc').value = promo.description || '';
    document.getElementById('promoActive').checked = promo.active;
    document.getElementById('promoEmoji').value = promo.emoji || '🎯';
    if (promo.start_date) {
        const startDate = new Date(promo.start_date);
        document.getElementById('promoStartDate').value = startDate.toISOString().slice(0, 16);
    }
    if (promo.end_date) {
        const endDate = new Date(promo.end_date);
        document.getElementById('promoEndDate').value = endDate.toISOString().slice(0, 16);
    }
    document.getElementById('promotionModalTitle').textContent = 'Редактировать акцию';
    openModal('promotion');
}

async function savePromotion() {
    const name = document.getElementById('promoName').value.trim();
    const emoji = document.getElementById('promoEmoji').value;
    const description = document.getElementById('promoDesc').value.trim();
    const active = document.getElementById('promoActive').checked;
    const startDate = document.getElementById('promoStartDate').value;
    const endDate = document.getElementById('promoEndDate').value;
    const errorElement = document.getElementById('promotionError');
    
    if (!name) {
        errorElement.textContent = 'Введите название акции';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            errorElement.textContent = 'Дата окончания должна быть позже даты начала';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
            return;
        }
        if (end < new Date()) {
            errorElement.textContent = 'Дата окончания не может быть в прошлом';
            errorElement.style.display = 'block';
            setTimeout(() => errorElement.style.display = 'none', 3000);
            return;
        }
    }
    
    try {
        let response;
        if (currentEditingPromotionId) {
            response = await fetch(`${API_URL}/api/promotions/${currentEditingPromotionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, emoji, description, startDate, endDate, active })
            });
        } else {
            response = await fetch(`${API_URL}/api/promotions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: currentBusiness.id, name, emoji, description, startDate, endDate, active })
            });
        }
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadPromotionsAndQuestsFromDB();
            closeModal('promotion');
            alert(currentEditingPromotionId ? '✅ Акция обновлена!' : '✅ Акция сохранена!');
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

async function deletePromotion(id) {
    if (confirm('Удалить акцию?')) {
        try {
            await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE' });
            await loadPromotionsAndQuestsFromDB();
            alert('✅ Акция удалена!');
        } catch (error) {
            alert('❌ Ошибка удаления');
        }
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
        container.innerHTML = '<div class="empty-state">Нет заданий. Добавьте первое!</div>';
        return;
    }
    
    container.innerHTML = questsManager.map(quest => {
        const createdAt = new Date(quest.created_at);
        const expiresDays = quest.expires_days || 30;
        const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
        const isExpired = expiresAt < new Date();
        const status = isExpired ? 'expired' : (quest.active ? 'active' : 'inactive');
        const statusText = isExpired ? 'Окончено' : (quest.active ? 'Активно' : 'Отключено');
        
        return `
            <div class="quest-manager-item">
                <div class="quest-header">
                    <div class="quest-emoji">${quest.emoji || '✅'}</div>
                    <div class="quest-title">${escapeHtml(quest.title)}</div>
                    <div class="quest-reward">+${quest.reward} бонусов</div>
                    <div class="quest-status ${status}">${statusText}</div>
                    <button class="btn-remove" onclick="deleteQuest(${quest.id})">🗑️</button>
                    <button class="btn-edit" onclick="editQuest(${quest.id})">✏️</button>
                </div>
                <div class="quest-desc">${escapeHtml(quest.description || '')}</div>
                <div class="quest-expires">⏱️ Срок действия: ${expiresDays} дней (до ${expiresAt.toLocaleDateString()})</div>
                <div class="quest-actions">
                    <label>Активно: <input type="checkbox" ${quest.active && !isExpired ? 'checked' : ''} ${isExpired ? 'disabled' : ''} onchange="toggleQuest(${quest.id}, this.checked)"></label>
                </div>
            </div>
        `;
    }).join('');
}

function showAddQuestModal() {
    openModal('quest');
    document.getElementById('questTitle').value = '';
    document.getElementById('questDesc').value = '';
    document.getElementById('questReward').value = 10;
    document.getElementById('questActive').checked = true;
    document.getElementById('questEmoji').value = '✅';
    document.getElementById('questExpiresDays').value = 30;
    document.getElementById('questPresetSelect').value = '';
    document.getElementById('questModalTitle').textContent = 'Добавить задание';
    currentEditingQuestId = null;
}

async function editQuest(questId) {
    const quest = questsManager.find(q => q.id === questId);
    if (!quest) return;
    
    currentEditingQuestId = questId;
    document.getElementById('questTitle').value = quest.title;
    document.getElementById('questDesc').value = quest.description || '';
    document.getElementById('questReward').value = quest.reward;
    document.getElementById('questActive').checked = quest.active;
    document.getElementById('questEmoji').value = quest.emoji || '✅';
    document.getElementById('questExpiresDays').value = quest.expires_days || 30;
    document.getElementById('questModalTitle').textContent = 'Редактировать задание';
    openModal('quest');
}

async function saveQuest() {
    const emoji = document.getElementById('questEmoji').value;
    const title = document.getElementById('questTitle').value.trim();
    const description = document.getElementById('questDesc').value.trim();
    const reward = parseInt(document.getElementById('questReward').value) || 10;
    const active = document.getElementById('questActive').checked;
    const expiresDays = parseInt(document.getElementById('questExpiresDays').value) || 30;
    const errorElement = document.getElementById('questError');
    
    if (!title) {
        errorElement.textContent = 'Введите название задания';
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
        return;
    }
    
    const saveBtn = document.getElementById('saveQuestBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        let response;
        if (currentEditingQuestId) {
            response = await fetch(`${API_URL}/api/quests/${currentEditingQuestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji, title, description, reward, active, expiresDays })
            });
        } else {
            response = await fetch(`${API_URL}/api/quests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: currentBusiness.id, emoji, title, description, reward, active, expiresDays })
            });
        }
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadPromotionsAndQuestsFromDB();
            closeModal('quest');
            alert(currentEditingQuestId ? '✅ Задание обновлено!' : '✅ Задание сохранено!');
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

async function deleteQuest(id) {
    if (confirm('Удалить задание?')) {
        try {
            await fetch(`${API_URL}/api/quests/${id}`, { method: 'DELETE' });
            await loadPromotionsAndQuestsFromDB();
            alert('✅ Задание удалено!');
        } catch (error) {
            alert('❌ Ошибка удаления');
        }
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
                body: JSON.stringify(quest)
            });
        } catch (error) {}
        renderQuestsManagerList();
    }
}

// ========== МОДУЛЬ 5: ИГРЫ ==========
function loadGamesList() {
    const container = document.getElementById('gamesList');
    if (!container) return;
    container.innerHTML = games.map(game => `
        <div class="game-item">
            <div class="game-info">
                <div class="game-name">${game.icon} ${escapeHtml(game.name)}</div>
                <div class="game-cost">Стоимость участия: ${game.cost} бонусов</div>
            </div>
            <div class="toggle-switch">
                <input type="checkbox" ${game.active ? 'checked' : ''} onchange="toggleGame(${game.id}, this.checked)">
                <span>${game.active ? 'Активна' : 'Отключена'}</span>
            </div>
        </div>
    `).join('');
}

function toggleGame(id, active) {
    const game = games.find(g => g.id === id);
    if (game) game.active = active;
}

function saveGameSettings() {
    alert('Настройки игр сохранены!');
    localStorage.setItem('loyalty_games', JSON.stringify(games));
}

// ========== НАСТРОЙКИ С БРЕНДИРОВАНИЕМ ==========
function saveBusinessSettings() {
    const brandColor = document.getElementById('brandColor')?.value;
    
    if (!currentBusiness) return;
    
    // Обновляем локальные данные
    currentBusiness.brand_color = brandColor;
    
    // Отправляем обновление на сервер
    fetch(`${API_URL}/api/companies/${currentBusiness.id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            brandColor: brandColor
        })
    }).catch(error => console.error('Ошибка сохранения настроек:', error));
    
    alert('✅ Настройки брендирования сохранены! Цвет бренда обновлен в приложении.');
}

// Предпросмотр цвета
document.addEventListener('DOMContentLoaded', () => {
    const brandColorInput = document.getElementById('brandColor');
    const colorPreview = document.getElementById('colorPreview');
    
    if (brandColorInput && colorPreview) {
        brandColorInput.addEventListener('input', (e) => {
            colorPreview.style.backgroundColor = e.target.value;
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
        });
    });
    
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadAnalytics();
        });
    });
    
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
});