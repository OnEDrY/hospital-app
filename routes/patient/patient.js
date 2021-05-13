const router = require('express').Router();

const { renderFull, renderPage } = require("../../helpers/page.renderer.js");

const User = require("../../models/user.model");
const Doctor = require("../../models/doctor.model");
const Patient = require('../../models/patient.model.js');

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

router.get('/', async (req, res) => {
    if (req.cookies.token)
    {
        try {
            let sessionUser = await User.getByToken(req.cookies.token);
            let patient = await Patient.getByUserId(sessionUser.id);

            if (patient != undefined)
            {
                let doctor = await Doctor.getByDoctorId(patient.doctorid);

                let bodyHtml = `
                    <div class="admin-topic">Добро пожаловать, ${patient.fullname}</div>
                    <div style="margin-left: 15%; font-size: 13pt;">
                        <div style="margin-top: 40px;">Ваш лечащий врач: ${doctor.fullname}</div>
                        <div>Ваш диагноз: ${patient.diagnosis}</div>
                        <div>Дата последнего обращения: ${moment(patient.admission).format("LLLL").split(".")[0]}.</div>
                        <br><br>
                        <a href="/patient/tests" class="admin-panel-button" style="background-color: lightgreen">Мои анализы</a>
                    </div>`;

                return res.send(renderPage(bodyHtml, req));
            }
        }
        catch (err) {
            console.log(err);
            return res.status(400).json(err);
        }
    }

    let html = `<a href="/" style="font-size:100px; text-decoration: none; color: black;">Вы не являетесь пациентом</a>`;

    res.send(renderFull(html, req));
});

router.get('/tests', async (req, res) => {
    let sessionUser = await User.getByToken(req.cookies.token);
    let patient = await Patient.getByUserId(sessionUser.id);

    let tBodyHtml = "";
    let tests = await Doctor.getTestsByPatient(patient.patientid);

    for (const test of tests)
    {
        tBodyHtml += `
            <tr class="showhide">
                <td>${moment(test.datetime).format("LLL")} (${moment(test.datetime).fromNow()})</td>
                <td>${test.testname}</td>
                <td>${test.desk}</td>
            </tr>
            `;
    }

    let bodyHtml = `
        <div class="admin-topic">Ваши анализы</div>
        <table class="users-table sortable">
            <thead>
                <tr>
                    <th class="clickable disable-select">Дата</th>
                    <th class="clickable disable-select">Название анализа</th>
                    <th class="clickable disable-select">Результат анализа</th>
                </tr>
            </thead>
            <tbody>
                ${tBodyHtml}
            </tbody>
        </table>
        <script>${sortFunc}</script>`;

    res.send(renderPage(bodyHtml, req));
});

module.exports = router;