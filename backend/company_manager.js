const readline = require('readline');
const { Pool } = require('pg');
const { addPresetDataForCompany } = require('./database-pg');

const pool = new Pool({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'loyalty_prime'
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// Функция для синхронизации последовательности ID
async function syncSequence() {
    await pool.query(`
        SELECT setval('companies_id_seq', (SELECT COALESCE(MAX(id), 0) FROM companies))
    `);
}

// Функция для создания компании
async function createCompany() {
    console.log('\nСоздание новой компании\n');
    
    const company = await question('Название компании: ');
    const name = await question('Имя владельца: ');
    const email = await question('Email: ');
    const phone = await question('Телефон: ');
    const password = await question('Пароль: ');
    const brandColor = await question('Цвет бренда (например #2ecc71): ');
    const description = await question('Описание: ');
    
    if (!company || !name || !email || !password) {
        console.log('Ошибка: Название, имя, email и пароль обязательны');
        return;
    }
    
    // Синхронизируем последовательность
    await syncSequence();
    
    // Вставляем новую компанию
    const result = await pool.query(
        `INSERT INTO companies (company, name, email, phone, password, brand_color, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, company, email`,
        [company, name, email, phone || '', password, brandColor || '#2ecc71', description || '']
    );
    
    const companyId = result.rows[0].id;
	await addPresetDataForCompany(companyId);
    console.log(`\nКомпания "${company}" успешно создана!`);
    console.log(`   ID: ${companyId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Пароль: ${password}`);
}

// Функция для удаления компании
async function deleteCompany() {
    // Показываем все компании
    const companies = await pool.query('SELECT id, company, email FROM companies ORDER BY id');
    
    if (companies.rows.length === 0) {
        console.log('\nНет компаний в базе данных');
        return;
    }
    
    console.log('\nСписок компаний:');
    companies.rows.forEach(comp => {
        console.log(`   ID: ${comp.id} | ${comp.company} | ${comp.email}`);
    });
    
    console.log('');
    const answer = await question('Введите ID компании для удаления: ');
    
    const companyId = parseInt(answer);
    if (isNaN(companyId)) {
        console.log('Некорректный ID');
        return;
    }
    
    // Получаем информацию о компании
    const company = await pool.query('SELECT id, company, email FROM companies WHERE id = $1', [companyId]);
    
    if (company.rows.length === 0) {
        console.log('Компания с таким ID не найдена');
        return;
    }
    
    console.log(`\nВы собираетесь удалить компанию:`);
    console.log(`   Название: ${company.rows[0].company}`);
    console.log(`   Email: ${company.rows[0].email}`);
    
    const confirm = await question('\nУдалить? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
        await pool.query('DELETE FROM companies WHERE id = $1', [companyId]);
        console.log('Компания успешно удалена!');
        
        // Синхронизируем последовательность после удаления
        await syncSequence();
        console.log('Последовательность ID синхронизирована');
    } else {
        console.log('Удаление отменено');
    }
}

// Функция для просмотра всех компаний
async function listCompanies() {
    const companies = await pool.query('SELECT id, company, email, phone, created_at FROM companies ORDER BY id');
    
    if (companies.rows.length === 0) {
        console.log('\nНет компаний в базе данных');
        return;
    }
    
    console.log('\nСписок компаний:');
    console.log('┌────┬──────────────────────────┬──────────────────────────┬─────────────┐');
    console.log('│ ID │ Название                 │ Email                    │ Телефон     │');
    console.log('├────┼──────────────────────────┼──────────────────────────┼─────────────┤');
    
    companies.rows.forEach(comp => {
        const name = (comp.company || '').substring(0, 24).padEnd(24);
        const email = (comp.email || '').substring(0, 24).padEnd(24);
        const phone = (comp.phone || '-').substring(0, 11).padEnd(11);
        console.log(`│ ${String(comp.id).padEnd(2)} │ ${name} │ ${email} │ ${phone} │`);
    });
    
    console.log('└────┴──────────────────────────┴──────────────────────────┴─────────────┘');
    console.log(`\nВсего компаний: ${companies.rows.length}`);
}

// Главное меню
async function showMenu() {
    console.clear();
    console.log('╔════════════════════════════════════╗');
    console.log('║     Управление компаниями          ║');
    console.log('╠════════════════════════════════════╣');
    console.log('║  1. Показать все компании          ║');
    console.log('║  2. Создать новую компанию         ║');
    console.log('║  3. Удалить компанию               ║');
    console.log('║  4. Выход                          ║');
    console.log('╚════════════════════════════════════╝');
    console.log('');
}

// Основной цикл
async function main() {
    try {
        // Проверяем подключение к БД
        await pool.query('SELECT NOW()');
        console.log('Подключение к базе данных установлено\n');
        
        let running = true;
        
        while (running) {
            await showMenu();
            const choice = await question('Выберите действие (1-4): ');
            
            switch (choice) {
                case '1':
                    await listCompanies();
                    await question('\nНажмите Enter для продолжения...');
                    break;
                case '2':
                    await createCompany();
                    await question('\nНажмите Enter для продолжения...');
                    break;
                case '3':
                    await deleteCompany();
                    await question('\nНажмите Enter для продолжения...');
                    break;
                case '4':
                    console.log('\nПроизошел выход');
                    running = false;
                    break;
                default:
                    console.log('\nНеверный выбор. Попробуйте снова.');
                    await question('\nНажмите Enter для продолжения...');
            }
        }
        
    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

// Запуск
main();