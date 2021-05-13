const sql = require("./db.js");
const bcrypt = require('bcrypt');

function applyRole(user) {
    if (!user || !user.status)
        return;

    if (user.status == 0)
        user.role = "Banned";
    else if (user.status == 1)
        user.role = "User";
    else if (user.status == 1000)
        user.role = "Root Admin";
    else if (user.status > 10) {
        user.role = `Admin ${user.status - 10}-lvl`;
    } else {
        user.role = "Upgraded User";
    }
}

// Конструктор
class User {
    constructor(user) {
        if (typeof user.id != 'undefined') {
            this.id = user.id;
        }

        this.email = user.email;
        this.name = user.name;
        this.password = user.password;
        this.status = user.status;

        if (typeof user.created_at != 'undefined') {
            this.created_at = user.created_at;
        }
        if (typeof user.updated_at != 'undefined') {
            this.updated_at = user.updated_at;
        }
    }

    static async create(_newUser) {
        let newUser = Object.assign({}, _newUser);

        if (!newUser)
            throw "User object is null";

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(newUser.password, salt);

        newUser.password = hashPassword;

        // Проверка на дубликаты
        let rows = await sql.query('SELECT * FROM users WHERE email = ? OR name = ?', [newUser.email, newUser.name])

        if (rows.length != 0)
            throw "User with specified email/name already exists"

        // Создание записи в БД
        let insert = await sql.query("INSERT INTO users SET ?", newUser);

        return insert.insertId;
    }

    static async getAllUsers() {
        let rows = await sql.query("SELECT * FROM users");

        for (const item of rows) {
            applyRole(item);
        }
        
        return rows;
    }

    static async getById(id) {
        if (!id) throw "ID field is not specified";

        let rows = await sql.query("SELECT * FROM users WHERE id = ?", id);

        if (rows.length > 0) {
            let user = rows[0];
            applyRole(user);
            return user;
        } else throw `Пользователь с id ${id} не найден`;
    }

    static async getByEmail(email) {
        if (!email) throw "Email field is not specified";
        
        // Запрос пользователя из БД
        let rows = await sql.query('SELECT * FROM users WHERE email = ?', email);
        
        if (rows.length > 0) {
            let user = rows[0];
            applyRole(user);
            return user;
        } else return null;
    }

    static async getByEmailOrName(email) {
        if (!email) throw "Email field is not specified";
        
        // Запрос пользователя из БД
        let rows = await sql.query('SELECT * FROM users WHERE email = ? OR name = ?', [email, email]);
        
        if (rows.length > 0) {
            let user = rows[0];
            applyRole(user);
            return user;
        } else return null;
    }

    // Получение пользователя по его токену авторизации
    static async getByToken(token) {
        if (!token) throw "Token is not specified";

        let rows = await sql.query(`
            SELECT users.id, email, name, status FROM users
            INNER JOIN sessions
            ON users.id = sessions.userid
            WHERE session = ?`, token);

        if (rows.length == 0)
            throw "User with specified token not found";


        let user = rows[0];
        applyRole(user);
        return user;
    }

    static async nameAvailable(name) {
        let rows = await sql.query(`SELECT * FROM users WHERE name = ?`, name);

        return rows.length == 0;
    }

    static async updateUser(_user) {
        // Создаем копию объекта
        let user = Object.assign({}, _user);
        
        if (!user) throw "updateUser func: user is null!";
        
        let id = user.id;
        delete user.id;

        let userPrevEmail = await sql.query("SELECT * FROM users WHERE id = ?", id);

        // Занят ли указываемый новый EMAIL?
        if (userPrevEmail.length > 0 && userPrevEmail[0].email != user.email)
        {
            let rows = await sql.query("SELECT * FROM users WHERE email = ?", user.email);

            if (rows.length > 0)
                throw "Указанный email занят";
        }

        // Если нет - обновляем информацию в БД
        await sql.query("UPDATE users SET ? WHERE id = ?", [user, id]);
    }
}

module.exports = User;