const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'loyalty_prime'
});

const SALT_ROUNDS = 10;

const newCompany = {
    company: 'Новая Компания', // замените на нужное
    name: 'Владелец',
    email: 'new@company.ru',   // уникальный email
    phone: '+7 (999) 123-45-67',
    password: 'ваш_пароль',    // здесь можно вводить открытым текстом
    brandColor: '#2ecc71',
    description: 'Описание компании'
};

(async () => {
    const hashedPassword = await bcrypt.hash(newCompany.password, SALT_ROUNDS);
    const result = await pool.query(
        `INSERT INTO companies (company, name, email, phone, password, brand_color, description) 
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [newCompany.company, newCompany.name, newCompany.email, newCompany.phone, hashedPassword, newCompany.brandColor, newCompany.description]
    );
    const companyId = result.rows[0].id;
    console.log('✅ Компания создана, ID:', companyId);
    // Далее можно добавить preset-данные через вызов server-side функции, но если сервер уже запущен, достаточно обновить таблицы
    // Для этого можно вызвать SQL-фрагмент или запустить серверный вызов.
    await pool.end();
})();