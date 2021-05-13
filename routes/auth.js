const router = require('express').Router();
const bcrypt = require('bcrypt');

const User = require("../models/user.model.js");
const Auth = require("../models/auth.model.js");
const config = require("../config/config");

const { renderForm, renderMessage, renderError } = require("../helpers/page.renderer.js");
const { unauthorizedOnly, loggedIn } = require("../helpers/auth.middleware.js");
const { log } = require("../helpers/todb.logger.js");

// Регистрация подьзователей
router.post('/register', unauthorizedOnly, async (req, res) => {
    if (req.body == undefined || req.body.password == undefined)
        return res.status(500).send(renderError('Ошибка', 'Bad request', req));

    // Создание объекта пользователя
    const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        status: 1
    });

    // Сохранение пользователя в базу данных
    try {
        const id = await User.create(user);
        user.id = id;
        delete user.password;

        log(user.id, `User registered (id ${user.id})`);
        res.send(renderMessage("Информация", "Пользователь успешно зарегестрирован!", req));
    } catch (err) {
        console.log(err);
        res.status(500).send(renderError("Ошибка", err, req));
    }    
});

// Авторизация пользователей
router.post("/login", unauthorizedOnly, async (req, res) => {
    try {
        // Запрос пользователя из БД
        const user = await User.getByEmailOrName(req.body.email);
        
        if (user) {
            // Если пользователь найден

            // Проверка пароля
            const validPass = await bcrypt.compare(req.body.password, user.password);
            if (!validPass) return res.status(400).send(renderError("Ошибка", "Указан неверный пароль", req));

            let session = await Auth.createSession(user);

            res.cookie("token", session);
            req.cookies.token = session;

            if (user.status > 10) {
                req.cookies.admin = true;
                res.cookie("admin", "true");
            }

            log(user.id, `User logged in (id ${user.id})`);
            res.cookie("nickname", user.name);
            res.send(renderMessage("Информация", "Успешно авторизован!", req));
        } else {
            res.status(500).send(renderError("Ошибка", "Пользователь с указаным email не найден", req));
        }
    }
    catch (err) {
        res.status(500).send(err);
    }
});

// Страница регистрации
router.get('/register', unauthorizedOnly, async (req, res) => {
    let html = `
        <div class="account-form">
            <form method="post">
                <div class="mb-3">
                    <label for="exampleInputEmail1" class="form-label">Email address</label>
                    <input name="email" type="email" class="form-control" aria-describedby="emailHelp">
                    <div id="emailHelp" class="form-text">We'll never share your email with anyone else.</div>
                </div>
                <div class="mb-3">
                    <label for="exampleInputEmail1" class="form-label">Nickname</label>
                    <input name="name" type="text" class="form-control" aria-describedby="nickname">
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input name="password" type="password" class="form-control">
                </div>
                <div class="buttons-group">
                    <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
                </div>
            </form>
        </div>`;

    res.send(renderForm("Регистрация", html, req));
});

// Страница авторизации
router.get('/login', unauthorizedOnly, async (req, res) => {
    let html = `
        <div class="account-form">
            <form method="post">
                <div class="mb-3">
                    <label for="exampleInputEmail1" class="form-label">Email address or Name</label>
                    <input name="email" type="text" class="form-control" aria-describedby="text">
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input name="password" type="password" class="form-control">
                </div>
                <div class="buttons-group">
                    <button type="submit" class="btn btn-primary">Авторизироваться</button>
                </div>
            </form>
        </div>`;

    res.send(renderForm("Авторизация", html, req));
});

module.exports = router;