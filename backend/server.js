const express = require('express');
const cors = require('cors');
const { 
    initDatabase, 
    addCompany, 
    getCompanyByEmail, 
    getAllCompanies,
    getCompanyById, 
    getUserByVkId, 
    createUser, 
    updateUserBalance, 
    getUserById,
    getPromotions,
    addPromotion,
    updatePromotion,
    deletePromotion,
    getQuests,
    addQuest,
    updateQuest,
    deleteQuest,
    completeUserQuest,
    getUserCompletedQuests,
    getUserProgress,
    updateUserProgress,
    updateQuestProgress,
    getAllUserQuestProgress,
    checkDailyBonusClaimed,
    claimDailyBonus,
    query,
    getCompanyTiers,      
    updateCompanyTiers,
    getPresetQuests,
	getGameSettings,
    saveGameSettings,
	getDailyBonusSettings,
	updateDailyBonusSettings,
    getUserTransactions,
    updateBalanceWithTransaction,
    updateUserBirthday,
    getUserBirthday,
    purchasePromotion,
    getUserPurchasedPromotions,
    hasUserPurchasedPromotion,
    usePurchasedPromotion,
    checkPromotionCycle
} = require('./database-pg');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

initDatabase();

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend работает на PostgreSQL!' });
});

// ============ API ДЛЯ КОМПАНИЙ ============

app.post('/api/companies/register', async (req, res) => {
    try {
        const { company, name, email, phone, password, brandColor, description } = req.body;
        
        if (!company || !name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Заполните обязательные поля' });
        }
        
        const existing = await getCompanyByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email уже зарегистрирован' });
        }
        
        const newCompany = await addCompany({ company, name, email, phone, password, brandColor, description });
        res.json({ success: true, company: newCompany });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/companies/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await query('SELECT * FROM companies WHERE email = $1 AND password = $2', [email, password]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, company: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.get('/api/companies/list', async (req, res) => {
    try {
        const companies = await getAllCompanies();
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ API ДЛЯ АКЦИЙ ============

app.get('/api/promotions/:companyId', async (req, res) => {
    try {
        const promotions = await getPromotions(req.params.companyId);
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/promotions', async (req, res) => {
    try {
        const { companyId, name, emoji, description, startDate, endDate, active, reward_type, reward_value, products, requires_purchase } = req.body;
        
        if (!companyId || !name) {
            return res.status(400).json({ success: false, message: 'companyId и name обязательны' });
        }
        
        const promotion = await addPromotion(companyId, { 
            name, 
            emoji, 
            description, 
            startDate, 
            endDate, 
            active, 
            reward_type,
            reward_value,
            products,
            requires_purchase
        });
        res.json({ success: true, promotion });
    } catch (error) {
        console.error('Ошибка создания акции:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/promotions/:id', async (req, res) => {
    try {
        const { name, description, startDate, endDate, active, reward_type, reward_value, products, requires_purchase } = req.body;
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (startDate !== undefined) {
            updates.push(`start_date = $${paramIndex++}`);
            values.push(startDate || null);
        }
        if (endDate !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            values.push(endDate || null);
        }
        if (active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(active);
        }
        if (reward_type !== undefined) {
            updates.push(`reward_type = $${paramIndex++}`);
            values.push(reward_type);
        }
        if (reward_value !== undefined) {
            updates.push(`reward_value = $${paramIndex++}`);
            values.push(reward_value);
        }
        if (products !== undefined) {
            updates.push(`products = $${paramIndex++}`);
            values.push(products);
        }
        if (requires_purchase !== undefined) {
            updates.push(`requires_purchase = $${paramIndex++}`);
            values.push(requires_purchase);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(req.params.id);
        
        const queryText = `UPDATE promotions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Акция не найдена' });
        }
        
        res.json({ success: true, promotion: result.rows[0] });
    } catch (error) {
        console.error('Ошибка обновления акции:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/promotions/:id', async (req, res) => {
    try {
        await deletePromotion(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API ДЛЯ ПРЕДУСТАНОВЛЕННЫХ ЗАДАНИЙ ============

app.get('/api/preset-quests', async (req, res) => {
    try {
        const presetQuests = getPresetQuests();
        res.json({ success: true, quests: presetQuests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ API ДЛЯ ЗАДАНИЙ (CRM) ============

app.get('/api/quests/:companyId', async (req, res) => {
    try {
        const quests = await getQuests(req.params.companyId);
        // Проверяем истекшие задания
        const now = new Date();
        const updatedQuests = quests.map(quest => {
            // Проверяем по end_date (если установлена)
            const endDate = quest.end_date ? new Date(quest.end_date) : null;
            const isExpired = endDate ? endDate < now : false;
            
            // Если задание истекло, автоматически делаем его неактивным
            if (isExpired && quest.active) {
                quest.active = false;
            }
            
            return {
                ...quest,
                isExpired,
                status: isExpired ? 'expired' : (quest.active ? 'active' : 'inactive')
            };
        });
        res.json(updatedQuests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/quests', async (req, res) => {
    try {
        const { companyId, emoji, title, description, reward, active, expiresDays } = req.body;
        
        if (!title || !reward) {
            return res.status(400).json({ success: false, message: 'Название и награда обязательны' });
        }
        
        const quest = await addQuest(companyId, { emoji, title, description, reward, active, expiresDays });
        res.json({ success: true, quest });
    } catch (error) {
        console.error('Ошибка добавления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/quests/:id', async (req, res) => {
    try {
        // Разрешаем обновлять только reward, active и expires_days
        const { reward, active, expiresDays, endDate } = req.body;
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (reward !== undefined) {
            updates.push(`reward = $${paramIndex++}`);
            values.push(reward);
        }
        if (active !== undefined) {
            updates.push(`active = $${paramIndex++}`);
            values.push(active);
        }
        if (expiresDays !== undefined) {
            updates.push(`expires_days = $${paramIndex++}`);
            values.push(expiresDays || null);
        }
        if (endDate !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            values.push(endDate || null);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(req.params.id);
        
        const queryText = `UPDATE quests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await query(queryText, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Задание не найдено' });
        }
        
        res.json({ success: true, quest: result.rows[0] });
    } catch (error) {
        console.error('Ошибка обновления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/quests/:id', async (req, res) => {
    try {
        // Запрещаем удаление заданий
        res.status(403).json({ success: false, message: 'Удаление заданий запрещено. Задания являются предустановленными.' });
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ API ДЛЯ ПОЛЬЗОВАТЕЛЕЙ (VK Mini App) ============

app.post('/api/users/getOrCreate', async (req, res) => {
    try {
        const { vkId, companyId, name } = req.body;
        let user = await getUserByVkId(vkId, companyId);
        
        if (!user) {
            user = await createUser(vkId, companyId, name);
        }
        
        const allQuests = await getQuests(companyId);
        const now = new Date();
        const activeQuests = allQuests.filter(q => {
            if (!q.active) return false;
            const createdAt = new Date(q.created_at);
            const expiresDays = q.expires_days || 30;
            const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
            return expiresAt > now;
        });
        
        const userProgress = await getAllUserQuestProgress(user.id);
        const completedQuests = await getUserCompletedQuests(user.id);
        const progress = await getUserProgress(user.id, companyId);
        
        res.json({ 
            success: true, 
            user,
            quests: activeQuests,
            userProgress: userProgress,
            completedQuests: completedQuests,
            totalEarned: progress?.total_earned || 0,
            streak: progress?.streak || 0
        });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:userId/quests/progress/all', async (req, res) => {
    try {
        const questProgress = await getAllUserQuestProgress(req.params.userId);
        const user = await getUserById(req.params.userId);
        let progress = null;
        
        if (user) {
            progress = await getUserProgress(req.params.userId, user.company_id);
        }
        
        res.json({
            quests: questProgress,
            totalEarned: progress?.total_earned || 0,
            streak: progress?.streak || 0,
            lastLoginDate: progress?.last_login_date || null
        });
    } catch (error) {
        console.error('Ошибка получения прогресса:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/:userId/quests/progress', async (req, res) => {
    try {
        const { companyId, quests, totalEarned, streak, lastLoginDate } = req.body;
        
        await updateUserProgress(req.params.userId, companyId, { totalEarned, streak, lastLoginDate });
        
        for (const quest of quests) {
            await updateQuestProgress(req.params.userId, quest.id, quest.progress, quest.completed, quest.claimed);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/completeQuest', async (req, res) => {
    try {
        const { userId, questId, reward } = req.body;
        
        // Проверяем, не истекло ли задание
        const quest = await query('SELECT * FROM quests WHERE id = $1', [questId]);
        if (quest.rows.length > 0) {
            const createdAt = new Date(quest.rows[0].created_at);
            const expiresDays = quest.rows[0].expires_days || 30;
            const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
            if (expiresAt < new Date()) {
                return res.status(400).json({ error: 'Срок действия задания истек' });
            }
        }
        
        const existing = await query(
            'SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2',
            [userId, questId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Задание уже выполнено' });
        }
        
        await query(
            'INSERT INTO user_quests (user_id, quest_id, completed_at, reward_claimed) VALUES ($1, $2, NOW(), $3)',
            [userId, questId, true]
        );
        
        await updateQuestProgress(userId, questId, 1, true, true);
        await updateUserBalance(userId, reward, 'earn', `Задание выполнено! +${reward} бонусов`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка выполнения задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/updateBalance', async (req, res) => {
    try {
        const { userId, change, type, description } = req.body;
        const newBalance = await updateUserBalance(userId, change, type, description);
        
        const user = await getUserById(userId);
        const tiers = await getCompanyTiers(user.company_id);
        
        let currentTier = tiers[0];
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (newBalance >= tiers[i].threshold) {
                currentTier = tiers[i];
                break;
            }
        }
        
        res.json({ 
            success: true, 
            newBalance,
            currentTier,
            nextTier: getNextTier(tiers, newBalance)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function getNextTier(tiers, balance) {
    for (let i = 0; i < tiers.length; i++) {
        if (balance < tiers[i].threshold) return tiers[i];
    }
    return null;
}

// Получение истории транзакций пользователя для VK Mini App
app.get('/api/users/:userId/transactions/:companyId', async (req, res) => {
    try {
        const { userId, companyId } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        
        const transactions = await getUserTransactions(userId, companyId, limit);
        
        // Форматируем транзакции для mini-app
        const formattedTransactions = transactions.map(t => ({
            id: t.id,
            type: t.bonus_earned > 0 ? 'earn' : 'spend',
            amount: t.amount || 0,
            bonusChange: t.bonus_earned > 0 ? t.bonus_earned : -t.bonus_spent,
            description: t.description || (t.bonus_earned > 0 ? 'Начисление бонусов' : 'Списание бонусов'),
            source: t.source || 'app',
            storeId: t.store_id,
            cashierId: t.cashier_id,
            createdAt: t.created_at
        }));
        
        res.json({
            success: true,
            transactions: formattedTransactions,
            count: formattedTransactions.length
        });
    } catch (error) {
        console.error('Ошибка получения транзакций:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users/dailyBonus/check', async (req, res) => {
    try {
        const { userId, companyId } = req.body;
        
        // Проверяем настройки ежедневного бонуса
        const settings = await getDailyBonusSettings(companyId);
        if (!settings.enabled) {
            return res.json({ claimed: true, disabled: true });
        }
        
        const claimed = await checkDailyBonusClaimed(userId, companyId);
        res.json({ claimed, settings });
    } catch (error) {
        console.error('Ошибка проверки бонуса:', error);
        res.json({ claimed: false });
    }
});

app.post('/api/users/dailyBonus/claim', async (req, res) => {
    try {
        const { userId, companyId, bonusAmount, streak } = req.body;
        const result = await claimDailyBonus(userId, companyId, bonusAmount, streak);
        res.json({ success: true, result });
    } catch (error) {
        console.error('Ошибка начисления бонуса:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ API ДЛЯ НАСТРОЕК ЕЖЕДНЕВНОГО БОНУСА ============

app.get('/api/companies/:companyId/dailyBonusSettings', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const settings = await getDailyBonusSettings(companyId);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Ошибка получения настроек ежедневного бонуса:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/companies/:companyId/dailyBonusSettings', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { enabled, baseAmount, streakBonus } = req.body;
        
        const settings = {
            enabled: enabled !== undefined ? enabled : true,
            baseAmount: baseAmount || 10,
            streakBonus: streakBonus || 5
        };
        
        await updateDailyBonusSettings(companyId, settings);
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Ошибка обновления настроек ежедневного бонуса:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ API ДЛЯ ДНЯ РОЖДЕНИЯ ============

app.get('/api/users/:userId/birthday', async (req, res) => {
    try {
        const { userId } = req.params;
        const birthdayDate = await getUserBirthday(userId);
        res.json({ success: true, birthday_date: birthdayDate });
    } catch (error) {
        console.error('Ошибка получения дня рождения:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/users/:userId/birthday', async (req, res) => {
    try {
        const { userId } = req.params;
        const { birthday_date } = req.body;
        
        if (!birthday_date) {
            return res.status(400).json({ success: false, message: 'Дата дня рождения обязательна' });
        }
        
        // Проверяем, установлена ли уже дата
        const existingBirthday = await getUserBirthday(userId);
        if (existingBirthday) {
            return res.status(400).json({ success: false, message: 'Дата дня рождения уже установлена и не может быть изменена' });
        }
        
        const result = await updateUserBirthday(userId, birthday_date);
        res.json({ success: true, birthday_date: result.birthday_date });
    } catch (error) {
        console.error('Ошибка обновления дня рождения:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ API ДЛЯ ПОКУПКИ АКЦИЙ ============

app.post('/api/users/:userId/promotions/:promotionId/purchase', async (req, res) => {
    try {
        const { userId, promotionId } = req.params;
        const { companyId } = req.body;
        
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId обязателен' });
        }
        
        // Получаем информацию об акции
        const promoResult = await query('SELECT * FROM promotions WHERE id = $1 AND company_id = $2', [promotionId, companyId]);
        if (promoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Акция не найдена' });
        }
        
        const promotion = promoResult.rows[0];
        
        // Проверяем цикл акции (дата начала + active статус)
        const cycleStart = promotion.start_date;
        if (!cycleStart) {
            return res.status(400).json({ success: false, message: 'У акции не указана дата начала' });
        }
        
        // Проверяем, покупал ли пользователь уже эту акцию в текущем цикле
        const alreadyPurchased = await hasUserPurchasedPromotion(userId, promotionId, cycleStart);
        if (alreadyPurchased) {
            return res.status(400).json({ success: false, message: 'Вы уже купили эту акцию. Повторная покупка возможна только после перезапуска акции.' });
        }
        
        // Цена покупки = reward_value * 10 (например, скидка 20% = 200 баллов)
        const bonusCost = promotion.reward_value * 10;
        
        // Покупаем акцию
        const purchase = await purchasePromotion(userId, promotionId, companyId, cycleStart, bonusCost);
        
        res.json({ 
            success: true, 
            purchase,
            message: `Акция "${promotion.name}" успешно куплена за ${bonusCost} баллов` 
        });
    } catch (error) {
        console.error('Ошибка покупки акции:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/users/:userId/promotions/purchased/:companyId', async (req, res) => {
    try {
        const { userId, companyId } = req.params;
        const purchased = await getUserPurchasedPromotions(userId, companyId);
        res.json({ success: true, purchased });
    } catch (error) {
        console.error('Ошибка получения купленных акций:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ API ДЛЯ POS ТЕРМИНАЛА - ПРОВЕРКА КУПЛЕННЫХ АКЦИЙ ============

app.post('/api/pos/check-purchased-promotion', async (req, res) => {
    try {
        const { qrData, promotionId } = req.body;
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Получаем информацию о цикле акции
        const promoInfo = await checkPromotionCycle(promotionId);
        if (!promoInfo) {
            return res.status(404).json({ success: false, message: 'Акция не найдена' });
        }
        
        const cycleStart = promoInfo.start_date;
        
        // Проверяем, куплена ли акция
        const purchased = await getUserPurchasedPromotions(user.id, userData.companyId);
        const matchingPromo = purchased.find(p => 
            p.promotion_id === parseInt(promotionId) && 
            p.promotion_cycle_start.getTime() === new Date(cycleStart).getTime() &&
            !p.used
        );
        
        if (!matchingPromo) {
            return res.json({ 
                success: true, 
                hasPromotion: false,
                message: 'Акция не куплена или уже использована' 
            });
        }
        
        // Получаем информацию о продуктах из акции
        const promoDetails = await query('SELECT products FROM promotions WHERE id = $1', [promotionId]);
        const products = promoDetails.rows.length > 0 ? promoDetails.rows[0].products : '';
        
        res.json({ 
            success: true, 
            hasPromotion: true,
            promotion: matchingPromo,
            discount: matchingPromo.reward_value,
            products: products,
            message: `Акция "${matchingPromo.name}" активна. Скидка: ${matchingPromo.reward_value}%`
        });
    } catch (error) {
        console.error('Ошибка проверки купленной акции:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/pos/use-purchased-promotion', async (req, res) => {
    try {
        const { qrData, promotionId } = req.body;
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Получаем информацию о цикле акции
        const promoInfo = await checkPromotionCycle(promotionId);
        if (!promoInfo) {
            return res.status(404).json({ success: false, message: 'Акция не найдена' });
        }
        
        const cycleStart = promoInfo.start_date;
        
        // Используем акцию
        const used = await usePurchasedPromotion(user.id, promotionId, cycleStart);
        if (!used) {
            return res.status(400).json({ success: false, message: 'Не удалось использовать акцию' });
        }
        
        res.json({ 
            success: true, 
            message: `Акция успешно использована. Скидка применена.`
        });
    } catch (error) {
        console.error('Ошибка использования акции:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ АНАЛИТИКА ============
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const revenue = await query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions');
        const bonus = await query('SELECT COALESCE(SUM(bonus_earned), 0) as total FROM transactions');
        const users = await query('SELECT COUNT(*) as count FROM users WHERE bonus_balance > 0');
        
        res.json({
            totalRevenue: parseInt(revenue.rows[0].total),
            totalBonusEarned: parseInt(bonus.rows[0].total),
            activeUsers: parseInt(users.rows[0].count)
        });
    } catch (error) {
        console.error('Ошибка аналитики:', error);
        res.json({ totalRevenue: 1250000, totalBonusEarned: 45600, activeUsers: 1234 });
    }
});

// ============ API ДЛЯ УРОВНЕЙ (TIERS) ============

app.get('/api/companies/:companyId/tiers', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        console.log('📝 Получение уровней для компании:', companyId);
        
        const tiers = await getCompanyTiers(companyId);
        
        res.json({ 
            success: true, 
            tiers: tiers 
        });
    } catch (error) {
        console.error('❌ Ошибка получения уровней:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.put('/api/companies/:companyId/tiers', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { tiers } = req.body;
        
        console.log('📝 Получен запрос на сохранение уровней для компании:', companyId);
        
        if (!tiers || !Array.isArray(tiers)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Неверный формат данных. Ожидается массив уровней.' 
            });
        }
        
        if (tiers.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Должен быть хотя бы один уровень' 
            });
        }
        
        const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
        const updatedTiers = await updateCompanyTiers(companyId, sortedTiers);
        
        console.log('✅ Уровни успешно сохранены');
        
        res.json({ 
            success: true, 
            tiers: updatedTiers,
            message: 'Настройки уровней сохранены'
        });
    } catch (error) {
        console.error('❌ Ошибка обновления уровней:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Ошибка при сохранении уровней: ' + error.message
        });
    }
});

// ============ API ДЛЯ БРЕНДИРОВАНИЯ ============
app.put('/api/companies/:companyId/branding', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { brandColor } = req.body;
        
        console.log('🎨 Получен запрос на обновление брендирования для компании:', companyId, brandColor);
        
        if (!brandColor) {
            return res.status(400).json({ 
                success: false, 
                message: 'Цвет бренда обязателен' 
            });
        }
        
        // Обновляем цвет бренда в базе данных
        const result = await query(
            'UPDATE companies SET brand_color = $1 WHERE id = $2 RETURNING *',
            [brandColor, companyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Компания не найдена' 
            });
        }
        
        console.log('✅ Цвет бренда успешно обновлен:', brandColor);
        
        res.json({ 
            success: true, 
            brandColor: result.rows[0].brand_color,
            message: 'Цвет бренда сохранен и будет применен в mini-app'
        });
    } catch (error) {
        console.error('❌ Ошибка обновления брендирования:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Ошибка при сохранении цвета бренда: ' + error.message
        });
    }
});

// ============ ПОЛУЧЕНИЕ ТЕКУЩЕГО УРОВНЯ ПОЛЬЗОВАТЕЛЯ ============
app.get('/api/users/:userId/currentTier', async (req, res) => {
    try {
        const user = await getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const tiers = await getCompanyTiers(user.company_id);
        const balance = user.bonus_balance;
        
        let currentTier = tiers[0];
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (balance >= tiers[i].threshold) {
                currentTier = tiers[i];
                break;
            }
        }
        
        let nextTier = null;
        for (let i = 0; i < tiers.length; i++) {
            if (balance < tiers[i].threshold) {
                nextTier = tiers[i];
                break;
            }
        }
        
        let progress = 100;
        if (nextTier) {
            const tierStart = currentTier.threshold;
            const tierEnd = nextTier.threshold;
            const tierRange = tierEnd - tierStart;
            const userProgress = balance - tierStart;
            progress = Math.min(100, Math.max(0, (userProgress / tierRange) * 100));
        }
        
        res.json({
            success: true,
            currentTier,
            nextTier,
            progress,
            balance
        });
    } catch (error) {
        console.error('Ошибка получения уровня:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ POS API ДЛЯ КАССЫ ============

// Получение уровня пользователя по балансу
async function getUserTier(balance, companyId) {
    const tiers = await getCompanyTiers(companyId);
    let currentTier = tiers[0];
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (balance >= tiers[i].threshold) {
            currentTier = tiers[i];
            break;
        }
    }
    return currentTier;
}

// Проверка QR-кода и получение данных пользователя
app.post('/api/pos/verify-qr', async (req, res) => {
    try {
        const { qrData, amount } = req.body;
        
        // Парсим QR данные
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        // Проверяем обязательные поля
        if (!userData.vkId || !userData.companyId) {
            return res.status(400).json({ success: false, message: 'Неверные данные QR-кода' });
        }
        
        // Проверяем валидность timestamp (не старше 5 минут)
        if (userData.timestamp && Date.now() - userData.timestamp > (userData.expiresIn || 300000)) {
            return res.status(400).json({ success: false, message: 'QR-код просрочен. Обновите QR-код в приложении' });
        }
        
        // Получаем пользователя из базы
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден. Попросите клиента зарегистрироваться' });
        }
        
        // Получаем уровень пользователя
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        
        // Рассчитываем бонусы если есть сумма
        let bonusEarned = 0;
        let bonusRate = (tier.multiplier || 1) * 10; // 10 бонусов за 1000₽ * множитель
        
        if (amount && amount > 0) {
            bonusEarned = Math.floor(amount / 1000) * bonusRate;
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                vkId: user.vk_id,
                name: user.name,
                balance: user.bonus_balance
            },
            bonusRate: bonusRate,
            bonusEarned: bonusEarned,
            tier: tier.name,
            multiplier: tier.multiplier
        });
        
    } catch (error) {
        console.error('❌ Ошибка verify-qr:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера: ' + error.message });
    }
});

// Начисление бонусов за покупку
app.post('/api/pos/apply-bonus', async (req, res) => {
    try {
        const { qrData, amount, storeId, cashierId } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Введите сумму заказа' });
        }
        
        // Парсим QR данные
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        // Получаем пользователя
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Получаем уровень для расчета бонусов
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        const bonusRate = (tier.multiplier || 1) * 10;
        const bonusEarned = Math.floor(amount / 1000) * bonusRate;
        
        if (bonusEarned === 0 && amount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Сумма ${amount}₽ слишком мала. Минимальная сумма для начисления бонусов: 1000₽`
            });
        }
        
        // Обновляем баланс пользователя
        const newBalance = user.bonus_balance + bonusEarned;
        
        // Обновляем баланс в БД
        await query(
            'UPDATE users SET bonus_balance = $1, updated_at = NOW() WHERE id = $2',
            [newBalance, user.id]
        );
        
        // Записываем транзакцию
        await query(
            `INSERT INTO transactions (user_id, amount, type, description, store_id, cashier_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [user.id, bonusEarned, 'earn', `Покупка на ${amount}₽ в ${storeId || 'кассе'}`, storeId || 'unknown', cashierId || 'cashier_001']
        );
        
        res.json({
            success: true,
            message: `✅ Начислено ${bonusEarned} бонусов!`,
            newBalance: newBalance,
            bonusEarned: bonusEarned,
            amount: amount
        });
        
    } catch (error) {
        console.error('❌ Ошибка apply-bonus:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера: ' + error.message });
    }
});

// Списание бонусов
app.post('/api/pos/spend-bonus', async (req, res) => {
    try {
        const { qrData, bonusToSpend, storeId, cashierId } = req.body;
        
        if (!bonusToSpend || bonusToSpend <= 0) {
            return res.status(400).json({ success: false, message: 'Введите сумму списания' });
        }
        
        // Парсим QR данные
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        // Получаем пользователя
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Проверяем достаточно ли бонусов
        if (user.bonus_balance < bonusToSpend) {
            return res.status(400).json({ 
                success: false, 
                message: `❌ Недостаточно бонусов. Доступно: ${user.bonus_balance}`
            });
        }
        
        // Обновляем баланс
        const newBalance = user.bonus_balance - bonusToSpend;
        
        await query(
            'UPDATE users SET bonus_balance = $1, updated_at = NOW() WHERE id = $2',
            [newBalance, user.id]
        );
        
        // Записываем транзакцию списания
        await query(
            `INSERT INTO transactions (user_id, amount, type, description, store_id, cashier_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [user.id, bonusToSpend, 'spend', `Списание ${bonusToSpend} бонусов в ${storeId || 'кассе'}`, storeId || 'unknown', cashierId || 'cashier_001']
        );
        
        res.json({
            success: true,
            message: `✅ Списано ${bonusToSpend} бонусов!`,
            newBalance: newBalance,
            spent: bonusToSpend
        });
        
    } catch (error) {
        console.error('❌ Ошибка spend-bonus:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера: ' + error.message });
    }
});

// Получение информации о пользователе по QR-данным
app.post('/api/pos/get-user', async (req, res) => {
    try {
        const { qrData } = req.body;
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        
        res.json({
            success: true,
            user: {
                name: user.name,
                vkId: user.vk_id,
                balance: user.bonus_balance,
                tier: tier.name,
                multiplier: tier.multiplier
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка get-user:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
app.get('/api/preset-promotions', async (req, res) => {
    try {
        const presetPromotions = getPresetPromotions();
        res.json({ success: true, promotions: presetPromotions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ КОНЕЦ POS API ============

// Добавьте после других API эндпоинтов в server.js

// ============ API ДЛЯ НАСТРОЕК ИГР ============

// Получение настроек игры
app.get('/api/games/:companyId/:gameType', async (req, res) => {
    try {
        const { companyId, gameType } = req.params;
        const gameSettings = await getGameSettings(parseInt(companyId), gameType);
        res.json({ 
            success: true, 
            settings: gameSettings.settings,
            active: gameSettings.active
        });
    } catch (error) {
        console.error('Ошибка получения настроек игры:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Сохранение настроек игры
app.post('/api/games/:companyId/:gameType', async (req, res) => {
    try {
        const { companyId, gameType } = req.params;
        const { settings, active } = req.body;
        
        const saved = await saveGameSettings(parseInt(companyId), gameType, settings, active);
        res.json({ 
            success: true, 
            settings: saved.settings,
            active: saved.active
        });
    } catch (error) {
        console.error('Ошибка сохранения настроек игры:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение всех настроек игр для компании
app.get('/api/games/:companyId/all', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const result = await query(
            'SELECT game_type, settings, active FROM game_settings WHERE company_id = $1',
            [companyId]
        );
        
        const gamesConfig = {};
        for (const row of result.rows) {
            let settings = row.settings;
            if (typeof settings === 'string') {
                settings = JSON.parse(settings);
            }
            gamesConfig[row.game_type] = {
                settings: settings,
                active: row.active
            };
        }
        
        res.json({ success: true, games: gamesConfig });
    } catch (error) {
        console.error('Ошибка получения всех настроек игр:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


/// Добавьте эти эндпоинты в server.js

// ============ API ДЛЯ ИСТОРИИ ПОКУПОК ============

// Получение истории транзакций пользователя
app.get('/api/users/:userId/transactions/:companyId', async (req, res) => {
    try {
        const { userId, companyId } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        
        const transactions = await getUserTransactions(userId, companyId, limit);
        
        // Форматируем транзакции для отображения
        const formattedTransactions = transactions.map(t => ({
            id: t.id,
            type: t.bonus_earned > 0 ? 'earn' : (t.bonus_spent > 0 ? 'spend' : 'other'),
            amount: t.amount || 0,
            bonusChange: t.bonus_earned > 0 ? t.bonus_earned : (t.bonus_spent > 0 ? -t.bonus_spent : 0),
            description: t.description,
            storeId: t.store_id,
            cashierId: t.cashier_id,
            source: t.source,
            createdAt: t.created_at,
            metadata: t.metadata
        }));
        
        res.json({ 
            success: true, 
            transactions: formattedTransactions,
            count: formattedTransactions.length
        });
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение баланса пользователя по QR-данным (для POS)
app.post('/api/pos/get-user-balance', async (req, res) => {
    try {
        const { qrData } = req.body;
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        if (!userData.vkId || !userData.companyId) {
            return res.status(400).json({ success: false, message: 'Неверные данные QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                vkId: user.vk_id,
                name: user.name,
                balance: user.bonus_balance,
                totalEarned: user.total_earned,
                totalSpent: user.total_spent
            },
            tier: tier.name,
            multiplier: tier.multiplier
        });
        
    } catch (error) {
        console.error('Ошибка получения баланса:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Начисление бонусов за покупку с записью в историю
app.post('/api/pos/apply-bonus-v2', async (req, res) => {
    try {
        const { qrData, amount, storeId, cashierId } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Введите сумму заказа' });
        }
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        const bonusRate = (tier.multiplier || 1) * 10;
        const bonusEarned = Math.floor(amount / 1000) * bonusRate;
        
        if (bonusEarned === 0 && amount >= 1000) {
            return res.status(400).json({ 
                success: false, 
                message: `Сумма ${amount}₽ слишком мала. Минимальная сумма для начисления бонусов: 1000₽`
            });
        }
        
        // Обновляем баланс с записью транзакции
        const newBalance = await updateBalanceWithTransaction(
            user.id, 
            user.company_id, 
            bonusEarned, 
            'earn', 
            `Покупка на ${amount}₽ в ${storeId || 'кассе'}`,
            { amount, storeId, cashierId, source: 'pos', bonusRate, multiplier: tier.multiplier }
        );
        
        res.json({
            success: true,
            message: `✅ Начислено ${bonusEarned} бонусов!`,
            newBalance: newBalance,
            bonusEarned: bonusEarned,
            amount: amount,
            transaction: {
                type: 'earn',
                amount: amount,
                bonusChange: bonusEarned,
                description: `Покупка на ${amount}₽`,
                createdAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Ошибка apply-bonus-v2:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Списание бонусов с записью в историю
app.post('/api/pos/spend-bonus-v2', async (req, res) => {
    try {
        const { qrData, bonusToSpend, storeId, cashierId } = req.body;
        
        if (!bonusToSpend || bonusToSpend <= 0) {
            return res.status(400).json({ success: false, message: 'Введите сумму списания' });
        }
        
        let userData;
        try {
            userData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Неверный формат QR-кода' });
        }
        
        const user = await getUserByVkId(userData.vkId, userData.companyId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        if (user.bonus_balance < bonusToSpend) {
            return res.status(400).json({ 
                success: false, 
                message: `❌ Недостаточно бонусов. Доступно: ${user.bonus_balance}`
            });
        }
        
        const newBalance = await updateBalanceWithTransaction(
            user.id,
            user.company_id,
            bonusToSpend,
            'spend',
            `Списание ${bonusToSpend} бонусов в ${storeId || 'кассе'}`,
            { bonusToSpend, storeId, cashierId, source: 'pos' }
        );
        
        res.json({
            success: true,
            message: `✅ Списано ${bonusToSpend} бонусов!`,
            newBalance: newBalance,
            spent: bonusToSpend,
            transaction: {
                type: 'spend',
                bonusChange: -bonusToSpend,
                description: `Списание ${bonusToSpend} бонусов`,
                createdAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Ошибка spend-bonus-v2:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`🐘 База данных: PostgreSQL`);
    console.log(`🔑 Тестовый вход: email: pizza@test.com, password: 123456`);
    console.log(`💳 POS API доступны: /api/pos/verify-qr, /api/pos/apply-bonus, /api/pos/spend-bonus`);
});

