
let initializeStarts = false;

// Инициализатор таблицы
async function initTable(sql, tableName, initSql) {
    let result = await sql.query(`SHOW TABLES LIKE '${tableName}'`);
    let tableExists = result.length;

    if (!tableExists) {
        await sql.query(initSql);

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
    `   CREATE TABLE users
        (
            id INT NOT NULL AUTO_INCREMENT,
            email VARCHAR(128) NOT NULL UNIQUE,
            name VARCHAR(128) NOT NULL,
            password VARCHAR(256) NOT NULL,
            status INT NOT NULL DEFAULT 1,
            lastedit DATETIME ON UPDATE CURRENT_TIMESTAMP DEFAULT NOW(),
            created DATETIME DEFAULT NOW(),
            PRIMARY KEY(id)
        ) 
        ENGINE = InnoDB;
    `);

    // Инициализация таблицы сессий
    await initTable(sql, 'sessions',
    `   CREATE TABLE sessions
        (
            id INT NOT NULL AUTO_INCREMENT,
            userid VARCHAR(128) NOT NULL,
            session VARCHAR(128) NOT NULL,
            lastedit DATETIME ON UPDATE CURRENT_TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY(id)
        )
        ENGINE = InnoDB;
    `);

    // Инициализация таблицы действий
    await initTable(sql, 'actions', 
    `   CREATE TABLE actions
        (
            actionid INT NOT NULL AUTO_INCREMENT,
            userid INT NOT NULL,
            actiondesk TEXT NOT NULL,
            actiondate DATETIME DEFAULT NOW(),
            PRIMARY KEY(actionid)
        ) 
        ENGINE = InnoDB;
    `);

    if (initializeStarts) console.log('Database sucessfully initialized!');
}

module.exports.initDatabase = initDatabase;