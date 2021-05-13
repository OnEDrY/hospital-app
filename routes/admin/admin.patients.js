const router = require('express').Router();
const User = require("../../models/user.model.js");
const Auth = require("../../models/auth.model.js");

const { log } = require("../../helpers/todb.logger.js");
const { renderPage, renderError, renderForm, renderMessage } = require("../../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../../helpers/auth.middleware.js");
const Patient = require('../../models/patient.model.js');
const Doctor = require('../../models/doctor.model.js');

const moment = require('moment');
moment.locale("ru");

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
        let patient = req.body;
        patient.patientid = req.query.id;

        await Patient.updatePatient(patient);

        res.redirect(`/admin/patients/edit?id=${req.query.id}&edited=true`);
    }
    catch (err) {
        res.status(500).send(renderError("Ошибка", err, req));
        console.log(err);
    }
});

router.get('/', async (req, res) => {

    let tBodyHtml = "";
    let patients = await Patient.getAllPatients();

    for (const patient of patients)
    {
        let doctor = await Doctor.getByDoctorId(patient.doctorid);

        if (!doctor)
            doctor = { fullname: "<doctor not found>" };
        
        tBodyHtml += `
            <tr class="showhide">
                <td>${patient.userid}</td>
                <td>${patient.fullname}</td>
                <td>${doctor.fullname}</td>
                <td>${patient.diagnosis}</td>
                <td>${moment(patient.birthday).format('LL')}</td>
                <td><a href="/admin/patients/edit?id=${patient.patientid}" style="margin-right: 10px">Изменить</a><a href="/">Удалить</a></td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Пациенты</div>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">User ID</th>
                    <th class="clickable disable-select">ФИО</th>
                    <th class="clickable disable-select">Лечащий врач</th>
                    <th class="clickable disable-select">Диагноз</th>
                    <th class="clickable disable-select">Дата рождения</th>
                    <th class="clickable disable-select">Действия</th>
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
    let patient = null;
    let sessionUser = null;

    let prevHtml = "";

    if (req.query.edited)
        prevHtml = `<div style="background-color: lightgreen; display: inline-block;">Аккаунт успешно изменен</div>`;
    

    try {
        patient = await Patient.getByPatientId(req.query.id);
        sessionUser = await User.getByToken(req.cookies.token);
    } catch (err) { return res.send(renderError("Ошибка", err, req)); }

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="fullname" class="form-label">ФИО</label>
                        <input name="fullname" class="form-control" value="${patient.fullname}">
                    </div>
                    <div class="mb-3">
                        <label for="birthday" class="form-label">Дата рождения</label>
                        <input name="birthday" type="text" class="form-control" aria-describedby="birthday" value="${new Date(patient.birthday).toLocaleDateString()}">
                    </div>
                    <div class="buttons-group">
                        <a href="/admin/patients" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Изменить аккаунт (как администратор)", html, req, prevHtml));
});

module.exports = router;