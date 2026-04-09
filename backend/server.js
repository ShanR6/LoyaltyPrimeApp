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
    getCompanyTiers,
    updateCompanyTiers,
    query
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
        const { companyId, name, emoji1, emoji2, description, active } = req.body;
        const promotion = await addPromotion(companyId, { name, emoji1, emoji2, description, active });
        res.json({ success: true, promotion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/promotions/:id', async (req, res) => {
    try {
        const { name, emoji1, emoji2, description, active } = req.body;
        const promotion = await updatePromotion(req.params.id, { name, emoji1, emoji2, description, active });
        res.json({ success: true, promotion });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        const { companyId, emoji, title, description, reward, active } = req.body;
        
        if (!title || !reward) {
            return res.status(400).json({ success: false, message: 'Название и награда обязательны' });
        }
        
        const quest = await addQuest(companyId, { emoji, title, description, reward, active });
        res.json({ success: true, quest });
    } catch (error) {
        console.error('Ошибка добавления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/quests/:id', async (req, res) => {
    try {
        const { emoji, title, description, reward, active } = req.body;
        const quest = await updateQuest(req.params.id, { emoji, title, description, reward, active });
        res.json({ success: true, quest });
    } catch (error) {
        console.error('Ошибка обновления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/quests/:id', async (req, res) => {
    try {
        await deleteQuest(req.params.id);
        res.json({ success: true });
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
        const activeQuests = allQuests.filter(q => q.active === true);
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
        res.json({ success: true, newBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/dailyBonus/check', async (req, res) => {
    try {
        const { userId, companyId } = req.body;
        const claimed = await checkDailyBonusClaimed(userId, companyId);
        res.json({ claimed });
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
        const tiers = await getCompanyTiers(req.params.companyId);
        console.log(`✅ Получены уровни для компании ${req.params.companyId}:`, tiers);
        res.json({ success: true, tiers });
    } catch (error) {
        console.error('Ошибка получения уровней:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/companies/:companyId/tiers', async (req, res) => {
    try {
        const { tiers } = req.body;
        
        if (!tiers || !Array.isArray(tiers)) {
            return res.status(400).json({ success: false, message: 'Неверный формат данных' });
        }
        
        for (const tier of tiers) {
            if (!tier.name || typeof tier.threshold !== 'number' || 
                typeof tier.multiplier !== 'number' || typeof tier.cashback !== 'number') {
                return res.status(400).json({ success: false, message: 'Неверные данные уровня' });
            }
        }
        
        const updatedTiers = await updateCompanyTiers(req.params.companyId, tiers);
        console.log(`✅ Обновлены уровни для компании ${req.params.companyId}:`, updatedTiers);
        res.json({ success: true, tiers: updatedTiers });
    } catch (error) {
        console.error('Ошибка обновления уровней:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ API ДЛЯ ПОЛУЧЕНИЯ УРОВНЯ ПОЛЬЗОВАТЕЛЯ ============
app.get('/api/users/:userId/tier', async (req, res) => {
    try {
        const user = await getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        let tiers = await getCompanyTiers(user.company_id);
        console.log(`📊 Уровни компании ${user.company_id}:`, JSON.stringify(tiers, null, 2));
        
        // Проверяем, что tiers не пустой
        if (!tiers || tiers.length === 0) {
            tiers = [
                { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
                { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
                { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
                { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
            ];
        }
        
        const progress = await getUserProgress(user.id, user.company_id);
        const totalEarned = progress?.total_earned || user.total_earned || 0;
        
        console.log(`💰 Всего заработано пользователем ${user.id}: ${totalEarned}`);
        
        // Сортируем уровни по порогу
        const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
        
        let currentTier = sortedTiers[0];
        let nextTier = null;
        
        // Находим текущий уровень (последний, у которого порог <= totalEarned)
        for (let i = sortedTiers.length - 1; i >= 0; i--) {
            if (totalEarned >= sortedTiers[i].threshold) {
                currentTier = sortedTiers[i];
                break;
            }
        }
        
        // Находим следующий уровень (первый, у которого порог > totalEarned)
        for (let i = 0; i < sortedTiers.length; i++) {
            if (totalEarned < sortedTiers[i].threshold) {
                nextTier = sortedTiers[i];
                break;
            }
        }
        
        let progressToNext = 100;
        if (nextTier) {
            const prevThreshold = currentTier.threshold;
            const nextThreshold = nextTier.threshold;
            const earnedInCurrent = totalEarned - prevThreshold;
            const neededForNext = nextThreshold - prevThreshold;
            progressToNext = neededForNext > 0 ? (earnedInCurrent / neededForNext) * 100 : 100;
            progressToNext = Math.min(Math.max(progressToNext, 0), 100);
        }
        
        console.log(`📈 Текущий уровень: ${currentTier.name}, Следующий: ${nextTier?.name || 'нет'}, Прогресс: ${progressToNext}%`);
        
        res.json({
            success: true,
            currentTier,
            nextTier,
            progressToNext,
            totalEarned,
            allTiers: sortedTiers,
            progressColor: currentTier.color,
            nextColor: nextTier ? nextTier.color : currentTier.color
        });
    } catch (error) {
        console.error('Ошибка получения уровня пользователя:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`🐘 База данных: PostgreSQL`);
    console.log(`🔑 Тестовый вход: email: pizza@test.com, password: 123456`);
});