const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'loyalty_prime'
});

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Выполнен запрос:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
}

async function initDatabase() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                company VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                password VARCHAR(255) NOT NULL,
                brand_color VARCHAR(50) DEFAULT '#2A4B7C',
                description TEXT DEFAULT 'Добро пожаловать в программу лояльности!',
                active BOOLEAN DEFAULT TRUE,
                settings JSONB DEFAULT '{}',
                tiers_settings JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS promotions (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                emoji VARCHAR(10) DEFAULT '🎯',
                description TEXT,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS quests (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                emoji VARCHAR(10) DEFAULT '✅',
                title VARCHAR(255) NOT NULL,
                description TEXT,
                reward INTEGER DEFAULT 10,
                active BOOLEAN DEFAULT TRUE,
                expires_days INTEGER DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                vk_id VARCHAR(100) NOT NULL,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(255),
                bonus_balance INTEGER DEFAULT 0,
                total_earned INTEGER DEFAULT 0,
                total_spent INTEGER DEFAULT 0,
                current_tier VARCHAR(50) DEFAULT 'Новичок',
                last_daily DATE,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vk_id, company_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                amount INTEGER DEFAULT 0,
                bonus_earned INTEGER DEFAULT 0,
                bonus_spent INTEGER DEFAULT 0,
                description TEXT,
                items JSONB DEFAULT '[]',
                source VARCHAR(50) DEFAULT 'pos',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS user_quests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                quest_id INTEGER REFERENCES quests(id) ON DELETE CASCADE,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reward_claimed BOOLEAN DEFAULT TRUE,
                UNIQUE(user_id, quest_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS user_progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                total_earned INTEGER DEFAULT 0,
                streak INTEGER DEFAULT 0,
                last_login_date DATE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, company_id)
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS user_quest_progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                quest_id INTEGER REFERENCES quests(id) ON DELETE CASCADE,
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                claimed BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, quest_id)
            )
        `);

        console.log('✅ Таблицы созданы/проверены');
        
        await addMissingColumns();
        await insertTestData();

    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
}

// 20 предустановленных заданий
function getPresetQuests() {
    return [
        { emoji: '✅', title: 'Ежедневный вход', description: 'Заходите в приложение каждый день', reward: 10 },
        { emoji: '🎡', title: 'Покрутить колесо фортуны', description: 'Сыграйте в Колесо фортуны и получите бонус', reward: 15 },
        { emoji: '👥', title: 'Пригласить друга', description: 'Пригласите друга в программу лояльности', reward: 50 },
        { emoji: '💰', title: 'Первая покупка', description: 'Совершите свою первую покупку', reward: 100 },
        { emoji: '💎', title: 'Накопить 500 бонусов', description: 'Накопите 500 бонусов на счете', reward: 75 },
        { emoji: '🛍️', title: 'Сделать 3 покупки', description: 'Совершите 3 покупки в нашем заведении', reward: 80 },
        { emoji: '📸', title: 'Оставить отзыв', description: 'Напишите отзыв о нашем заведении', reward: 30 },
        { emoji: '📍', title: 'Отметить посещение', description: 'Отметьтесь на карте при посещении', reward: 20 },
        { emoji: '🎂', title: 'День рождения', description: 'Получите бонус в свой день рождения', reward: 200 },
        { emoji: '📱', title: 'Подписаться на соцсети', description: 'Подпишитесь на наши социальные сети', reward: 25 },
        { emoji: '⭐', title: 'Поставить оценку', description: 'Оцените наше приложение в магазине', reward: 15 },
        { emoji: '🎁', title: 'Акционный код', description: 'Введите промокод из email-рассылки', reward: 40 },
        { emoji: '🏆', title: 'Достижение "Новичок"', description: 'Завершите регистрацию в программе', reward: 50 },
        { emoji: '🔥', title: 'Серия 7 дней', description: 'Заходите в приложение 7 дней подряд', reward: 100 },
        { emoji: '⚡', title: 'Быстрая покупка', description: 'Совершите покупку за 5 минут после входа', reward: 25 },
        { emoji: '🎯', title: 'Попадание в цель', description: 'Накопите 1000 бонусов на счете', reward: 150 },
        { emoji: '👑', title: 'VIP статус', description: 'Достигните уровня "Золото"', reward: 500 },
        { emoji: '📊', title: 'Заполнить профиль', description: 'Заполните всю информацию о себе', reward: 30 },
        { emoji: '🔔', title: 'Включить уведомления', description: 'Включите push-уведомления', reward: 20 },
        { emoji: '🎬', title: 'Посмотреть видео', description: 'Просмотрите обучающее видео', reward: 15 }
    ];
}

async function getCompanyTiers(companyId) {
    try {
        const result = await query('SELECT tiers_settings FROM companies WHERE id = $1', [companyId]);
        
        if (result.rows.length > 0 && result.rows[0].tiers_settings) {
            let tiers = result.rows[0].tiers_settings;
            if (typeof tiers === 'string') {
                tiers = JSON.parse(tiers);
            }
            return tiers;
        }
        
        const defaultTiers = [
            { name: "🌱 Новичок", threshold: 0, multiplier: 1, cashback: 3, color: "#95a5a6", icon: "🌱" },
            { name: "🥉 Бронза", threshold: 500, multiplier: 1.2, cashback: 5, color: "#cd7f32", icon: "🥉" },
            { name: "🥈 Серебро", threshold: 2000, multiplier: 1.5, cashback: 7, color: "#bdc3c7", icon: "🥈" },
            { name: "🥇 Золото", threshold: 8000, multiplier: 2, cashback: 10, color: "#f1c40f", icon: "🥇" },
            { name: "💎 Бриллиант", threshold: 20000, multiplier: 2.5, cashback: 15, color: "#00b4d8", icon: "💎" }
        ];
        
        await updateCompanyTiers(companyId, defaultTiers);
        return defaultTiers;
    } catch (error) {
        console.error('❌ Ошибка getCompanyTiers:', error);
        return [
            { name: "🌱 Новичок", threshold: 0, multiplier: 1, cashback: 3, color: "#95a5a6", icon: "🌱" },
            { name: "🥉 Бронза", threshold: 500, multiplier: 1.2, cashback: 5, color: "#cd7f32", icon: "🥉" },
            { name: "🥈 Серебро", threshold: 2000, multiplier: 1.5, cashback: 7, color: "#bdc3c7", icon: "🥈" },
            { name: "🥇 Золото", threshold: 8000, multiplier: 2, cashback: 10, color: "#f1c40f", icon: "🥇" },
            { name: "💎 Бриллиант", threshold: 20000, multiplier: 2.5, cashback: 15, color: "#00b4d8", icon: "💎" }
        ];
    }
}

// Получить всех пользователей компании для рассылки уведомлений
async function getUsersByCompanyId(companyId) {
    try {
        const result = await query(
            'SELECT id, vk_id, name, bonus_balance, total_spent, last_daily, created_at FROM users WHERE company_id = $1',
            [companyId]
        );
        return result.rows;
    } catch (error) {
        console.error('❌ Ошибка getUsersByCompanyId:', error);
        return [];
    }
}

async function updateCompanyTiers(companyId, tiersSettings) {
    try {
        if (!Array.isArray(tiersSettings)) {
            throw new Error('tiersSettings должен быть массивом');
        }
        
        const sortedTiers = [...tiersSettings].sort((a, b) => a.threshold - b.threshold);
        const tiersJson = JSON.stringify(sortedTiers);
        
        const result = await query(
            'UPDATE companies SET tiers_settings = $1::jsonb WHERE id = $2 RETURNING tiers_settings',
            [tiersJson, companyId]
        );
        
        if (result.rows.length === 0) {
            throw new Error(`Компания с id ${companyId} не найдена`);
        }
        
        let updatedTiers = result.rows[0].tiers_settings;
        if (typeof updatedTiers === 'string') {
            updatedTiers = JSON.parse(updatedTiers);
        }
        
        return updatedTiers;
    } catch (error) {
        console.error('❌ Ошибка updateCompanyTiers:', error);
        throw error;
    }
}

async function addMissingColumns() {
    try {
        const checkTiers = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'tiers_settings'
        `);
        
        if (checkTiers.rows.length === 0) {
            console.log('📝 Добавляем колонку tiers_settings в таблицу companies...');
            const defaultTiers = JSON.stringify([
                {"name": "🌱 Новичок", "threshold": 0, "multiplier": 1, "cashback": 3, "color": "#95a5a6", "icon": "🌱"},
                {"name": "🥉 Бронза", "threshold": 500, "multiplier": 1.2, "cashback": 5, "color": "#cd7f32", "icon": "🥉"},
                {"name": "🥈 Серебро", "threshold": 2000, "multiplier": 1.5, "cashback": 7, "color": "#bdc3c7", "icon": "🥈"},
                {"name": "🥇 Золото", "threshold": 8000, "multiplier": 2, "cashback": 10, "color": "#f1c40f", "icon": "🥇"},
                {"name": "💎 Бриллиант", "threshold": 20000, "multiplier": 2.5, "cashback": 15, "color": "#00b4d8", "icon": "💎"}
            ]);
            await query(`
                ALTER TABLE companies 
                ADD COLUMN tiers_settings JSONB DEFAULT $1::jsonb
            `, [defaultTiers]);
            console.log('✅ Колонка tiers_settings добавлена');
        }
        
        const checkStartDate = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'promotions' AND column_name = 'start_date'
        `);
        
        if (checkStartDate.rows.length === 0) {
            console.log('📝 Добавляем колонки start_date и end_date в таблицу promotions...');
            await query(`ALTER TABLE promotions ADD COLUMN start_date TIMESTAMP`);
            await query(`ALTER TABLE promotions ADD COLUMN end_date TIMESTAMP`);
            console.log('✅ Колонки start_date и end_date добавлены');
        }
        
        const checkExpiresDays = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'expires_days'
        `);
        
        if (checkExpiresDays.rows.length === 0) {
            console.log('📝 Добавляем колонку expires_days в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN expires_days INTEGER DEFAULT 30`);
            console.log('✅ Колонка expires_days добавлена');
        }
        
        const checkEmoji = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'promotions' AND column_name = 'emoji'
        `);
        
        if (checkEmoji.rows.length === 0) {
            console.log('📝 Добавляем колонку emoji в таблицу promotions...');
            await query(`ALTER TABLE promotions ADD COLUMN emoji VARCHAR(10) DEFAULT '🎯'`);
            console.log('✅ Колонка emoji добавлена');
        }
        
        console.log('✅ Все недостающие колонки добавлены');
        
    } catch (error) {
        console.error('❌ Ошибка при добавлении колонок:', error);
    }
}

async function insertTestData() {
    try {
        const result = await query('SELECT COUNT(*) FROM companies');
        const count = parseInt(result.rows[0].count);
        if (count === 0) {
            console.log('📝 Добавление тестовых данных...');
            
            const defaultTiers = JSON.stringify([
                {"name": "🌱 Новичок", "threshold": 0, "multiplier": 1, "cashback": 3, "color": "#95a5a6", "icon": "🌱"},
                {"name": "🥉 Бронза", "threshold": 500, "multiplier": 1.2, "cashback": 5, "color": "#cd7f32", "icon": "🥉"},
                {"name": "🥈 Серебро", "threshold": 2000, "multiplier": 1.5, "cashback": 7, "color": "#bdc3c7", "icon": "🥈"},
                {"name": "🥇 Золото", "threshold": 8000, "multiplier": 2, "cashback": 10, "color": "#f1c40f", "icon": "🥇"},
                {"name": "💎 Бриллиант", "threshold": 20000, "multiplier": 2.5, "cashback": 15, "color": "#00b4d8", "icon": "💎"}
            ]);
            
            await query(`
                INSERT INTO companies (company, name, email, phone, password, brand_color, description, tiers_settings) VALUES 
                ('Пиццерия "Маргарита"', 'Иван Петров', 'pizza@test.com', '+7 (999) 123-45-67', '123456', '#e74c3c', 'Итальянская кухня, пицца, паста', $1),
                ('Кофейня "Кофеин"', 'Анна Сидорова', 'coffee@test.com', '+7 (999) 234-56-78', '123456', '#8e44ad', 'Ароматный кофе, десерты, выпечка', $1)
            `, [defaultTiers]);
            
            await query(`
                INSERT INTO promotions (company_id, name, emoji, description, active) VALUES 
                (1, 'Счастливые часы', '⏰', 'с 15:00 до 17:00 скидка 30%', true),
                (1, 'День рождения', '🎂', '+200 бонусов имениннику', true),
                (1, 'Семейный ужин', '👨‍👩‍👧', 'При заказе от 2000₽ - пицца в подарок', true)
            `);
            
            const presetQuests = getPresetQuests();
            for (const quest of presetQuests) {
                await query(`
                    INSERT INTO quests (company_id, emoji, title, description, reward, active, expires_days) 
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                `, [1, quest.emoji, quest.title, quest.description, quest.reward, 30]);
            }
            
            console.log('✅ Тестовые данные добавлены с 20 заданиями');
        } else {
            console.log(`📊 В базе уже есть ${count} компаний`);
        }
    } catch (error) {
        console.error('❌ Ошибка вставки тестовых данных:', error);
    }
}

// ============ CRUD операции для акций ============
async function getPromotions(companyId) {
    const result = await query('SELECT * FROM promotions WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows;
}

async function addPromotion(companyId, promotionData) {
    const { name, emoji, description, startDate, endDate, active } = promotionData;
    const result = await query(
        `INSERT INTO promotions (company_id, name, emoji, description, start_date, end_date, active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
         RETURNING *`,
        [companyId, name, emoji || '🎯', description || '', startDate || null, endDate || null, active !== undefined ? active : true]
    );
    return result.rows[0];
}

async function updatePromotion(promotionId, promotionData) {
    const { name, emoji, description, startDate, endDate, active } = promotionData;
    const result = await query(
        `UPDATE promotions 
         SET name = $1, emoji = $2, description = $3, start_date = $4, end_date = $5, active = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [name, emoji, description, startDate || null, endDate || null, active, promotionId]
    );
    return result.rows[0];
}

async function deletePromotion(promotionId) {
    await query('DELETE FROM promotions WHERE id = $1', [promotionId]);
    return true;
}

// ============ CRUD операции для заданий ============
async function getQuests(companyId) {
    const result = await query('SELECT * FROM quests WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows;
}

async function addQuest(companyId, questData) {
    const { emoji, title, description, reward, active, expiresDays } = questData;
    const result = await query(
        `INSERT INTO quests (company_id, emoji, title, description, reward, active, expires_days, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
         RETURNING *`,
        [companyId, emoji || '✅', title, description || '', reward || 10, active !== undefined ? active : true, expiresDays || 30]
    );
    return result.rows[0];
}

async function updateQuest(questId, questData) {
    const { emoji, title, description, reward, active, expiresDays } = questData;
    const result = await query(
        `UPDATE quests 
         SET emoji = $1, title = $2, description = $3, reward = $4, active = $5, expires_days = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [emoji, title, description, reward, active, expiresDays || 30, questId]
    );
    return result.rows[0];
}

async function deleteQuest(questId) {
    await query('DELETE FROM quests WHERE id = $1', [questId]);
    return true;
}

// ============ Операции с компаниями ============
async function addCompany(companyData) {
    const { company, name, email, phone, password, brandColor, description } = companyData;
    const defaultTiers = JSON.stringify([
        { name: "🌱 Новичок", threshold: 0, multiplier: 1, cashback: 3, color: "#95a5a6", icon: "🌱" },
        { name: "🥉 Бронза", threshold: 500, multiplier: 1.2, cashback: 5, color: "#cd7f32", icon: "🥉" },
        { name: "🥈 Серебро", threshold: 2000, multiplier: 1.5, cashback: 7, color: "#bdc3c7", icon: "🥈" },
        { name: "🥇 Золото", threshold: 8000, multiplier: 2, cashback: 10, color: "#f1c40f", icon: "🥇" },
        { name: "💎 Бриллиант", threshold: 20000, multiplier: 2.5, cashback: 15, color: "#00b4d8", icon: "💎" }
    ]);
    
    const result = await query(
        `INSERT INTO companies (company, name, email, phone, password, brand_color, description, tiers_settings, active, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW()) 
         RETURNING id, company, email, brand_color as "brandColor", description, created_at`,
        [company, name, email, phone || '', password, brandColor || '#2A4B7C', description || `Добро пожаловать в ${company}!`, defaultTiers]
    );
    return result.rows[0];
}

async function getCompanyByEmail(email) {
    const result = await query('SELECT * FROM companies WHERE email = $1', [email]);
    return result.rows[0];
}

async function getAllCompanies() {
    const result = await query('SELECT id, company, brand_color as "brandColor", description FROM companies WHERE active = true ORDER BY created_at DESC');
    return result.rows;
}

async function getCompanyById(id) {
    const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0];
}

// ============ Операции с пользователями ============
async function getUserById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}

async function getUserByVkId(vkId, companyId) {
    const result = await query('SELECT * FROM users WHERE vk_id = $1 AND company_id = $2', [vkId, companyId]);
    return result.rows[0];
}

async function createUser(vkId, companyId, name) {
    const result = await query(
        `INSERT INTO users (vk_id, company_id, name, bonus_balance, created_at) 
         VALUES ($1, $2, $3, 100, NOW()) 
         RETURNING *`,
        [vkId, companyId, name || 'Пользователь']
    );
    
    await query(
        `INSERT INTO user_progress (user_id, company_id, total_earned, streak, last_login_date) 
         VALUES ($1, $2, 100, 0, NULL)`,
        [result.rows[0].id, companyId]
    );
    
    return result.rows[0];
}

async function updateUserBalance(userId, change, type, description) {
    const user = await getUserById(userId);
    if (!user) throw new Error('Пользователь не найден');
    
    const newBalance = type === 'earn' ? user.bonus_balance + change : user.bonus_balance - change;
    if (newBalance < 0) throw new Error('Недостаточно бонусов');
    
    await query('UPDATE users SET bonus_balance = $1 WHERE id = $2', [newBalance, userId]);
    
    if (type === 'earn') {
        await query('UPDATE users SET total_earned = total_earned + $1 WHERE id = $2', [change, userId]);
        await query('UPDATE user_progress SET total_earned = total_earned + $1 WHERE user_id = $2', [change, userId]);
    }
    
    await query(
        `INSERT INTO transactions (user_id, company_id, amount, bonus_earned, bonus_spent, description, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, user.company_id, type === 'spend' ? change : 0, type === 'earn' ? change : 0, type === 'spend' ? change : 0, description]
    );
    
    return newBalance;
}

async function completeUserQuest(userId, questId, reward) {
    const existing = await query(
        'SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2',
        [userId, questId]
    );
    
    if (existing.rows.length > 0) {
        return null;
    }
    
    await query(
        'INSERT INTO user_quests (user_id, quest_id, completed_at, reward_claimed) VALUES ($1, $2, NOW(), $3)',
        [userId, questId, true]
    );
    
    await updateUserBalance(userId, reward, 'earn', `Задание выполнено! +${reward} бонусов`);
    
    return { questId, reward };
}

async function getUserCompletedQuests(userId) {
    const result = await query(
        `SELECT quest_id FROM user_quests WHERE user_id = $1`,
        [userId]
    );
    return result.rows;
}

async function getUserProgress(userId, companyId) {
    const result = await query(
        `SELECT * FROM user_progress WHERE user_id = $1 AND company_id = $2`,
        [userId, companyId]
    );
    return result.rows[0];
}

async function updateUserProgress(userId, companyId, progressData) {
    const { totalEarned, streak, lastLoginDate } = progressData;
    const result = await query(
        `INSERT INTO user_progress (user_id, company_id, total_earned, streak, last_login_date, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, company_id) 
         DO UPDATE SET 
            total_earned = EXCLUDED.total_earned,
            streak = EXCLUDED.streak,
            last_login_date = EXCLUDED.last_login_date,
            updated_at = NOW()
         RETURNING *`,
        [userId, companyId, totalEarned || 0, streak || 0, lastLoginDate || null]
    );
    return result.rows[0];
}

async function updateQuestProgress(userId, questId, progress, completed, claimed) {
    const result = await query(
        `INSERT INTO user_quest_progress (user_id, quest_id, progress, completed, claimed, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, quest_id) 
         DO UPDATE SET 
            progress = EXCLUDED.progress,
            completed = EXCLUDED.completed,
            claimed = EXCLUDED.claimed,
            updated_at = NOW()
         RETURNING *`,
        [userId, questId, progress, completed, claimed]
    );
    return result.rows[0];
}

async function getAllUserQuestProgress(userId) {
    const result = await query(
        `SELECT quest_id, progress, completed, claimed, updated_at 
         FROM user_quest_progress 
         WHERE user_id = $1`,
        [userId]
    );
    return result.rows.map(row => ({
        quest_id: row.quest_id,
        progress: row.progress,
        completed: row.completed,
        claimed: row.claimed,
        updated_at: row.updated_at
    }));
}

async function checkDailyBonusClaimed(userId, companyId) {
    const result = await query(
        `SELECT last_login_date FROM user_progress 
         WHERE user_id = $1 AND company_id = $2`,
        [userId, companyId]
    );
    
    if (result.rows.length === 0) return false;
    
    const today = new Date().toDateString();
    const lastLogin = result.rows[0].last_login_date 
        ? new Date(result.rows[0].last_login_date).toDateString() 
        : null;
    
    return lastLogin === today;
}

async function claimDailyBonus(userId, companyId, bonusAmount, newStreak) {
    const result = await query(
        `INSERT INTO user_progress (user_id, company_id, streak, last_login_date, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_id, company_id) 
         DO UPDATE SET 
            streak = EXCLUDED.streak,
            last_login_date = EXCLUDED.last_login_date,
            updated_at = NOW()
         RETURNING *`,
        [userId, companyId, newStreak]
    );
    
    await updateUserBalance(userId, bonusAmount, 'earn', 'Ежедневный бонус');
    
    return result.rows[0];
}

module.exports = {
    pool,
    query,
    initDatabase,
    addCompany,
    getCompanyByEmail,
    getAllCompanies,
    getCompanyById,
    getUserById,
    getUserByVkId,
    createUser,
    updateUserBalance,
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
    getPresetQuests,
    getUsersByCompanyId
};