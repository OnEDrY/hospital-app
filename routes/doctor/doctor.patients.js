const router = require('express').Router();
const User = require("../../models/user.model.js");
const Auth = require("../../models/auth.model.js");
const moment = require('moment');
const sql = require("../../models/db");

const { log } = require("../../helpers/todb.logger.js");
const { renderPage, renderError, renderForm, renderMessage } = require("../../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../../helpers/auth.middleware.js");
const Patient = require('../../models/patient.model.js');
const Doctor = require('../../models/doctor.model.js');

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

function fullnameToNickname(str) {
    var ru = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 
        'е': 'e', 'ё': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 
        'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 
        'щ': 'shch', 'ы': 'y', 'э': 'e', 'ю': 'u', 'я': 'ya'
    }, n_str = [];
    
    str = str.replace(/[ъь]+/g, '').replace(/й/g, 'i');
    
    for ( var i = 0; i < str.length; ++i ) {
       n_str.push(
              ru[ str[i] ]
           || ru[ str[i].toLowerCase() ] == undefined && str[i]
           || ru[ str[i].toLowerCase() ].toUpperCase()
       );
    }
    
    return n_str.join('').replace(/\./g, "").replace(/\s/g, "").toLowerCase();;
}

function generatePassword() {
    var length = 6,
        charset = "0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

// 



router.post("/edit", async (req, res) => {
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

router.post("/add", async (req, res) => {
    let sessionUser = await User.getByToken(req.cookies.token);
    let doctor = await Doctor.getById(sessionUser.id);

    let patient = req.body;

    let format = 'DD.MM.YYYY';
    patient.birthday = moment(patient.birthday, format).format("YYYY-MM-DD HH:mm:ss");
    patient.admission = moment(patient.admission, format).format("YYYY-MM-DD HH:mm:ss");

    // Создание абсолютно нового аккаунта
    if (patient["new-account"]) {
        delete patient.userid;
        delete patient["new-account"];

        let user = new Object();
        let attemp = 1;

        user.name = fullnameToNickname(patient.fullname);
        let name = user.name;

        user.password = generatePassword();

        console.log(user);

        try {
            while (!(await User.nameAvailable(user.name)))
            {
                user.name = name + `_${attemp}`;
                attemp++;
            }
            
            let result = await User.create(user);

            patient.userid = result;
            patient.doctorid = doctor.doctorid;

            await Patient.create(patient);
        } catch (err) { console.log(err); return res.send(err); }

        return res.send(`${user.name}\n${user.password}`);
    }

    let rows = await sql.query("SELECT * FROM patients WHERE userid = ?", patient.userid);

    // Привязка существующего аккаунта к новому врачу
    if (rows.length != 0) {
        let findedPatient = rows[0];

        findedPatient.doctorid = doctor.doctorid;
        await Patient.updatePatient(findedPatient);

        return res.send(renderError("Успех", "Вы добавили пациента", req));
    }

    // Если нет привязки к пациенту - пациент будет создан
    patient.doctorid = doctor.userid;
    await Patient.create(patient);

    res.send(renderError("Успех", "Вы добавили пациента", req));
});

router.post("/set-diagnosis:id?", async (req, res) => {
    try {
        let patient = await Patient.getByPatientId(req.query.id);
        patient.diagnosis = req.body.diagnosis;

        await Patient.updatePatient(patient);

        res.redirect("/");
    } catch (err) { res.json(err); }
});

router.post("/add-test-result:id?", async (req, res) => {
    try {
        let patient = await Patient.getByPatientId(req.query.id);
        patient.diagnosis = req.body.diagnosis;

        let sessionUser = await User.getByToken(req.cookies.token);
        let doctor = await Doctor.getById(sessionUser.id);

        await Patient.addTestResult(patient.patientid, doctor.doctorid, req.body.testresult);

        res.redirect("/");
    } catch (err) { res.json(err); }
});


router.get("/", async (req, res) => {

    let sessionUser = await User.getByToken(req.cookies.token);
    let doctor = await Doctor.getById(sessionUser.id);

    if (doctor == undefined) {
        return res.send("err: user not a doctor");
    }

    let tBodyHtml = "";
    let patients = await Patient.getAllPatiantsByDoctor(doctor.doctorid);

    for (const patient of patients)
    {
        tBodyHtml += `
            <tr class="showhide">
                <td>${patient.userid}</td>
                <td>${patient.fullname}</td>
                <td>${patient.diagnosis}</td>
                <td>${moment(patient.birthday).format('LL')}</td>
                <td><a href="/doctor/patients/set-diagnosis?id=${patient.patientid}" style="margin-right: 10px">Установить диагноз</a><a href="/doctor/patients/add-test-result?id=${patient.patientid}">Добавить результаты анализов</a></td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Ваши пациенты</div>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">User ID</th>
                    <th class="clickable disable-select">ФИО</th>
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

router.get("/set-diagnosis:id?", async (req, res) => {
    let patient = await Patient.getByPatientId(req.query.id);

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="patientid" class="form-label">Patient ID</label>
                        <input name="patientid" id="userid" type="text" class="form-control" aria-describedby="patientid" value="${patient.patientid}" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ФИО</label>
                        <input type="text" class="form-control showhide" readonly value="${patient.fullname}">
                    </div>
                    <div class="mb-3">
                        <label for="diagnosis" class="form-label">Диагноз</label>
                        <input name="diagnosis" type="text" class="form-control showhide" value="">
                    </div>
                    <div class="buttons-group">
                        <a href="/doctor/patients" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Установить диагноз", html, req));
});

router.get("/add-test-result:id?", async (req, res) => {
    let patient = await Patient.getByPatientId(req.query.id);

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="patientid" class="form-label">Patient ID</label>
                        <input name="patientid" id="userid" type="text" class="form-control" aria-describedby="patientid" value="${patient.patientid}" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ФИО</label>
                        <input type="text" class="form-control" value="${patient.fullname}">
                    </div>
                    <div class="mb-3">
                        <label for="testresult" class="form-label">Результаты анализов</label>
                        <input name="testresult" type="text" class="form-control showhide" value="">
                    </div>
                    <div class="buttons-group">
                        <a href="/doctor/patients" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Добавить результаты анализов", html, req));
});

router.get("/add", async (req, res) => {
    let sessionUser = await User.getByToken(req.cookies.token);
    let doctor = await Doctor.getById(sessionUser.id);

    if (doctor == undefined) {
        return res.send("err: user not a doctor");
    }

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="mb-3">
                        <label for="userid" class="form-label">User ID</label>
                        <input name="userid" id="userid" type="text" class="form-control" aria-describedby="userid" value="" readonly>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" id="new-account" name="new-account" class="form-check-input" checked="true" onclick="$('#userid').prop('readonly', $('#new-account').is(':checked')); $('#userid').val('')">
                        <label name="new-account" class="form-check-label">Создать новый аккаунт</label>
                    </div>
                    <div class="mb-3">
                        <label for="fullname" class="form-label">ФИО</label>
                        <input name="fullname" type="text" class="form-control" aria-describedby="fullname" value="">
                    </div>
                    <div class="mb-3">
                        <label for="birthday" class="form-label">Дата рождения</label>
                        <input name="birthday" type="text" class="form-control showhide" value="01.01.2000">
                    </div>
                    <div class="mb-3">
                        <label for="admission" class="form-label">Дата поступления</label>
                        <input name="admission" type="text" class="form-control showhide" value="${moment(new Date()).format("LLL")}">
                    </div>
                    <div class="buttons-group">
                        <a href="/" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Добавить пациента", html, req));
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

router.get('/tests', async (req, res) => {
    let sessionUser = await User.getByToken(req.cookies.token);
    let doctor = await Doctor.getById(sessionUser.id);

    if (doctor == undefined) {
        return res.send("err: user not a doctor");
    }

    let tBodyHtml = "";
    let tests = await Doctor.getTestsByDoctor(doctor.doctorid);

    for (const test of tests)
    {
        let patient = await Patient.getByPatientId(test.patientid);

        tBodyHtml += `
            <tr class="showhide">
                <td>${patient.fullname}</td>
                <td>${test.desk}</td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Ваши пациенты</div>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">ФИО Пациента</th>
                    <th class="clickable disable-select">Результаты анализов</th>
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

module.exports = router;