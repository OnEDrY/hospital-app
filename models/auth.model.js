const sql = require("./db.js");
const bcrypt = require('bcrypt');

class Auth {
    static async createSession(user) {
        let salt = await bcrypt.genSalt(10);
        let session = await bcrypt.hash(salt, salt);
        
        let insert = await sql.query("INSERT INTO `sessions` (`userid`, `session`) VALUES (?, ?)", [user.id, session]);
    
        return session;
    };

    static async removeSession(token) {
        await sql.query("DELETE FROM `sessions` WHERE `sessions`.`session` = ?", token);
    };

    static async verifySession(token) {
        let rows = await sql.query("SELECT * FROM sessions WHERE session = ?", token);

        return rows.length > 0;
    }
}

module.exports = Auth;