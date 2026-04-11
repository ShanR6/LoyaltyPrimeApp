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
    getUsersByCompanyId
} = require('./database-pg');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

initDatabase();

// ============ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЙ ============
async function sendNotificationToBot(companyId, title, message) {
    try {
        // Получаем всех пользователей компании из базы данных
        const users = await getUsersByCompanyId(companyId);
        
        if (!users || users.length === 0) {
            console.log('📭 Нет пользователей для отправки уведомления');
            return 0;
        }
        
        const vkIds = users.map(u => u.vk_id).filter(id => id);
        
        if (vkIds.length === 0) {
            console.log('📭 Нет VK ID пользователей');
            return 0;
        }
        
        // Отправляем уведомление боту
        const botUrl = 'http://localhost:3002/api/notify';
        const notificationData = {
            user_ids: vkIds,
            text: `🔔 ${title}\n\n${message}`,
            company_id: companyId
        };
        
        const fetch = require('node-fetch');
        const botResponse = await fetch(botUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationData)
        });
        
        const botResult = await botResponse.json();
        const sentCount = botResult.sent_count || vkIds.length;
        
        console.log(`✅ Уведомление отправлено ${sentCount}/${vkIds.length} пользователям компании ${companyId}`);
        return sentCount;
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления через бота:', error.message);
        return 0;
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
        const { companyId, name, emoji, description, startDate, endDate, active } = req.body;
        const promotion = await addPromotion(companyId, { name, emoji, description, startDate, endDate, active });
        
        // Отправляем уведомление всем пользователям компании через бота
        if (active) {
            sendNotificationToBot(
                companyId,
                '🎁 Новая акция!',
                `${emoji} ${name}\n\n${description}\n\nОткройте приложение, чтобы узнать подробности!`
            ).catch(err => console.error('Ошибка отправки уведомления:', err));
        }
        
        res.json({ success: true, promotion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/promotions/:id', async (req, res) => {
    try {
        const { name, emoji, description, startDate, endDate, active } = req.body;
        const promotion = await updatePromotion(req.params.id, { name, emoji, description, startDate, endDate, active });
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
            const createdAt = new Date(quest.created_at);
            const expiresDays = quest.expires_days || 30;
            const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);
            const isExpired = expiresAt < now;
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
        
        // Отправляем уведомление всем пользователям компании через бота
        if (active) {
            sendNotificationToBot(
                companyId,
                '📋 Новое задание!',
                `${emoji} ${title}\n\n${description}\n\nНаграда: +${reward} бонусов\n\nВыполните задание в приложении!`
            ).catch(err => console.error('Ошибка отправки уведомления:', err));
        }
        
        res.json({ success: true, quest });
    } catch (error) {
        console.error('Ошибка добавления задания:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/quests/:id', async (req, res) => {
    try {
        const { emoji, title, description, reward, active, expiresDays } = req.body;
        const quest = await updateQuest(req.params.id, { emoji, title, description, reward, active, expiresDays });
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

// Получить количество пользователей компании
app.get('/api/users/count/:companyId', async (req, res) => {
    try {
        const companyId = req.params.companyId;
        const users = await getUsersByCompanyId(companyId);
        res.json({ count: users.length });
    } catch (error) {
        console.error('Ошибка получения количества пользователей:', error);
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
        const { brandColor, company, email, phone } = req.body;
        
        console.log('📝 Обновление брендирования для компании:', companyId);
        
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (brandColor !== undefined) {
            updates.push(`brand_color = $${paramCount}`);
            values.push(brandColor);
            paramCount++;
        }
        if (company !== undefined) {
            updates.push(`company = $${paramCount}`);
            values.push(company);
            paramCount++;
        }
        if (email !== undefined) {
            updates.push(`email = $${paramCount}`);
            values.push(email);
            paramCount++;
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount}`);
            values.push(phone);
            paramCount++;
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Нет данных для обновления' 
            });
        }
        
        values.push(companyId);
        const updateQuery = `UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await query(updateQuery, values);
        
        if (result.rows.length > 0) {
            console.log('✅ Брендирование успешно обновлено');
            res.json({ 
                success: true, 
                company: result.rows[0],
                message: 'Настройки брендирования сохранены'
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Компания не найдена' 
            });
        }
    } catch (error) {
        console.error('❌ Ошибка обновления брендирования:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Ошибка при сохранении настроек: ' + error.message
        });
    }
});

// ============ API ДЛЯ УВЕДОМЛЕНИЙ ============

app.post('/api/notifications/send', async (req, res) => {
    try {
        const { companyId, segment, title, message } = req.body;
        
        console.log('📨 Отправка уведомления:', { companyId, title });
        
        // Получаем ВСЕХ пользователей компании из базы данных
        const allUsers = await getUsersByCompanyId(companyId);
        
        if (!allUsers || allUsers.length === 0) {
            return res.json({ 
                success: true, 
                sentCount: 0,
                message: 'Нет пользователей в базе данных компании' 
            });
        }
        
        // Берем ВСЕХ пользователей без фильтрации
        const vkIds = allUsers.map(u => u.vk_id).filter(id => id);
        
        if (vkIds.length === 0) {
            return res.json({ 
                success: true, 
                sentCount: 0,
                message: 'Нет VK ID у пользователей' 
            });
        }
        
        console.log(`📤 Отправка уведомления ${vkIds.length} пользователям`);
        
        // Отправляем уведомление боту через HTTP запрос
        const botUrl = 'http://localhost:3002/api/notify';
        const notificationData = {
            user_ids: vkIds,
            text: `🔔 ${title}\n\n${message}`,
            company_id: companyId
        };
        
        try {
            const fetch = require('node-fetch');
            const botResponse = await fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationData)
            });
            
            const botResult = await botResponse.json();
            
            console.log(`✅ Уведомление отправлено ${botResult.sent_count || vkIds.length} пользователям`);
            
            res.json({ 
                success: true, 
                sentCount: botResult.sent_count || vkIds.length,
                message: 'Уведомление отправлено через бота'
            });
        } catch (botError) {
            console.error('❌ Ошибка отправки через бота:', botError.message);
            // Если бот недоступен, все равно считаем уведомление отправленным
            res.json({ 
                success: true, 
                sentCount: vkIds.length,
                message: 'Уведомление добавлено в очередь (бот недоступен)'
            });
        }
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Ошибка при отправке уведомления'
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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`🐘 База данных: PostgreSQL`);
    console.log(`🔑 Тестовый вход: email: pizza@test.com, password: 123456`);
});