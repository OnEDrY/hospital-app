const router = require('express').Router();
const User = require("../../models/user.model.js");
const Auth = require("../../models/auth.model.js");
const sql = require("../../models/db.js");

const moment = require("moment");
moment.locale("ru");

const { renderPage, renderError, renderForm, renderMessage } = require("../../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../../helpers/auth.middleware.js");

const usersRoute = require('./admin.users.js');

// 

router.get('/', async (req, res) => {
    let bodyHtml = `
        <div class="admin-topic">Админ-панель</div><br><br>
            <div style="margin-left: 15%">
            <a href="/admin/patients" class="admin-panel-button" style="background-color: lightgreen">Пациенты</a>
            <a href="/admin/doctors" class="admin-panel-button" style="background-color: lightpink">Врачи</a>
            <br><br><br>
            <a href="/admin/users" class="admin-panel-button" style="background-color: lightgreen">Пользователи</a>
            <a href="/admin/log" class="admin-panel-button">Лог действий</a>
            </div>
        </div>`;

    res.send(renderPage(bodyHtml, req));
})

router.get('/raw-log:id?', async (req, res) => {
    try {
        let rows = await sql.query("SELECT * FROM actions WHERE actionid = ?", req.query.id);
        let log = rows[0];

        let str = JSON.stringify(log);
        str = str.replace(/\\n/g, "<br>")

        res.send(str);
    } catch (err) { res.send(err); }
})

router.get('/log:page?', async (req, res) => {
    let page = req.query.page;

    const rows = await sql.query("SELECT MAX(actionid) 'id' FROM actions");
    let actionsCount = rows[0].id;
    let pagesCount = Math.ceil(actionsCount / 15);

    if (!page) page = pagesCount - 1;
    else page--;

    const actions = await sql.query(`SELECT * FROM actions WHERE actionid > ${page * 15} LIMIT 15`);

    let itemsHtml = "";

    for (const t of actions)
    {
        itemsHtml += `
            <div class="log-item">
                <div class="log-item-id"><a href="/admin/raw-log?id=${t.actionid}">${t.actionid}</a></div>
                <div class="log-item-userid"><a href="/admin/users/edit?id=${t.userid}">${t.userid}</a></div>
                <div class="log-item-action">${t.actiondesk}</div>
                <div class="log-item-date">${moment(t.actiondate).format("LLLL")} (${moment(t.actiondate).fromNow()})</div>
            </div>`;
    }

    let pagesHtml = "";

    if (pagesCount > 8 && page > 3) {
        for (let i = page - 3; i < page + 4 && i < pagesCount; i++) {
            if (page + 1 == i + 1) pagesHtml += `<a class="page" style="color: black" href="/admin/log?page=${i + 1}"><b>${i + 1}</b></a>`;
            else pagesHtml += `<a class="page" href="/admin/log?page=${i + 1}">${i + 1}</a>`;
        }
    } else {
        for (let i = 0; i < pagesCount; i++) {
            if (page + 1 == i + 1) pagesHtml += `<a class="page" style="color: black" href="/admin/log?page=${i + 1}"><b>${i + 1}</b></a>`;
            else pagesHtml += `<a class="page" href="/admin/log?page=${i + 1}">${i + 1}</a>`;
        }
    }

    let bodyHtml = `
        <div class="admin-topic">Лог действий</div>
        <div class="admin-log-items">
            <div class="log-item">
                <div class="log-item-id">ID</div>
                <div class="log-item-userid">User</div>
                <div class="log-item-action">Action</div>
                <div class="log-item-date">Date</div>
            </div>
            ${itemsHtml}
            <div class="page-selector">
                ${pagesHtml}
            </div>
        </div>`;

    res.send(renderPage(bodyHtml, req));
})

module.exports = router;