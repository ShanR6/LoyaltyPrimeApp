// ========== УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ==========
function openModal(type) {
    document.getElementById(type + 'Modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(type) {
    document.getElementById(type + 'Modal').classList.remove('active');
    document.body.style.overflow = 'auto';
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
    item.classList.toggle('active');
    const span = element.querySelector('span');
    if (span) span.textContent = item.classList.contains('active') ? '−' : '+';
}

function submitDemo() {
    const brand = document.getElementById('demoBrand')?.value || '';
    const email = document.getElementById('demoEmail')?.value || '';
    if (email && email.includes('@')) {
        alert('Спасибо! Мы свяжемся с вами в ближайшее время.');
        if (document.getElementById('demoBrand')) document.getElementById('demoBrand').value = '';
        if (document.getElementById('demoEmail')) document.getElementById('demoEmail').value = '';
    } else {
        alert('Пожалуйста, введите корректный email');
    }
}

// ========== CRM PANEL DATA ==========
let currentBusiness = null;
let notificationsHistory = [];
let tiers = [
    { name: 'Новичок', threshold: 0, multiplier: 1, color: '#95a5a6' },
    { name: 'Серебро', threshold: 1000, multiplier: 1.2, color: '#bdc3c7' },
    { name: 'Золото', threshold: 5000, multiplier: 1.5, color: '#f1c40f' },
    { name: 'Платина', threshold: 20000, multiplier: 2, color: '#3498db' }
];
let discounts = [
    { name: 'Скидка 5%', type: 'percent', value: 5, minAmount: 500, active: true },
    { name: 'Скидка 10%', type: 'percent', value: 10, minAmount: 1000, active: true }
];
let games = [
    { id: 1, name: 'Колесо фортуны', active: true, cost: 25, icon: '🎡' },
    { id: 2, name: 'Скретч-карта', active: true, cost: 15, icon: '🎫' }
];

let promotions = [];
let questsManager = [];
let currentEditingQuestId = null;
let currentEditingPromotionId = null;

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
    
    await loadPromotionsAndQuestsFromDB();
    loadAnalytics();
    loadLoyaltySettings();
    loadGamesList();
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
        revenue: 1250000, activeUsers: 1234, newUsers: 89, vipCount: 156,
        segments: [
            { name: 'Новые', count: 234, percent: 18, color: '#3498db' },
            { name: 'Активные', count: 567, percent: 44, color: '#2ecc71' },
            { name: 'Постоянные', count: 345, percent: 27, color: '#f39c12' },
            { name: 'Спящие', count: 456, percent: 35, color: '#e74c3c' },
            { name: 'VIP', count: 89, percent: 7, color: '#9b59b6' }
        ],
        dailyActivity: [45, 52, 48, 61, 55, 67, 72, 68, 75, 82, 78, 85, 91, 88],
        topProducts: [
            { name: 'Пицца Маргарита', sales: 234, revenue: 234000 },
            { name: 'Капучино', sales: 189, revenue: 94500 },
            { name: 'Бургер Классик', sales: 156, revenue: 156000 }
        ]
    };
    const totalRevenue = stats.revenue;
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-value">${stats.revenue.toLocaleString()} ₽</div><div class="stat-label">Выручка за месяц</div><div class="stat-trend up">↑ +12%</div></div></div>
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-value">${stats.activeUsers}</div><div class="stat-label">Активных пользователей</div><div class="stat-trend up">↑ +8%</div></div></div>
        <div class="stat-card"><div class="stat-icon">🆕</div><div class="stat-info"><div class="stat-value">${stats.newUsers}</div><div class="stat-label">Новых за месяц</div><div class="stat-trend up">↑ +23%</div></div></div>
        <div class="stat-card"><div class="stat-icon">💎</div><div class="stat-info"><div class="stat-value">${stats.vipCount}</div><div class="stat-label">VIP-клиентов</div><div class="stat-trend up">↑ +5%</div></div></div>
    `;
    document.getElementById('segmentsList').innerHTML = stats.segments.map(seg => `
        <div class="segment-item"><div class="segment-header"><div class="segment-color" style="background-color: ${seg.color}"></div><div class="segment-name">${seg.name}</div><div class="segment-count">${seg.count} чел.</div><div class="segment-percent">${seg.percent}%</div></div><div class="segment-bar"><div class="segment-fill" style="width: ${seg.percent}%; background-color: ${seg.color}"></div></div></div>
    `).join('');
    const maxValue = Math.max(...stats.dailyActivity);
    document.getElementById('activityChart').innerHTML = `<div class="activity-chart">${stats.dailyActivity.slice(-14).map((val, i) => `<div class="bar-container"><div class="bar" style="height: ${(val / maxValue) * 150}px"><span class="bar-value">${val}</span></div><div class="bar-label">Д${i+1}</div></div>`).join('')}</div>`;
    document.getElementById('topProducts').innerHTML = `
        <div class="products-table"><div class="table-header"><div>Продукт</div><div>Продажи</div><div>Выручка</div><div>Доля</div></div>
        ${stats.topProducts.map((p,i) => `<div class="table-row"><div class="product-name"><span class="product-rank">${i+1}</span> ${p.name}</div><div>${p.sales} шт.</div><div>${p.revenue.toLocaleString()} ₽</div><div><div class="product-bar"><div class="product-fill" style="width: ${(p.revenue/totalRevenue)*100}%"></div><span>${Math.round((p.revenue/totalRevenue)*100)}%</span></div></div></div>`).join('')}
        </div>`;
}

// ========== МОДУЛЬ 2: ЛОЯЛЬНОСТЬ ==========
// В script.js, обновите функцию loadLoyaltySettings
window.loadLoyaltySettings = async function() {
    console.log('loadLoyaltySettings вызвана');
    await loadTiersSettings();
    
    const discountsContainer = document.getElementById('discountsList');
    if (discountsContainer) {
        discountsContainer.innerHTML = discounts.map((d, idx) => `
            <div class="discount-item">
                <div class="discount-info">
                    <div class="discount-title">${escapeHtml(d.name)}</div>
                    <div class="discount-desc">${d.type === 'percent' ? `${d.value}% скидка` : d.name} от ${d.minAmount}₽</div>
                </div>
                <div class="toggle-switch">
                    <input type="checkbox" ${d.active ? 'checked' : ''} onchange="toggleDiscount(${idx}, this.checked)">
                    <span>${d.active ? 'Активна' : 'Отключена'}</span>
                </div>
            </div>
        `).join('');
    }
};

// Обновите функцию loadTiersSettings
async function loadTiersSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`);
        const data = await response.json();
        
        if (data.success && data.tiers && data.tiers.length > 0) {
            tiers = data.tiers;
            renderTiersSettings();
        } else {
            // Если нет сохраненных уровней, используем дефолтные
            tiers = [
                { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
                { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
                { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
                { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
            ];
            renderTiersSettings();
        }
    } catch (error) {
        console.error('Ошибка загрузки уровней:', error);
        renderTiersSettings();
    }
}

// Обновите функцию renderTiersSettings
function renderTiersSettings() {
    const container = document.getElementById('tiersSettingsList');
    if (!container) return;
    
    if (!tiers || tiers.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет настроек уровней. Нажмите "+ Добавить уровень" чтобы создать первый уровень.</div>';
        return;
    }
    
    container.innerHTML = tiers.map((tier, idx) => `
        <div class="tier-config-item" style="border-left: 4px solid ${tier.color || '#95a5a6'}">
            <div class="tier-config-header">
                <div class="tier-config-title">
                    <input type="text" value="${escapeHtml(tier.name)}" 
                           onchange="updateTierConfig(${idx}, 'name', this.value)" 
                           class="tier-name-input">
                    <input type="color" value="${tier.color || '#95a5a6'}" 
                           onchange="updateTierConfig(${idx}, 'color', this.value)" 
                           class="tier-color-input">
                    <select onchange="updateTierConfig(${idx}, 'icon', this.value)" class="tier-icon-select">
                        ${getIconOptions(tier.icon || '🌱')}
                    </select>
                </div>
                <button class="btn-remove" onclick="removeTierConfig(${idx})">🗑️</button>
            </div>
            
            <div class="tier-config-fields">
                <div class="config-field">
                    <label>💰 Порог LTV (₽):</label>
                    <input type="number" value="${tier.threshold || 0}" 
                           onchange="updateTierConfig(${idx}, 'threshold', parseInt(this.value))" 
                           class="config-input">
                </div>
                
                <div class="config-field">
                    <label>⚡ Множитель бонусов:</label>
                    <input type="number" step="0.1" value="${tier.multiplier || 1}" 
                           onchange="updateTierConfig(${idx}, 'multiplier', parseFloat(this.value))" 
                           class="config-input">
                    <span class="field-hint">x</span>
                </div>
                
                <div class="config-field">
                    <label>💰 Кешбэк (%):</label>
                    <input type="number" step="0.5" value="${tier.cashback || 5}" 
                           onchange="updateTierConfig(${idx}, 'cashback', parseFloat(this.value))" 
                           class="config-input">
                    <span class="field-hint">%</span>
                </div>
            </div>
            
            <div class="tier-preview">
                <div style="background: ${tier.color || '#95a5a6'}; padding: 8px 12px; border-radius: 12px; color: white;">
                    ${tier.threshold.toLocaleString()} ₽ - ${tier.icon || '🌱'} ${escapeHtml(tier.name)}: x${tier.multiplier || 1} бонусов • ${tier.cashback || 5}% кешбэк
                </div>
            </div>
        </div>
    `).join('');
}

// Обновите функцию updateTierConfig
window.updateTierConfig = function(index, field, value) {
    if (tiers[index]) {
        tiers[index][field] = value;
        renderTiersSettings();
        if (window.tiersSaveTimeout) clearTimeout(window.tiersSaveTimeout);
        window.tiersSaveTimeout = setTimeout(() => saveTiersToServer(), 1000);
    }
};

// Обновите функцию addTierConfig
window.addTierConfig = function() {
    const lastThreshold = tiers.length > 0 ? tiers[tiers.length - 1].threshold + 5000 : 1000;
    tiers.push({
        name: 'Новый уровень',
        threshold: lastThreshold,
        multiplier: 1,
        cashback: 5,
        color: '#95a5a6',
        icon: '⭐'
    });
    renderTiersSettings();
    saveTiersToServer();
};

// Обновите функцию removeTierConfig
window.removeTierConfig = function(index) {
    if (tiers.length <= 1) {
        alert('Нельзя удалить последний уровень');
        return;
    }
    tiers.splice(index, 1);
    renderTiersSettings();
    saveTiersToServer();
};

// Обновите функцию saveTiersToServer
async function saveTiersToServer() {
    if (!currentBusiness) return;
    
    tiers.sort((a, b) => a.threshold - b.threshold);
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tiers })
        });
        
        const data = await response.json();
        if (data.success) {
            showSaveIndicator();
            console.log('✅ Уровни сохранены в БД');
        } else {
            console.error('Ошибка сохранения:', data.message);
        }
    } catch (error) {
        console.error('Ошибка сохранения уровней:', error);
    }
}

function updateTier(index, field, value) { if (tiers[index]) { tiers[index][field] = value; loadLoyaltySettings(); } }
function addTier() { tiers.push({ name: 'Новый ранг', threshold: 0, multiplier: 1, color: '#95a5a6' }); loadLoyaltySettings(); }
function removeTier(index) { tiers.splice(index,1); loadLoyaltySettings(); }
function toggleDiscount(index, active) { if (discounts[index]) { discounts[index].active = active; loadLoyaltySettings(); } }
function addDiscount() { discounts.push({ name: 'Новая скидка', type: 'percent', value: 10, minAmount: 500, active: true }); loadLoyaltySettings(); }
function saveLoyaltySettings() { alert('Настройки сохранены!'); localStorage.setItem('loyalty_tiers', JSON.stringify(tiers)); localStorage.setItem('loyalty_discounts', JSON.stringify(discounts)); }

// ========== МОДУЛЬ 3: УВЕДОМЛЕНИЯ ==========
function sendNotification() {
    const type = document.getElementById('notifType')?.value || 'Push';
    const segment = document.getElementById('notifSegment')?.value || 'all';
    const title = document.getElementById('notifTitle')?.value || '';
    const message = document.getElementById('notifMessage')?.value || '';
    if (!title || !message) { alert('Заполните заголовок и сообщение'); return; }
    const notification = { id: Date.now(), type, segment, title, message, date: new Date().toLocaleString(), status: 'sent' };
    notificationsHistory.unshift(notification);
    if (notificationsHistory.length > 20) notificationsHistory.pop();
    loadNotificationsHistory();
    if (document.getElementById('notifTitle')) document.getElementById('notifTitle').value = '';
    if (document.getElementById('notifMessage')) document.getElementById('notifMessage').value = '';
    alert(`✅ Уведомление отправлено!\nАудитория: ${getSegmentName(segment)}\nЗаголовок: ${title}`);
}

function getSegmentName(segment) { const segments = { 'all':'Все','active':'Активные','sleeping':'Спящие','vip':'VIP','new':'Новые' }; return segments[segment] || segment; }

function loadNotificationsHistory() {
    const container = document.getElementById('notificationsHistory');
    if (!container) return;
    if (notificationsHistory.length === 0) { container.innerHTML = '<div class="empty-state">Нет отправленных уведомлений</div>'; return; }
    container.innerHTML = notificationsHistory.map(n => `<div class="history-item"><div class="history-info"><div class="history-title">${escapeHtml(n.title)}</div><div class="history-message">${escapeHtml(n.message)}</div><div class="history-meta">Аудитория: ${getSegmentName(n.segment)} • ${n.date}</div></div><div class="history-status sent">✅ Отправлено</div></div>`).join('');
}

// ========== МОДУЛЬ 4: МАРКЕТИНГ (АКЦИИ И ЗАДАНИЯ) ==========

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
    if (promotions.length === 0) { container.innerHTML = '<div class="empty-state">Нет акций. Добавьте первую!</div>'; return; }
    container.innerHTML = promotions.map(promo => `
        <div class="promotion-item">
            <div class="promotion-header"><div class="promotion-emojis">${promo.emoji1} ${promo.emoji2}</div><div class="promotion-name">${escapeHtml(promo.name)}</div><div class="promotion-status ${promo.active ? 'active' : 'inactive'}">${promo.active ? 'Активна' : 'Отключена'}</div><button class="btn-remove" onclick="deletePromotion(${promo.id})">🗑️</button><button class="btn-edit" onclick="editPromotion(${promo.id})">✏️</button></div>
            <div class="promotion-desc">${escapeHtml(promo.description)}</div>
            <div class="promotion-actions"><label>Активна: <input type="checkbox" ${promo.active ? 'checked' : ''} onchange="togglePromotion(${promo.id}, this.checked)"></label></div>
        </div>
    `).join('');
}

function showAddPromotionModal() { 
    openModal('promotion'); 
    document.getElementById('promoName').value = ''; 
    document.getElementById('promoDesc').value = ''; 
    document.getElementById('promoActive').checked = true;
    document.getElementById('promotionModalTitle').textContent = 'Добавить акцию';
    document.getElementById('savePromotionBtn').onclick = () => savePromotion();
    currentEditingPromotionId = null;
}

async function editPromotion(promotionId) {
    const promo = promotions.find(p => p.id === promotionId);
    if (!promo) return;
    
    currentEditingPromotionId = promotionId;
    document.getElementById('promoName').value = promo.name;
    document.getElementById('promoDesc').value = promo.description || '';
    document.getElementById('promoActive').checked = promo.active;
    document.getElementById('promoEmoji1').value = promo.emoji1 || '🎯';
    document.getElementById('promoEmoji2').value = promo.emoji2 || '🎉';
    document.getElementById('promotionModalTitle').textContent = 'Редактировать акцию';
    document.getElementById('savePromotionBtn').onclick = () => updatePromotion();
    openModal('promotion');
}

async function savePromotion() {
    const name = document.getElementById('promoName').value.trim();
    const emoji1 = document.getElementById('promoEmoji1').value;
    const emoji2 = document.getElementById('promoEmoji2').value;
    const description = document.getElementById('promoDesc').value.trim();
    const active = document.getElementById('promoActive').checked;
    
    if (!name) { alert('Введите название акции'); return; }
    
    try {
        const response = await fetch(`${API_URL}/api/promotions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: currentBusiness.id, name, emoji1, emoji2, description, active })
        });
        
        if (response.ok) {
            const data = await response.json();
            promotions.push(data.promotion);
            renderPromotionsList();
            closeModal('promotion');
            alert('✅ Акция сохранена в базе данных!');
        }
    } catch (error) {
        alert('❌ Ошибка сохранения');
    }
}

async function updatePromotion() {
    if (!currentEditingPromotionId) return;
    
    const name = document.getElementById('promoName').value.trim();
    const emoji1 = document.getElementById('promoEmoji1').value;
    const emoji2 = document.getElementById('promoEmoji2').value;
    const description = document.getElementById('promoDesc').value.trim();
    const active = document.getElementById('promoActive').checked;
    
    try {
        const response = await fetch(`${API_URL}/api/promotions/${currentEditingPromotionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, emoji1, emoji2, description, active })
        });
        
        if (response.ok) {
            const data = await response.json();
            const index = promotions.findIndex(p => p.id === currentEditingPromotionId);
            if (index !== -1) promotions[index] = data.promotion;
            renderPromotionsList();
            closeModal('promotion');
            alert('✅ Акция обновлена!');
        }
    } catch (error) {
        alert('❌ Ошибка обновления');
    }
}

async function deletePromotion(id) {
    if (confirm('Удалить акцию?')) {
        try {
            await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE' });
            promotions = promotions.filter(p => p.id !== id);
            renderPromotionsList();
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
    container.innerHTML = questsManager.map(quest => `
        <div class="quest-manager-item">
            <div class="quest-header">
                <div class="quest-emoji">${quest.emoji || '✅'}</div>
                <div class="quest-title">${escapeHtml(quest.title)}</div>
                <div class="quest-reward">+${quest.reward} бонусов</div>
                <div class="quest-status ${quest.active ? 'active' : 'inactive'}">${quest.active ? 'Активно' : 'Отключено'}</div>
                <button class="btn-remove" onclick="deleteQuest(${quest.id})">🗑️</button>
                <button class="btn-edit" onclick="editQuest(${quest.id})">✏️</button>
            </div>
            <div class="quest-desc">${escapeHtml(quest.description || '')}</div>
            <div class="quest-actions">
                <label>Активно: 
                    <input type="checkbox" ${quest.active ? 'checked' : ''} onchange="toggleQuest(${quest.id}, this.checked)">
                </label>
            </div>
        </div>
    `).join('');
}

function showAddQuestModal() { 
    openModal('quest'); 
    document.getElementById('questTitle').value = ''; 
    document.getElementById('questDesc').value = ''; 
    document.getElementById('questReward').value = 10; 
    document.getElementById('questActive').checked = true;
    document.getElementById('questEmoji').value = '✅';
    document.getElementById('questModalTitle').textContent = 'Добавить задание';
    document.getElementById('saveQuestBtn').onclick = () => saveQuest();
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
    document.getElementById('questModalTitle').textContent = 'Редактировать задание';
    document.getElementById('saveQuestBtn').onclick = () => updateQuest();
    openModal('quest');
}

// Замените функцию saveQuest() в script.js на эту:

async function saveQuest() {
    const emoji = document.getElementById('questEmoji').value;
    const title = document.getElementById('questTitle').value.trim();
    const description = document.getElementById('questDesc').value.trim();
    const reward = parseInt(document.getElementById('questReward').value) || 10;
    const active = document.getElementById('questActive').checked;
    
    if (!title) { 
        alert('Введите название задания'); 
        return; 
    }
    
    if (!currentBusiness || !currentBusiness.id) {
        alert('Ошибка: не удалось определить компанию');
        return;
    }
    
    const saveBtn = document.getElementById('saveQuestBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/quests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                companyId: currentBusiness.id, 
                emoji, 
                title, 
                description, 
                reward, 
                active 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Добавляем новое задание в локальный массив
            questsManager.push(data.quest);
            // Обновляем отображение
            renderQuestsManagerList();
            // Закрываем модальное окно
            closeModal('quest');
            // Очищаем форму
            document.getElementById('questTitle').value = '';
            document.getElementById('questDesc').value = '';
            document.getElementById('questReward').value = 10;
            document.getElementById('questEmoji').value = '✅';
            document.getElementById('questActive').checked = true;
            alert('✅ Задание успешно сохранено в базе данных!');
        } else {
            alert('❌ Ошибка сохранения: ' + (data.message || data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка подключения к серверу. Убедитесь, что backend запущен на порту 3001');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Исправьте функцию updateQuest():
async function updateQuest() {
    if (!currentEditingQuestId) return;
    
    const emoji = document.getElementById('questEmoji').value;
    const title = document.getElementById('questTitle').value.trim();
    const description = document.getElementById('questDesc').value.trim();
    const reward = parseInt(document.getElementById('questReward').value) || 10;
    const active = document.getElementById('questActive').checked;
    
    if (!title) { 
        alert('Введите название задания'); 
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
            body: JSON.stringify({ emoji, title, description, reward, active })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const index = questsManager.findIndex(q => q.id === currentEditingQuestId);
            if (index !== -1) questsManager[index] = data.quest;
            renderQuestsManagerList();
            closeModal('quest');
            alert('✅ Задание обновлено!');
        } else {
            alert('❌ Ошибка обновления: ' + (data.message || data.error));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('❌ Ошибка подключения к серверу');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function deleteQuest(id) {
    if (confirm('Удалить задание?')) {
        try {
            await fetch(`${API_URL}/api/quests/${id}`, { method: 'DELETE' });
            questsManager = questsManager.filter(q => q.id !== id);
            renderQuestsManagerList();
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
    container.innerHTML = games.map(game => `<div class="game-item"><div class="game-info"><div class="game-name">${game.icon} ${escapeHtml(game.name)}</div><div class="game-cost">Стоимость участия: ${game.cost} бонусов</div></div><div class="toggle-switch"><input type="checkbox" ${game.active ? 'checked' : ''} onchange="toggleGame(${game.id}, this.checked)"><span>${game.active ? 'Активна' : 'Отключена'}</span></div></div>`).join('');
}

function toggleGame(id, active) { const game = games.find(g => g.id === id); if (game) game.active = active; }
function saveGameSettings() { alert('Настройки игр сохранены!'); localStorage.setItem('loyalty_games', JSON.stringify(games)); }

// ========== НАСТРОЙКИ ==========
function saveBusinessSettings() {
    if (currentBusiness) {
        const businesses = JSON.parse(localStorage.getItem('loyaltyPrime_businesses') || '[]');
        const index = businesses.findIndex(b => b.id === currentBusiness.id);
        if (index !== -1) businesses[index] = currentBusiness;
        localStorage.setItem('loyaltyPrime_businesses', JSON.stringify(businesses));
    }
    alert('Настройки бизнеса сохранены!');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    // В секции DOMContentLoaded, добавьте обработчик для модуля loyalty
	document.querySelectorAll('.crm-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const module = btn.dataset.module;
        document.querySelectorAll('.crm-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.crm-module').forEach(m => m.classList.remove('active'));
        const activeModule = document.getElementById(`${module}Module`);
        if (activeModule) activeModule.classList.add('active');
        
        // Загружаем данные при переходе в модуль
        if (module === 'marketing') {
            renderPromotionsList();
            renderQuestsManagerList();
        }
        if (module === 'loyalty') {
            loadLoyaltySettings();
        }
    });
});
    
    const programActive = document.getElementById('programActive');
    if (programActive) {
        programActive.addEventListener('change', () => {
            const label = document.getElementById('programStatusLabel');
            if (label) label.textContent = programActive.checked ? 'Активна' : 'Приостановлена';
        });
    }
    
    const savedTiers = localStorage.getItem('loyalty_tiers');
    if (savedTiers) try { tiers = JSON.parse(savedTiers); } catch(e) {}
    const savedDiscounts = localStorage.getItem('loyalty_discounts');
    if (savedDiscounts) try { discounts = JSON.parse(savedDiscounts); } catch(e) {}
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

// ========== НАСТРОЙКА УРОВНЕЙ (TIERS) ==========

async function loadTiersSettings() {
    if (!currentBusiness) return;
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`);
        const data = await response.json();
        
        if (data.success && data.tiers) {
            tiers = data.tiers;
            renderTiersSettings();
        }
    } catch (error) {
        console.error('Ошибка загрузки уровней:', error);
        // Используем локальные данные если сервер недоступен
        renderTiersSettings();
    }
}

function renderTiersSettings() {
    const container = document.getElementById('tiersSettingsList');
    if (!container) return;
    
    container.innerHTML = tiers.map((tier, idx) => `
        <div class="tier-config-item" style="border-left: 4px solid ${tier.color}">
            <div class="tier-config-header">
                <div class="tier-config-title">
                    <input type="text" value="${escapeHtml(tier.name)}" 
                           onchange="updateTierConfig(${idx}, 'name', this.value)" 
                           class="tier-name-input">
                    <input type="color" value="${tier.color}" 
                           onchange="updateTierConfig(${idx}, 'color', this.value)" 
                           class="tier-color-input">
                    <select onchange="updateTierConfig(${idx}, 'icon', this.value)" class="tier-icon-select">
                        ${getIconOptions(tier.icon)}
                    </select>
                </div>
                <button class="btn-remove" onclick="removeTierConfig(${idx})">🗑️</button>
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
                    <span class="field-hint">x (во сколько раз больше бонусов)</span>
                </div>
                
                <div class="config-field">
                    <label>💰 Кешбэк (%):</label>
                    <input type="number" step="0.5" value="${tier.cashback}" 
                           onchange="updateTierConfig(${idx}, 'cashback', parseFloat(this.value))" 
                           class="config-input">
                    <span class="field-hint">% возврата от покупки</span>
                </div>
            </div>
            
            <div class="tier-preview">
                <div style="background: ${tier.color}; padding: 8px 12px; border-radius: 12px; color: white;">
                    ${tier.icon} ${escapeHtml(tier.name)}: x${tier.multiplier} бонусов • ${tier.cashback}% кешбэк
                </div>
            </div>
        </div>
    `).join('');
}

function getIconOptions(selectedIcon) {
    const icons = ['🌱', '🥈', '🥇', '💎', '⭐', '🏆', '👑', '🔥', '⚡', '🎯'];
    return icons.map(icon => `<option value="${icon}" ${selectedIcon === icon ? 'selected' : ''}>${icon}</option>`).join('');
}

function updateTierConfig(index, field, value) {
    if (tiers[index]) {
        tiers[index][field] = value;
        renderTiersSettings();
        // Автосохранение через 1 секунду после последнего изменения
        if (window.tiersSaveTimeout) clearTimeout(window.tiersSaveTimeout);
        window.tiersSaveTimeout = setTimeout(() => saveTiersToServer(), 1000);
    }
}

function addTierConfig() {
    tiers.push({
        name: 'Новый уровень',
        threshold: tiers.length > 0 ? tiers[tiers.length - 1].threshold + 5000 : 1000,
        multiplier: 1,
        cashback: 5,
        color: '#95a5a6',
        icon: '⭐'
    });
    renderTiersSettings();
    saveTiersToServer();
}

function removeTierConfig(index) {
    if (tiers.length <= 1) {
        alert('Нельзя удалить последний уровень');
        return;
    }
    tiers.splice(index, 1);
    renderTiersSettings();
    saveTiersToServer();
}

async function saveTiersToServer() {
    if (!currentBusiness) return;
    
    // Сортируем уровни по порогу
    tiers.sort((a, b) => a.threshold - b.threshold);
    
    try {
        const response = await fetch(`${API_URL}/api/companies/${currentBusiness.id}/tiers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tiers })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Уровни сохранены');
            // Показываем индикатор сохранения
            showSaveIndicator();
        } else {
            console.error('Ошибка сохранения:', data.message);
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