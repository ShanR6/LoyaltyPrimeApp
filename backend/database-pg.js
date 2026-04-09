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
                emoji1 VARCHAR(10) DEFAULT '🎯',
                emoji2 VARCHAR(10) DEFAULT '🎉',
                description TEXT,
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

async function getCompanyTiers(companyId) {
    const result = await query('SELECT tiers_settings FROM companies WHERE id = $1', [companyId]);
    if (result.rows.length > 0 && result.rows[0].tiers_settings && result.rows[0].tiers_settings.length > 0) {
        return result.rows[0].tiers_settings;
    }
    // Возвращаем настройки по умолчанию
    return [
        { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
        { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
        { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
        { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
    ];
}

async function updateCompanyTiers(companyId, tiersSettings) {
    const result = await query(
        'UPDATE companies SET tiers_settings = $1 WHERE id = $2 RETURNING tiers_settings',
        [JSON.stringify(tiersSettings), companyId]
    );
    return result.rows[0]?.tiers_settings || tiersSettings;
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
            await query(`ALTER TABLE companies ADD COLUMN tiers_settings JSONB DEFAULT '[]'`);
            console.log('✅ Колонка tiers_settings добавлена');
        }
        
        const checkEmoji = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'emoji'
        `);
        
        if (checkEmoji.rows.length === 0) {
            console.log('📝 Добавляем колонку emoji в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN emoji VARCHAR(10) DEFAULT '✅'`);
            console.log('✅ Колонка emoji добавлена');
        }
        
        const checkDescription = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'description'
        `);
        
        if (checkDescription.rows.length === 0) {
            console.log('📝 Добавляем колонку description в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN description TEXT`);
            console.log('✅ Колонка description добавлена');
        }
        
        const checkReward = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'reward'
        `);
        
        if (checkReward.rows.length === 0) {
            console.log('📝 Добавляем колонку reward в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN reward INTEGER DEFAULT 10`);
            console.log('✅ Колонка reward добавлена');
        }
        
        const checkActive = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'active'
        `);
        
        if (checkActive.rows.length === 0) {
            console.log('📝 Добавляем колонку active в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN active BOOLEAN DEFAULT TRUE`);
            console.log('✅ Колонка active добавлена');
        }
        
        const checkUpdatedAt = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quests' AND column_name = 'updated_at'
        `);
        
        if (checkUpdatedAt.rows.length === 0) {
            console.log('📝 Добавляем колонку updated_at в таблицу quests...');
            await query(`ALTER TABLE quests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ Колонка updated_at добавлена');
        }
        
        const checkEmoji1 = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'promotions' AND column_name = 'emoji1'
        `);
        
        if (checkEmoji1.rows.length === 0) {
            console.log('📝 Добавляем колонки emoji1/emoji2 в таблицу promotions...');
            await query(`
                ALTER TABLE promotions 
                ADD COLUMN emoji1 VARCHAR(10) DEFAULT '🎯',
                ADD COLUMN emoji2 VARCHAR(10) DEFAULT '🎉'
            `);
            console.log('✅ Колонки добавлены в promotions');
        }
        
        const checkPromoUpdatedAt = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'promotions' AND column_name = 'updated_at'
        `);
        
        if (checkPromoUpdatedAt.rows.length === 0) {
            console.log('📝 Добавляем колонку updated_at в таблицу promotions...');
            await query(`ALTER TABLE promotions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ Колонка updated_at добавлена в promotions');
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
            
            await query(`
                INSERT INTO companies (company, name, email, phone, password, brand_color, description, tiers_settings) VALUES 
                ('Пиццерия "Маргарита"', 'Иван Петров', 'pizza@test.com', '+7 (999) 123-45-67', '123456', '#e74c3c', 'Итальянская кухня, пицца, паста', '[
                    {"name": "Новичок", "threshold": 0, "multiplier": 1, "cashback": 5, "color": "#95a5a6", "icon": "🌱"},
                    {"name": "Серебро", "threshold": 1000, "multiplier": 1.2, "cashback": 6, "color": "#bdc3c7", "icon": "🥈"},
                    {"name": "Золото", "threshold": 5000, "multiplier": 1.5, "cashback": 7.5, "color": "#f1c40f", "icon": "🥇"},
                    {"name": "Платина", "threshold": 20000, "multiplier": 2, "cashback": 10, "color": "#3498db", "icon": "💎"}
                ]'),
                ('Кофейня "Кофеин"', 'Анна Сидорова', 'coffee@test.com', '+7 (999) 234-56-78', '123456', '#8e44ad', 'Ароматный кофе, десерты, выпечка', '[
                    {"name": "Новичок", "threshold": 0, "multiplier": 1, "cashback": 5, "color": "#95a5a6", "icon": "🌱"},
                    {"name": "Серебро", "threshold": 1000, "multiplier": 1.2, "cashback": 6, "color": "#bdc3c7", "icon": "🥈"},
                    {"name": "Золото", "threshold": 5000, "multiplier": 1.5, "cashback": 7.5, "color": "#f1c40f", "icon": "🥇"},
                    {"name": "Платина", "threshold": 20000, "multiplier": 2, "cashback": 10, "color": "#3498db", "icon": "💎"}
                ]')
            `);
            
            await query(`
                INSERT INTO promotions (company_id, name, emoji1, emoji2, description, active) VALUES 
                (1, 'Счастливые часы', '⏰', '☕', 'с 15:00 до 17:00 скидка 30%', true),
                (1, 'День рождения', '🎂', '🎉', '+200 бонусов имениннику', true),
                (1, 'Семейный ужин', '👨‍👩‍👧', '🍕', 'При заказе от 2000₽ - пицца в подарок', true)
            `);
            
            await query(`
                INSERT INTO quests (company_id, emoji, title, description, reward, active) VALUES 
                (1, '✅', 'Ежедневный вход', 'Заходите в приложение каждый день', 10, true),
                (1, '🎡', 'Покрутить колесо', 'Сыграйте в Колесо фортуны', 15, true),
                (1, '👥', 'Пригласить друга', 'Поделитесь приложением с другом', 50, true),
                (1, '💰', 'Первая покупка', 'Совершите первую покупку', 100, true),
                (1, '💎', 'Накопить 500 бонусов', 'Накопите 500 бонусов на счете', 75, true),
                (1, '🛍️', 'Сделать 3 покупки', 'Совершите 3 покупки в нашем заведении', 80, true)
            `);
            
            console.log('✅ Тестовые данные добавлены');
        } else {
            console.log(`📊 В базе уже есть ${count} компаний`);
        }
    } catch (error) {
        console.error('❌ Ошибка вставки тестовых данных:', error);
    }
}

async function getPromotions(companyId) {
    const result = await query('SELECT * FROM promotions WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows;
}

async function addPromotion(companyId, promotionData) {
    const { name, emoji1, emoji2, description, active } = promotionData;
    const result = await query(
        `INSERT INTO promotions (company_id, name, emoji1, emoji2, description, active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING *`,
        [companyId, name, emoji1 || '🎯', emoji2 || '🎉', description || '', active !== undefined ? active : true]
    );
    return result.rows[0];
}

async function updatePromotion(promotionId, promotionData) {
    const { name, emoji1, emoji2, description, active } = promotionData;
    const result = await query(
        `UPDATE promotions 
         SET name = $1, emoji1 = $2, emoji2 = $3, description = $4, active = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, emoji1, emoji2, description, active, promotionId]
    );
    return result.rows[0];
}

async function deletePromotion(promotionId) {
    await query('DELETE FROM promotions WHERE id = $1', [promotionId]);
    return true;
}

async function getQuests(companyId) {
    const result = await query('SELECT * FROM quests WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows;
}

async function addQuest(companyId, questData) {
    const { emoji, title, description, reward, active } = questData;
    const result = await query(
        `INSERT INTO quests (company_id, emoji, title, description, reward, active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING *`,
        [companyId, emoji || '✅', title, description || '', reward || 10, active !== undefined ? active : true]
    );
    return result.rows[0];
}

async function updateQuest(questId, questData) {
    const { emoji, title, description, reward, active } = questData;
    const result = await query(
        `UPDATE quests 
         SET emoji = $1, title = $2, description = $3, reward = $4, active = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [emoji, title, description, reward, active, questId]
    );
    return result.rows[0];
}

async function deleteQuest(questId) {
    await query('DELETE FROM quests WHERE id = $1', [questId]);
    return true;
}

async function addCompany(companyData) {
    const { company, name, email, phone, password, brandColor, description } = companyData;
    const defaultTiers = JSON.stringify([
        { name: "Новичок", threshold: 0, multiplier: 1, cashback: 5, color: "#95a5a6", icon: "🌱" },
        { name: "Серебро", threshold: 1000, multiplier: 1.2, cashback: 6, color: "#bdc3c7", icon: "🥈" },
        { name: "Золото", threshold: 5000, multiplier: 1.5, cashback: 7.5, color: "#f1c40f", icon: "🥇" },
        { name: "Платина", threshold: 20000, multiplier: 2, cashback: 10, color: "#3498db", icon: "💎" }
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
    updateCompanyTiers
};