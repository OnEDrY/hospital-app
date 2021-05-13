const router = require('express').Router();
const User = require("../../models/user.model");
const Auth = require("../../models/auth.model");
const Doctor = require("../../models/doctor.model");

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
        let doctor = req.body;
        doctor.doctorid = req.query.id;

        await Doctor.updateDoctor(doctor);
        res.redirect(`/admin/doctors/edit?id=${req.query.id}&edited=true`);
    }
    catch (err) {
        res.status(500).send(renderError("Ошибка", err, req));
        console.log(err);
    }
});

router.post('/add', async (req, res) => {
    try {
        let doctor = req.body;
        await Doctor.create(doctor);

        res.redirect("/admin/doctors/edit?id=34&prevHtml=Успех");
    } catch (err) { res.json(err); }
});

router.get('/', async (req, res) => {

    let tBodyHtml = "";
    let doctors = await Doctor.getAllDoctors();

    for (const doctor of doctors)
    {
        tBodyHtml += `
            <tr class="showhide">
                <td>${doctor.userid}</td>
                <td>${doctor.fullname}</td>
                <td>${doctor.desk}</td>
                <td><a href="/admin/doctors/edit?id=${doctor.userid}" style="margin-right: 10px">Изменить</a><a href="/">Удалить</a></td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Врачи</div>
        <a href="/admin/doctors/add" style="margin: 15%;">Добавить врача</a>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">User ID</th>
                    <th class="clickable disable-select">ФИО</th>
                    <th class="clickable disable-select">Должность</th>
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

router.get('/add', async (req, res) => {
    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="userid" class="form-label">User ID</label>
                        <input name="userid" type="text" class="form-control"  value="">
                    </div>
                    <div class="mb-3">
                        <label for="fullname" class="form-label">ФИО</label>
                        <input name="fullname" type="text" class="form-control" value="">
                    </div>
                    <div class="mb-3">
                        <label for="desk" class="form-label">Описание</label>
                        <input name="desk" type="text" class="form-control showhide" value="">
                    </div>
                    <div class="buttons-group">
                        <a href="/admin/doctors" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Добавить врача", html, req));
});

router.get('/edit:id?', async (req, res) => {
    let doctor = null;

    let id = req.query.id;
    let prevHtml = "";

    if (req.query.edited) {
        prevHtml = `<div style="background-color: lightgreen; display: inline-block;">Аккаунт успешно изменен</div>`;
    }

    try {
        doctor = await Doctor.getById(id);
    } catch (err) { return res.send(renderError("Ошибка", err, req)); }

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="userid" class="form-label">User ID</label>
                        <input name="userid" type="text" class="form-control" aria-describedby="emailHelp" value="${doctor.userid}">
                    </div>
                    <div class="mb-3">
                        <label for="fullname" class="form-label">ФИО</label>
                        <input name="fullname" type="text" class="form-control" aria-describedby="nickname" value="${doctor.fullname}">
                    </div>
                    <div class="mb-3">
                        <label for="desk" class="form-label">Описание</label>
                        <input name="desk" type="text" class="form-control showhide" value="${doctor.desk}">
                    </div>
                    <div class="buttons-group">
                        <a href="/admin/doctors" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Изменить данные врача", html, req, prevHtml));
});

module.exports = router;