
let initializeStarts = false;

// Инициализатор таблицы
async function initTable(sql, tableName, initSql) {
    let result = await sql.query(`SHOW TABLES LIKE '${tableName}'`);
    let tableExists = result.length;

    if (!tableExists) {
        await sql.query(`CREATE TABLE ${tableName} (${initSql}) ENGINE = InnoDB;`);

        if (!initializeStarts) {
            initializeStarts = true;
            console.log('Initializing database...');
        }
    }
}

// Инициализатор базы данных
async function initDatabase(sql) {
    // Инициализация таблицы пользователей
    await initTable(sql, 'users',
    `   id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(128),
        name VARCHAR(128) NOT NULL,
        password VARCHAR(256) NOT NULL,
        status INT NOT NULL DEFAULT 1,
        lastedit DATETIME ON UPDATE CURRENT_TIMESTAMP DEFAULT NOW(),
        created DATETIME DEFAULT NOW(),
        PRIMARY KEY(id)
    `);

    // Инициализация таблицы сессий
    await initTable(sql, 'sessions',
    `   id INT NOT NULL AUTO_INCREMENT,
        userid VARCHAR(128) NOT NULL,
        session VARCHAR(128) NOT NULL,
        lastedit DATETIME ON UPDATE CURRENT_TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY(id)
    `);

    // Инициализация таблицы действий
    await initTable(sql, 'actions', 
    `   actionid INT NOT NULL AUTO_INCREMENT,
        userid INT NOT NULL,
        actiondesk TEXT NOT NULL,
        actiondate DATETIME DEFAULT NOW(),
        PRIMARY KEY(actionid)
    `);

    // Таблица пациентов
    await initTable(sql, 'patients',
    `   patientid INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
        userid INT NOT NULL,
        fullname TEXT NOT NULL, 
        doctorid INT NOT NULL, 
        diagnosis VARCHAR(1024) DEFAULT 'Диагноз не установлен', 
        birthday DATE,
        admission DATETIME DEFAULT CURRENT_TIMESTAMP,
        discharge DATETIME
    `);

    // Таблица врачей
    await initTable(sql, 'doctors',
    `   doctorid INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
        userid INT NOT NULL,
        fullname TEXT NOT NULL,
        desk TEXT
    `)

    await initTable(sql, 'therapies',
    `   therapyid INT NOT NULL PRIMARY KEY AUTO_INCREMENT, 
        patientid INT NOT NULL,
        doctorid TEXT NOT NULL,
        desk TEXT
    `)

    await initTable(sql, 'tests',
    `   testid INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        testname VARCHAR(1024) DEFAULT 'Анализ крови',
        patientid INT NOT NULL,
        doctorid TEXT NOT NULL,
        datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
        desk TEXT
    `)

    if (initializeStarts) console.log('Database sucessfully initialized!');
}

module.exports.initDatabase = initDatabase;