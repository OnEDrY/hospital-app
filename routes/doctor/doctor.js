const router = require('express').Router();

const { renderFull, renderPage } = require("../../helpers/page.renderer");

const User = require("../../models/user.model");
const Doctor = require("../../models/doctor.model");
const Patient = require('../../models/patient.model.js');

const moment = require('moment');
moment.locale("ru");

//

router.get('/', async (req, res) => {
    if (req.cookies.token)
    {
        try {
            let sessionUser = await User.getByToken(req.cookies.token);
            let doctor = await Doctor.getById(sessionUser.id);

            if (doctor != undefined)
            {
                let bodyHtml = `
                    <div class="admin-topic">Добро пожаловать, ${doctor.fullname}</div>
                    <div style="margin-left: 15%">
                        <br><br>
                        <a href="/doctor/patients/add" class="admin-panel-button" style="background-color: gray">Добавить пациента</a>
                        <br><br><br>
                        <a href="/doctor/patients" class="admin-panel-button" style="background-color: lightgreen">Мои пациенты</a>
                        <a href="/doctor/patients/tests" class="admin-panel-button" style="background-color: lightpink">Результаты анализов</a>
                    </div>`;

                return res.send(renderPage(bodyHtml, req));
            }
        }
        catch (err) {
            console.log(err);
            return res.status(400).send(err);
        }
    }

    let html = `<a href="/" style="font-size: 100px; text-decoration: none; color: black;">Вы не являетесь врачом</a>`;

    res.send(renderFull(html, req));
});

module.exports = router;