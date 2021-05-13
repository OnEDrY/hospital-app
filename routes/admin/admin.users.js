const router = require('express').Router();
const User = require("../../models/user.model.js");
const Auth = require("../../models/auth.model.js");

const { log } = require("../../helpers/todb.logger.js");
const { renderPage, renderError, renderForm, renderMessage } = require("../../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../../helpers/auth.middleware.js");

const sortFunc = `
    document.addEventListener('DOMContentLoaded', () => {

        const getSort = ({ target }) => {
            const order = (target.dataset.order = -(target.dataset.order || -1));
            const index = [...target.parentNode.cells].indexOf(target);
            const collator = new Intl.Collator(['en', 'ru'], { numeric: true });
            const comparator = (index, order) => (a, b) => order * collator.compare(
                a.children[index].innerHTML,
                b.children[index].innerHTML
            );
            
            for(const tBody of target.closest('table').tBodies)
                tBody.append(...[...tBody.rows].sort(comparator(index, order)));

            for(const cell of target.parentNode.cells)
                cell.classList.toggle('sorted', cell === target);
        };
        
        document.querySelectorAll('.sortable thead').forEach(tableTH => tableTH.addEventListener('click', () => getSort(event)));
        
    });
`;

// 

function doLog(adminId, prevState, newState)
{
    let diffOld = new Object();
    let diffNew = new Object();

    for (key in prevState) {
        if (prevState[key] != newState[key]) {
            diffOld[key] = prevState[key];
            diffNew[key] = newState[key];
        }
    }

    delete diffOld.lastedit;
    delete diffOld.created;

    delete diffNew.lastedit;
    delete diffNew.created;

    delete diffNew.role;
    delete diffOld.role;

    log(adminId, `Admin (id ${adminId}) changed profile data of User (id ${prevState.id}).\n
        Previous values of changed fields: ${JSON.stringify(diffOld)}\n
        New values of changed fields: ${JSON.stringify(diffNew)}`);
}

router.post("/edit", loggedIn, async (req, res) => {
    try {
        let sessionUser = await User.getByToken(req.cookies.token);
        let user = new User(req.body);
        user.id = req.query.id;

        if (sessionUser.status <= user.status && sessionUser.id != user.id)
            return res.send(renderError("Ошибка", "Вы не можете изменить данные этого аккаунта", req));

        delete user.password;

        let prevState = await User.getById(user.id);
        await User.updateUser(user);
        let newState = await User.getById(user.id);

        doLog(sessionUser.id, prevState, newState);
        res.redirect(`/admin/users/edit?id=${req.query.id}&edited=true`);
    }
    catch (err) {
        res.status(500).send(renderError("Ошибка", err, req));
        console.log(err);
    }
});

router.get('/', async (req, res) => {

    let tBodyHtml = "";
    let users = await User.getAllUsers();

    for (const user of users)
    {
        tBodyHtml += `
            <tr class="showhide">
                <td>${user.email}</td>
                <td>${user.name}</td>
                <td>${user.role}</td>
                <td><a href="/admin/users/edit?id=${user.id}" style="margin-right: 10px">Изменить</a><a href="/">Удалить</a></td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Пользователи</div>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">Email</th>
                    <th class="clickable disable-select">Nickname</th>
                    <th class="clickable disable-select">Role</th>
                    <th class="clickable disable-select">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tBodyHtml}
            </tbody>
        </table>
        <script>
            ${sortFunc}
        </script>`;

    res.send(renderPage(bodyHtml, req));
});

router.get('/edit:id?', async (req, res) => {
    let user = null;
    let sessionUser = null;

    let id = req.query.id;
    let prevHtml = "";

    if (req.query.edited) {
        prevHtml = `<div style="background-color: lightgreen; display: inline-block;">Аккаунт успешно изменен</div>`;
    }

    try {
        user = await User.getById(id);
        sessionUser = await User.getByToken(req.cookies.token);
    } catch (err) { return res.send(renderError("Ошибка", err, req)); }

    if (user.status >= sessionUser.status && user.id != sessionUser.id)
        return res.send(renderError("Ошибка", "Вы не можете редактировать данные этого аккаунта", req));

    let canEditStatus = (user.status <= sessionUser.status);
    let editStatusHtml = "readonly";

    if (canEditStatus) {
        editStatusHtml = "";
    }

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="email" class="form-label">Email address</label>
                        <input name="email" type="email" class="form-control" aria-describedby="emailHelp" value="${user.email}">
                    </div>
                    <div class="mb-3">
                        <label for="name" class="form-label">Nickname</label>
                        <input name="name" type="text" class="form-control" aria-describedby="nickname" value="${user.name}">
                    </div>
                    <div class="mb-3">
                        <label for="status" class="form-label">Status</label>
                        <input name="status" type="text" class="form-control showhide" ${editStatusHtml} value="${user.status}">
                        <div class="hide" style="padding-left: 10px; padding-top: 4px;">Previous Role: ${user.role}</div>
                    </div>
                    <div class="buttons-group">
                        <a href="/admin/users" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Изменить аккаунт (как администратор)", html, req, prevHtml));
});

module.exports = router;