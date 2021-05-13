const router = require('express').Router();

const User = require("../models/user.model.js");
const Auth = require("../models/auth.model.js");

const { log } = require("../helpers/todb.logger.js");
const { renderPage, renderError, renderForm, renderMessage } = require("../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../helpers/auth.middleware.js");
const Patient = require('../models/patient.model.js');
const Doctor = require('../models/doctor.model.js');

const moment = require('moment');
moment.locale("ru");

// 

// Сделает запись в БД о измененных полях аккаунта
function doLog(prevState, newState)
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

    log(prevState.id, `User (id ${prevState.id}) changed (updated) profile data.\n
        Previous values of changed fields: ${JSON.stringify(diffOld)}\n
        New values of changed fields: ${JSON.stringify(diffNew)}`);
}

// Завершение сессии
router.post("/logout", loggedIn, async (req, res) => {
    try {
        let token = req.cookies.token;
        let user = await User.getByToken(token);

        await Auth.removeSession(token);

        req.cookies.token = null;
        req.cookies.admin = null;

        res.clearCookie("token");
        res.clearCookie("admin");

        log(user.id, `User logged out (id ${user.id})`);
        res.send(renderMessage("Информация", "Вы успешно вышли из аккаунта!", req));
    }
    catch (err) {
        res.status(500).send(renderError("ERR", err, req));
    }
});

router.post("/edit", loggedIn, async (req, res) => {
    try {
        let sessionUser = await User.getByToken(req.cookies.token);
        let user = new User(req.body);
        user.id = sessionUser.id;

        let prevState = await User.getById(user.id);

        delete user.status;
        delete user.password;

        await User.updateUser(user);

        let newState = await User.getById(user.id);

        doLog(prevState, newState);

        res.cookie("nickname", user.name);
        res.redirect("/account?edited=true");
    }
    catch (err) {
        res.status(500).send(renderError("Ошибка", err, req));
    }
});

router.get('/', async (req, res) => {
    let user = null;
    let patient = null;
    let doctor = null;

    try {
        user = await User.getByToken(req.cookies.token); 
        patient = await Patient.getByUserId(user.id);
        doctor = await Doctor.getById(user.id);
    } catch (err) { return res.send(err); }

    let isAdmin = user.status == 1000;
    let prevHtml = "";

    if (req.query.edited) {
        prevHtml = `<div style="background-color: lightgreen; display: inline-block;">Аккаунт успешно изменен</div>`;
    }

    // Закрепленный за пользователем пациент
    let patientHtml = '';
    let doctorHtml = '';

    if (patient)
        patientHtml = `
            <div class="account-form" style="margin-left: 40px">
                <div class="edit-account-form-body">
                    <div style="margin-bottom: 20px">Прикрепленный пациент:</div>
                    <form>
                        <div class="mb-3">
                            <label for="email" class="form-label">ФИО</label>
                            <input name="email" type="email" class="form-control" aria-describedby="emailHelp" readonly value="${patient.fullname}">
                        </div>
                        <div class="mb-3">
                            <label for="name" class="form-label">Дата рождения</label>
                            <input name="name" type="text" class="form-control" aria-describedby="nickname" readonly value="${moment(patient.birthday).format("LLL")} (${moment(patient.birthday).fromNow()})">
                        </div>
                    </form>
                </div>
            </div>`;

    if (doctor)
        doctorHtml = `
            <div class="account-form" style="margin-left: 40px">
                <div class="edit-account-form-body">
                    <div style="margin-bottom: 20px">Являетесь врачом:</div>
                    <form>
                        <div class="mb-3">
                            <label for="email" class="form-label">ФИО</label>
                            <input name="email" type="email" class="form-control" aria-describedby="emailHelp" readonly value="${doctor.fullname}">
                        </div>
                        <div class="mb-3">
                            <label for="name" class="form-label">Должность</label>
                            <input name="name" type="text" class="form-control" aria-describedby="nickname" readonly value="${doctor.desk}">
                        </div>
                    </form>
                </div>
            </div>`;

    let userHtml = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="get" action="/account/edit">
                    <div class="mb-3">
                        <label for="email" class="form-label">User ID</label>
                        <input name="email" type="email" class="form-control" readonly value="${user.id}">
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email address</label>
                        <input name="email" type="email" class="form-control" aria-describedby="emailHelp" readonly value="${user.email}">
                    </div>
                    <div class="mb-3">
                        <label for="name" class="form-label">Nickname</label>
                        <input name="name" type="text" class="form-control" aria-describedby="nickname" readonly value="${user.name}">
                    </div>
                    <div class="mb-3">
                        <label for="status" class="form-label">Role</label>
                        <input name="status" type="text" class="form-control showhide" readonly value="${user.role}">
                        <div class="hide" style="padding-left: 10px; padding-top: 4px;">Status: ${user.status}</div>
                    </div>
                    <div class="buttons-group">
                        <a class="a-button" href="/account/logout">Выйти из аккаунта</a>
                        <a href="/account/edit" class="btn btn-primary">Изменить аккаунт</a>
                    </div>
                </form>
            </div>
        </div>`;

    let html = `<div style="display: flex; flex-direction: row !important">${userHtml}${patientHtml}${doctorHtml}</div>`;

    res.send(renderForm("Аккаунт", html, req, prevHtml));
});

router.get('/edit', async (req, res) => {
    let user = null;

    try {
        user = await User.getByToken(req.cookies.token); 
    } catch (err) { return res.send(err); }

    let isAdmin = user.status == 1000;

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
                        <input name="status" type="text" class="form-control showhide" readonly value="${user.status}">
                    </div>
                    <div class="buttons-group">
                        <a href="/account" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Отправить</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Изменить аккаунт", html, req));
});

router.get('/logout', async (req, res) => {
    let user = null;

    try {
        user = await User.getByToken(req.cookies.token); 
    } catch (err) { return res.send(err); }

    let isAdmin = user.status == 1000;

    let html = `
        <div class="account-form">
            <div class="edit-account-form-body">
                <form method="post">
                    <div class="buttons-group">
                        <a href="/account" class="btn gray" style="margin-right: 5px">Назад</a>
                        <button type="submit" class="btn btn-primary">Да, я действительно хочу выйти.</button>
                    </div>
                </form>
            </div>
        </div> `;

    res.send(renderForm("Вы действительно хотите выйти?", html, req));
});



module.exports = router;