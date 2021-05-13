
const sql = require("../models/db.js");

exports.log = async function (userid, actionDesk) {
    let action = new Object();

    action.userid = userid;
    action.actiondesk = actionDesk;

    await sql.query("INSERT INTO actions SET ?", action);
}