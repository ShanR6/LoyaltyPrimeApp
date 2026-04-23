const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
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
    checkPromotionCycle,
    trackPurchaseProgress,
    trackPromotionUsage,
    resetQuestProgress,
    // Giveaways
    getGiveaways,
    addGiveaway,
    updateGiveaway,
    deleteGiveaway,
	hasUserPurchasedGiveaway,
    purchaseGiveaway,
    // User Classification
    initializeUserClassification,
    updateUserClassification,
    getUserClassification,
    getAllUsersClassification,
    getUsersByType,
    getClassificationStats,
    getRealAnalytics,
    recalculateAllUsersClassification,
    // Notifications
    sendNotification,
    getNotificationHistory,
    getNotificationCampaigns,
    addNotificationCampaign,
    updateNotificationCampaign,
    deleteNotificationCampaign,
    toggleNotificationCampaign,
    getActiveCampaigns,
    getUsersBySegment,
    executeCampaign
} = require('./database-pg');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

initDatabase();

// Функция для создания стандартных кампаний для новой компании
async function createDefaultCampaignsForCompany(companyId) {
    try {
        const defaultCampaigns = [
            {
                name: '😴 Возвращение спящих',
                title: 'Мы скучаем по вам!',
                message: 'Вернитесь к нам и получите двойные бонусы на следующую покупку!',
                audience: 'dormant',
                is_active: true,
                interval_days: 3,
                is_default: true
            },
            {
                name: '🎂 Поздравление с днем рождения',
                title: 'С днем рождения! 🎉',
                message: 'Поздравляем! В честь вашего праздника дарим вам специальные бонусы!',
                audience: 'all',
                is_active: true,
                interval_days: 1,
                is_default: true
            },
            {
                name: '🔥 Достижение стрика',
                title: 'Отличная серия! 🔥',
                message: 'Вы с нами уже несколько дней подряд! Продолжайте получать бонусы!',
                audience: 'active',
                is_active: true,
                interval_days: 2,
                is_default: true
            }
        ];
        
        for (const campaign of defaultCampaigns) {
            await addNotificationCampaign(
                companyId,
                campaign.name,
                campaign.title,
                campaign.message,
                campaign.audience,
                campaign.is_active,
                campaign.interval_days,
                null, // image_url
                campaign.is_default
            );
        }
        
        console.log(`✅ Стандартные кампании созданы для компании ${companyId}`);
    } catch (error) {
        console.error('❌ Ошибка создания стандартных кампаний:', error);
        // Не выбрасываем ошибку, чтобы не прерывать регистрацию
    }
}

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
        
        // Создаем стандартные кампании для новой компании
        await createDefaultCampaignsForCompany(newCompany.id);
        
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
        res.json(quests);
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
        const { reward, active, durationDays } = req.body;
        
        // Валидация durationDays (от 1 до 7)
        if (durationDays !== undefined) {
            if (durationDays < 1 || durationDays > 7) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Количество дней на выполнение должно быть от 1 до 7' 
                });
            }
            if (!Number.isInteger(durationDays)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Количество дней должно быть целым числом' 
                });
            }
        }
        
        // Если active меняется на false, сбрасываем прогресс
        if (active === false) {
            await resetQuestProgress(req.params.id);
        }
        
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
        if (durationDays !== undefined) {
            updates.push(`duration_days = $${paramIndex++}`);
            values.push(durationDays);
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
// API для получения дат последнего выполнения заданий
app.get('/api/users/:userId/quests/last-completed/:companyId', async (req, res) => {
    try {
        const { userId, companyId } = req.params;
        
        const result = await query(`
            SELECT uqp.quest_id, uqp.updated_at as last_completed_at
            FROM user_quest_progress uqp
            JOIN quests q ON uqp.quest_id = q.id
            WHERE uqp.user_id = $1 AND q.company_id = $2 AND uqp.claimed = true
        `, [userId, companyId]);
        
        const dates = {};
        result.rows.forEach(row => {
            dates[row.quest_id] = row.last_completed_at;
        });
        
        res.json({ success: true, dates });
    } catch (error) {
        console.error('Ошибка получения дат выполнения:', error);
        res.status(500).json({ success: false, error: error.message });
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
        
        // Отслеживаем посещение приложения для классификации пользователя
        await initializeUserClassification(user.id, companyId);
        await updateUserClassification(user.id, companyId, 'app_visit');
        
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

// Получение прогресса пользователя по заданиям
app.get('/api/users/:userId/quests/progress/all', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      `SELECT quest_id as id, progress, completed, claimed 
       FROM user_quest_progress 
       WHERE user_id = $1`,
      [userId]
    );
    
    res.json({ success: true, quests: result.rows });
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ success: false, error: error.message });
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
        
        // Отмечаем выполнение задания "Воспользоваться акцией"
        await trackPromotionUsage(user.id, user.company_id);
        
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
        
        // Получаем настройки бонусной системы компании
        const companyResult = await query(
            'SELECT bonus_settings FROM companies WHERE id = $1',
            [userData.companyId]
        );
        
        let bonusSettings = {
            rubToBonus: 10,
            maxBonusPaymentPercent: 25,
            minPurchaseForBonus: 1000,
            bonusRatePerThousand: 10
        };
        
        if (companyResult.rows.length > 0 && companyResult.rows[0].bonus_settings) {
            let settings = companyResult.rows[0].bonus_settings;
            if (typeof settings === 'string') {
                settings = JSON.parse(settings);
            }
            bonusSettings = { ...bonusSettings, ...settings };
        }
        
        const tier = await getUserTier(user.bonus_balance, userData.companyId);
        const bonusRate = (tier.multiplier || 1) * (bonusSettings.bonusRatePerThousand || 10);
        const minPurchase = bonusSettings.minPurchaseForBonus || 1000;
        
        // Проверяем минимальную сумму для начисления бонусов
        if (amount < minPurchase) {
            return res.status(400).json({ 
                success: false, 
                message: `Минимальная сумма для начисления бонусов: ${minPurchase}₽`
            });
        }
        
        const bonusEarned = Math.floor(amount / 1000) * bonusRate;
        
        if (bonusEarned === 0 && amount >= minPurchase) {
            return res.status(400).json({ 
                success: false, 
                message: `Сумма ${amount}₽ слишком мала. Минимальная сумма для начисления бонусов: ${minPurchase}₽`
            });
        }
        
        // Обновляем баланс с записью транзакции
        const newBalance = await updateBalanceWithTransaction(
            user.id, 
            user.company_id, 
            bonusEarned, 
            'earn', 
            `Покупка на ${amount}₽ в ${storeId || 'кассе'}`,
            { amount, storeId, cashierId, source: 'pos', bonusRate, multiplier: tier.multiplier, bonusSettings }
        );
        
        // Отслеживаем прогресс покупок для заданий
        await trackPurchaseProgress(user.id, user.company_id, amount);
        
        // Отслеживаем классификацию пользователя (покупка)
        await initializeUserClassification(user.id, user.company_id);
        await updateUserClassification(user.id, user.company_id, 'purchase');
        
        res.json({
            success: true,
            message: `✅ Начислено ${bonusEarned} бонусов!`,
            newBalance: newBalance,
            bonusEarned: bonusEarned,
            amount: amount,
            bonusSettings: bonusSettings,
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

app.post('/api/users/:userId/quests/check-reset', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.body;
        
        const now = new Date();
        
        // Получаем выполненные задания пользователя
        const userQuests = await query(`
            SELECT uqp.*, q.duration_days, q.title
            FROM user_quest_progress uqp
            JOIN quests q ON uqp.quest_id = q.id
            WHERE uqp.user_id = $1 AND q.company_id = $2 AND uqp.completed = true
        `, [userId, companyId]);
        
        const resetQuests = [];
        
        for (const quest of userQuests.rows) {
            if (quest.updated_at) {
                const completedDate = new Date(quest.updated_at);
                const daysSinceCompleted = Math.floor((now - completedDate) / (1000 * 60 * 60 * 24));
                const durationDays = quest.duration_days || 1;
                
                if (daysSinceCompleted >= durationDays) {
                    // Сбрасываем задание
                    await query(`
                        UPDATE user_quest_progress 
                        SET progress = 0, 
                            completed = FALSE, 
                            claimed = FALSE,
                            updated_at = NOW()
                        WHERE user_id = $1 AND quest_id = $2
                    `, [userId, quest.quest_id]);
                    
                    resetQuests.push({
                        quest_id: quest.quest_id,
                        title: quest.title
                    });
                }
            }
        }
        
        res.json({ success: true, resetQuests });
    } catch (error) {
        console.error('Ошибка проверки сброса заданий:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Сохранение прогресса задания
app.post('/api/users/:userId/quests/progress/update', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, questId, progress, completed } = req.body;
    
    await query(
      `INSERT INTO user_quest_progress (user_id, quest_id, progress, completed, claimed, updated_at) 
       VALUES ($1, $2, $3, $4, false, NOW())
       ON CONFLICT (user_id, quest_id) 
       DO UPDATE SET 
         progress = EXCLUDED.progress,
         completed = EXCLUDED.completed,
         updated_at = NOW()`,
      [userId, questId, progress, completed]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения прогресса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ API ДЛЯ РОЗЫГРЫШЕЙ (GIVEAWAYS) ============

// Получение всех розыгрышей компании
app.get('/api/giveaways/:companyId', async (req, res) => {
    try {
        const giveaways = await getGiveaways(req.params.companyId);
        res.json({ success: true, giveaways });
    } catch (error) {
        console.error('Ошибка получения розыгрышей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Создание розыгрыша
app.post('/api/giveaways', async (req, res) => {
    try {
        const { companyId, name, link, description, active, is_paid, bonus_cost, end_date } = req.body;
        
        if (!companyId || !name || !link) {
            return res.status(400).json({ success: false, message: 'companyId, name и link обязательны' });
        }
        
        const giveaway = await addGiveaway(companyId, { 
            name, 
            link, 
            description, 
            active,
            is_paid: is_paid || false,
            bonus_cost: bonus_cost || 0,
            end_date: end_date || null
        });
        res.json({ success: true, giveaway });
    } catch (error) {
        console.error('Ошибка создания розыгрыша:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Обновление розыгрыша
app.put('/api/giveaways/:id', async (req, res) => {
    try {
        const { name, link, description, active, is_paid, bonus_cost, end_date } = req.body;
        const giveaway = await updateGiveaway(req.params.id, { 
            name, 
            link, 
            description, 
            active,
            is_paid: is_paid || false,
            bonus_cost: bonus_cost || 0,
            end_date: end_date || null
        });
        res.json({ success: true, giveaway });
    } catch (error) {
        console.error('Ошибка обновления розыгрыша:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Удаление розыгрыша
app.delete('/api/giveaways/:id', async (req, res) => {
    try {
        await deleteGiveaway(req.params.id);
        res.json({ success: true, message: 'Розыгрыш удален' });
    } catch (error) {
        console.error('Ошибка удаления розыгрыша:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ============ API ДЛЯ КЛАССИФИКАЦИИ ПОЛЬЗОВАТЕЛЕЙ ============

// Получение классификации конкретного пользователя
app.get('/api/users/:userId/classification/:companyId', async (req, res) => {
    try {
        const classification = await getUserClassification(req.params.userId, req.params.companyId);
        
        if (!classification) {
            // Инициализируем если не существует
            await initializeUserClassification(req.params.userId, req.params.companyId);
            const newClassification = await getUserClassification(req.params.userId, req.params.companyId);
            return res.json({ success: true, classification: newClassification });
        }
        
        res.json({ success: true, classification });
    } catch (error) {
        console.error('Ошибка получения классификации:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение всех пользователей с классификацией
app.get('/api/companies/:companyId/users/classification', async (req, res) => {
    try {
        const users = await getAllUsersClassification(req.params.companyId);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение пользователей по типу
app.get('/api/companies/:companyId/users/classification/:userType', async (req, res) => {
    try {
        const users = await getUsersByType(req.params.companyId, req.params.userType);
        res.json({ success: true, users });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение статистики по классификации
app.get('/api/companies/:companyId/users/classification/stats', async (req, res) => {
    try {
        const stats = await getClassificationStats(req.params.companyId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Отслеживание посещения приложения
app.post('/api/users/:userId/app-visit/:companyId', async (req, res) => {
    try {
        await initializeUserClassification(req.params.userId, req.params.companyId);
        await updateUserClassification(req.params.userId, req.params.companyId, 'app_visit');
        res.json({ success: true, message: 'Посещение записано' });
    } catch (error) {
        console.error('Ошибка записи посещения:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Добавьте эти эндпоинты в server.js после существующих API для розыгрышей

// ============ API ДЛЯ ПОКУПКИ ПЛАТНЫХ РОЗЫГРЫШЕЙ ============

// Получение активных розыгрышей с проверкой дат и доступности для пользователя
app.get('/api/giveaways/:companyId/active', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const userId = req.query.userId;
        
        let giveaways = await getGiveaways(companyId);
        
        // Фильтруем по дате окончания
        const now = new Date();
        giveaways = giveaways.filter(g => {
            if (!g.active) return false;
            if (g.end_date && new Date(g.end_date) < now) return false;
            return true;
        });
        
        // Если передан userId, проверяем для каждого розыгрыша, куплен ли он
        if (userId) {
            const giveawaysWithPurchaseStatus = await Promise.all(giveaways.map(async (g) => {
                const isPurchased = g.is_paid ? await hasUserPurchasedGiveaway(userId, g.id) : true;
                return {
                    ...g,
                    is_purchased: isPurchased
                };
            }));
            res.json({ success: true, giveaways: giveawaysWithPurchaseStatus });
        } else {
            res.json({ success: true, giveaways });
        }
    } catch (error) {
        console.error('Ошибка получения активных розыгрышей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Покупка платного розыгрыша
app.post('/api/giveaways/:giveawayId/purchase', async (req, res) => {
    try {
        const { giveawayId } = req.params;
        const { userId, companyId } = req.body;
        
        if (!userId || !companyId) {
            return res.status(400).json({ success: false, message: 'userId и companyId обязательны' });
        }
        
        // Получаем информацию о розыгрыше
        const giveawayResult = await query('SELECT * FROM giveaways WHERE id = $1', [giveawayId]);
        if (giveawayResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Розыгрыш не найден' });
        }
        
        const giveaway = giveawayResult.rows[0];
        
        // Проверяем, что розыгрыш активен
        if (!giveaway.active) {
            return res.status(400).json({ success: false, message: 'Розыгрыш неактивен' });
        }
        
        // Проверяем дату окончания
        if (giveaway.end_date && new Date(giveaway.end_date) < new Date()) {
            return res.status(400).json({ success: false, message: 'Розыгрыш уже завершен' });
        }
        
        // Проверяем, платный ли розыгрыш
        if (!giveaway.is_paid) {
            return res.status(400).json({ success: false, message: 'Этот розыгрыш бесплатный, не требует оплаты' });
        }
        
        // Проверяем, не купил ли пользователь уже этот розыгрыш
        const alreadyPurchased = await hasUserPurchasedGiveaway(userId, giveawayId);
        if (alreadyPurchased) {
            return res.status(400).json({ success: false, message: 'Вы уже купили доступ к этому розыгрышу' });
        }
        
        // Покупаем доступ
        const purchase = await purchaseGiveaway(userId, giveawayId, companyId, giveaway.bonus_cost);
        
        res.json({ 
            success: true, 
            purchase,
            message: `Доступ к розыгрышу "${giveaway.name}" успешно куплен за ${giveaway.bonus_cost} баллов` 
        });
    } catch (error) {
        console.error('Ошибка покупки розыгрыша:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение купленных розыгрышей пользователя
app.get('/api/users/:userId/giveaways/purchased/:companyId', async (req, res) => {
    try {
        const { userId, companyId } = req.params;
        
        const result = await query(
            `SELECT upg.*, g.name, g.link, g.description, g.is_paid, g.bonus_cost, g.end_date
             FROM user_purchased_giveaways upg
             JOIN giveaways g ON upg.giveaway_id = g.id
             WHERE upg.user_id = $1 AND upg.company_id = $2
             ORDER BY upg.purchased_at DESC`,
            [userId, companyId]
        );
        
        res.json({ success: true, purchased: result.rows });
    } catch (error) {
        console.error('Ошибка получения купленных розыгрышей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============ НАСТРОЙКА ПОЧТЫ ДЛЯ ЯНДЕКС 360 ============
const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    auth: {
        user: 'padavydov@stud.kantiana.ru',     
        pass: 'lqycznijgonufenu'     
    }
});

// ============ ЭНДПОИНТ ДЛЯ ДЕМО-ЗАЯВКИ ============
app.post('/api/demo-request', async (req, res) => {
    try {
        const { brandName, email } = req.body;
        
        if (!brandName || !email) {
            return res.status(400).json({ success: false, message: 'Заполните все поля' });
        }
        
        if (!email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Введите корректный email' });
        }
        
        // Формируем письмо - ОТПРАВЛЯЕМ НА ВАШ ЯНДЕКС 360
        const mailOptions = {
            from: '"LoyaltyPrime" <padavydov@stud.kantiana.ru>',  
            to: 'padavydov@stud.kantiana.ru',                         
            subject: `📋 Новая заявка на демо от ${brandName}`,
            text: `
Новая заявка на демо-доступ к программе лояльности!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Бренд: ${brandName}
📧 Email для связи: ${email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Свяжитесь с клиентом как можно скорее для демонстрации возможностей LoyaltyPrime.
            `,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
                    <h2 style="color: #ff4d4d; margin-bottom: 20px;">📋 Новая заявка на демо</h2>
                    
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 8px 0;"><strong>🏢 Бренд:</strong> ${brandName}</p>
                        <p style="margin: 8px 0;"><strong>📧 Email для связи:</strong> ${email}</p>
                    </div>
                    
                    <p style="color: #555;">Свяжитесь с клиентом как можно скорее для демонстрации возможностей <strong>LoyaltyPrime</strong>.</p>
                    
                    <hr style="margin: 20px 0; border-color: #e0e0e0;">
                    
                    <p style="color: #888; font-size: 12px;">Письмо сгенерировано автоматически из CRM-системы LoyaltyPrime.</p>
                </div>
            `
        };
        
        // Отправляем письмо
        await transporter.sendMail(mailOptions);
        
        console.log(`📧 Демо-заявка отправлена на Яндекс 360: ${brandName} - ${email}`);
        
        res.json({ 
            success: true, 
            message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.' 
        });
        
    } catch (error) {
        console.error('Ошибка отправки письма:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка отправки. Попробуйте позже.' 
        });
    }
});

// ============ API ДЛЯ РЕАЛЬНОЙ АНАЛИТИКИ CRM ============
app.get('/api/companies/:companyId/analytics', async (req, res) => {
    try {
        const { companyId } = req.params;
        const period = req.query.period || 'month';
        
        console.log('🔄 Пересчет классификации всех пользователей перед аналитикой...');
        await recalculateAllUsersClassification(companyId);
        
        const analytics = await getRealAnalytics(companyId, period);
        
        res.json({ success: true, analytics });
    } catch (error) {
        console.error('Ошибка получения аналитики:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API для ручного пересчета классификации пользователей
app.post('/api/companies/:companyId/recalculate-classification', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        await recalculateAllUsersClassification(companyId);
        
        res.json({ success: true, message: 'Классификация пользователей пересчитана' });
    } catch (error) {
        console.error('Ошибка пересчета классификации:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение стрика пользователя
app.get('/api/users/:userId/streak/:companyId', async (req, res) => {
  try {
    const { userId, companyId } = req.params;
    
    const result = await query(
      'SELECT streak, last_streak_update_date FROM user_progress WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
    
    const streak = result.rows.length > 0 ? result.rows[0].streak : 0;
    const lastStreakUpdateDate = result.rows.length > 0 ? result.rows[0].last_streak_update_date : null;
    
    res.json({ success: true, streak, lastStreakUpdateDate });
  } catch (error) {
    console.error('Ошибка получения стрика:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обновление стрика пользователя
app.post('/api/users/:userId/streak/update', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId, streak, lastStreakUpdateDate } = req.body;
    
    await query(
      `INSERT INTO user_progress (user_id, company_id, streak, last_streak_update_date, updated_at) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, company_id) 
       DO UPDATE SET 
         streak = EXCLUDED.streak,
         last_streak_update_date = EXCLUDED.last_streak_update_date,
         updated_at = NOW()`,
      [userId, companyId, streak, lastStreakUpdateDate || null]
    );
    
    res.json({ success: true, streak });
  } catch (error) {
    console.error('Ошибка обновления стрика:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ============ API ДЛЯ НАСТРОЕК БОНУСНОЙ СИСТЕМЫ ============

// Получение настроек бонусной системы компании
app.get('/api/companies/:companyId/bonus-settings', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        
        const result = await query(
            'SELECT bonus_settings FROM companies WHERE id = $1',
            [companyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Компания не найдена' });
        }
        
        let settings = result.rows[0].bonus_settings;
        if (typeof settings === 'string') {
            settings = JSON.parse(settings);
        }
        
        // Устанавливаем значения по умолчанию, если какие-то поля отсутствуют
        const defaultSettings = {
            rubToBonus: 10,
            maxBonusPaymentPercent: 25,
            minPurchaseForBonus: 1000,
            bonusRatePerThousand: 10
        };
        
        const mergedSettings = { ...defaultSettings, ...settings };
        
        res.json({ success: true, settings: mergedSettings });
    } catch (error) {
        console.error('Ошибка получения настроек бонусов:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Обновление настроек бонусной системы компании
app.put('/api/companies/:companyId/bonus-settings', async (req, res) => {
    try {
        const companyId = parseInt(req.params.companyId);
        const { rubToBonus, maxBonusPaymentPercent, minPurchaseForBonus, bonusRatePerThousand } = req.body;
        
        // Валидация
        if (rubToBonus !== undefined && (rubToBonus < 1 || rubToBonus > 1000)) {
            return res.status(400).json({ success: false, message: 'Курс рубль→бонус должен быть от 1 до 1000' });
        }
        
        if (maxBonusPaymentPercent !== undefined && (maxBonusPaymentPercent < 0 || maxBonusPaymentPercent > 100)) {
            return res.status(400).json({ success: false, message: 'Максимальный процент оплаты бонусами должен быть от 0 до 100' });
        }
        
        if (minPurchaseForBonus !== undefined && minPurchaseForBonus < 0) {
            return res.status(400).json({ success: false, message: 'Минимальная сумма для начисления бонусов должна быть >= 0' });
        }
        
        if (bonusRatePerThousand !== undefined && (bonusRatePerThousand < 0 || bonusRatePerThousand > 1000)) {
            return res.status(400).json({ success: false, message: 'Количество бонусов за 1000₽ должно быть от 0 до 1000' });
        }
        
        // Получаем текущие настройки
        const currentResult = await query(
            'SELECT bonus_settings FROM companies WHERE id = $1',
            [companyId]
        );
        
        let currentSettings = {};
        if (currentResult.rows.length > 0 && currentResult.rows[0].bonus_settings) {
            currentSettings = currentResult.rows[0].bonus_settings;
            if (typeof currentSettings === 'string') {
                currentSettings = JSON.parse(currentSettings);
            }
        }
        
        // Обновляем настройки
        const newSettings = {
            ...currentSettings,
            rubToBonus: rubToBonus !== undefined ? rubToBonus : (currentSettings.rubToBonus || 10),
            maxBonusPaymentPercent: maxBonusPaymentPercent !== undefined ? maxBonusPaymentPercent : (currentSettings.maxBonusPaymentPercent || 25),
            minPurchaseForBonus: minPurchaseForBonus !== undefined ? minPurchaseForBonus : (currentSettings.minPurchaseForBonus || 1000),
            bonusRatePerThousand: bonusRatePerThousand !== undefined ? bonusRatePerThousand : (currentSettings.bonusRatePerThousand || 10)
        };
        
        await query(
            'UPDATE companies SET bonus_settings = $1::jsonb WHERE id = $2',
            [JSON.stringify(newSettings), companyId]
        );
        
        res.json({ success: true, settings: newSettings });
    } catch (error) {
        console.error('Ошибка обновления настроек бонусов:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ API ДЛЯ УВЕДОМЛЕНИЙ ============

// Отправка рассылки
app.post('/api/companies/:companyId/notifications/send', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { audience, title, message } = req.body;
        
        console.log('📨 Запрос на отправку рассылки:', { companyId, audience, title, message });
        
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Заголовок и сообщение обязательны' });
        }
        
        const result = await sendNotification(companyId, audience, title, message);
        console.log('✅ Рассылка отправлена успешно:', result);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, error: error.message, message: error.message });
    }
});

// Получение истории рассылок
app.get('/api/companies/:companyId/notifications/history', async (req, res) => {
    try {
        const { companyId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const history = await getNotificationHistory(companyId, limit);
        res.json({ success: true, history });
    } catch (error) {
        console.error('❌ Ошибка получения истории:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение кампаний компании
app.get('/api/companies/:companyId/campaigns', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const campaigns = await getNotificationCampaigns(companyId);
        res.json({ success: true, campaigns });
    } catch (error) {
        console.error('❌ Ошибка получения кампаний:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Добавление кампании
app.post('/api/companies/:companyId/campaigns', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { name, title, message, audience, is_active, interval_days, image_url, is_default } = req.body;
        
        console.log('📝 Запрос на создание кампании:', { companyId, name, title, audience, interval_days });
        
        if (!name || !title || !message) {
            return res.status(400).json({ success: false, message: 'Все поля обязательны' });
        }
        
        const campaign = await addNotificationCampaign(
            companyId, 
            name, 
            title, 
            message, 
            audience || 'all', 
            is_active !== undefined ? is_active : true,
            interval_days || 1,
            image_url || null,
            is_default || false
        );
        
        console.log('✅ Кампания создана:', campaign);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('❌ Ошибка добавления кампании:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, error: error.message, message: error.message });
    }
});

// Обновление кампании
app.put('/api/campaigns/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { name, title, message, audience, is_active, interval_days, image_url } = req.body;
        
        const campaign = await updateNotificationCampaign(
            campaignId,
            name,
            title,
            message,
            audience,
            is_active,
            interval_days,
            image_url
        );
        
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('❌ Ошибка обновления кампании:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Удаление кампании
app.delete('/api/campaigns/:campaignId', async (req, res) => {
    try {
        const { campaignId } = req.params;
        
        await deleteNotificationCampaign(campaignId);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка удаления кампании:', error);
        res.status(500).json({ success: false, error: error.message, message: error.message });
    }
});

// Переключение активности кампании
app.put('/api/campaigns/:campaignId/toggle', async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { is_active } = req.body;
        
        const campaign = await toggleNotificationCampaign(campaignId, is_active);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('❌ Ошибка переключения кампании:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Выполнение кампании (для ручного запуска)
app.post('/api/campaigns/:campaignId/execute', async (req, res) => {
    try {
        const { campaignId } = req.params;
        
        console.log('🚀 Выполнение кампании:', campaignId);
        
        const result = await executeCampaign(campaignId);
        
        // Отправляем уведомления через бота немедленно
        if (result.success && result.users && result.users.length > 0) {
            const botUrl = 'http://localhost:5000/send_campaign_messages';
            const campaignData = {
                campaign_id: campaignId,
                title: result.campaign.title,
                message: result.campaign.message,
                image_url: result.image_url,
                users: result.users
            };
            
            // Отправляем запрос боту в фоновом режиме (не ждем ответа)
            fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignData)
            }).then(response => {
                console.log('✅ Бот получил задачу на отправку кампании');
            }).catch(error => {
                console.error('❌ Ошибка отправки задачи боту:', error);
            });
        }
        
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ Ошибка выполнения кампании:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Получение пользователей по сегменту (для предпросмотра)
app.get('/api/companies/:companyId/users/segment/:segment', async (req, res) => {
    try {
        const { companyId, segment } = req.params;
        
        const users = await getUsersBySegment(companyId, segment);
        res.json({ success: true, users, count: users.length });
    } catch (error) {
        console.error('❌ Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`🐘 База данных: PostgreSQL`);
    console.log(`🔑 Тестовый вход: email: pizza@test.com, password: 123456`);
    console.log(`💳 POS API доступны: /api/pos/verify-qr, /api/pos/apply-bonus, /api/pos/spend-bonus`);
});