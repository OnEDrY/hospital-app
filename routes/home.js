const router = require('express').Router();

const { renderFull, renderPage } = require("../helpers/page.renderer.js");

const User = require("../models/user.model");
const Doctor = require("../models/doctor.model");
const Patient = require('../models/patient.model.js');

const moment = require('moment');
moment.locale("ru");

//

function randomInteger(min, max) {
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}

router.get('/', async (req, res) => {
    if (req.cookies.token)
    {
        try {
            let sessionUser = await User.getByToken(req.cookies.token);
            let doctor = await Doctor.getById(sessionUser.id);
            let patient = await Patient.getByUserId(sessionUser.id);

            if (doctor)
                return res.redirect("/doctor");

            if (patient)
                return res.redirect("/patient");

                let html = `<div style="display: flex; flex-direction: column; align-items: center; font-size: 1em;">
                                <div>За вашей учетной записью не закреплены данные о пациенте.</div>
                                <div>Обратитесь к лечащему врачу.</div>
                            </div>`;

                res.send(renderFull(html, req)); 
        }
        catch (err) {
            console.log(err);
            return res.status(400).send(err);
        }
    }
    else
    {
        let html = `<a href="/" style="font-size:40px; text-decoration: none; color: black;">Пожалуйста авторизируйтесь</a>`;
        res.send(renderFull(html, req));
    }
});

module.exports = router;