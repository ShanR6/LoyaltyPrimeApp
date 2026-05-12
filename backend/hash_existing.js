const { query } = require('./database-pg');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

(async () => {
    // Компании
    const companies = await query(`SELECT id, password FROM companies WHERE password NOT LIKE '$2b$%'`);
    for (const c of companies.rows) {
        const hashed = await bcrypt.hash(c.password, SALT_ROUNDS);
        await query('UPDATE companies SET password = $1 WHERE id = $2', [hashed, c.id]);
        console.log(`Обновлён пароль компании id=${c.id}`);
    }
    // Кассиры
    const cashiers = await query(`SELECT id, password FROM cashier_credentials WHERE password NOT LIKE '$2b$%'`);
    for (const c of cashiers.rows) {
        const hashed = await bcrypt.hash(c.password, SALT_ROUNDS);
        await query('UPDATE cashier_credentials SET password = $1 WHERE id = $2', [hashed, c.id]);
        console.log(`Обновлён пароль кассира id=${c.id}`);
    }
    console.log('Миграция паролей завершена.');
    process.exit();
})();