const sql = require("../models/db.js");

function renderRoot(html, req) {
    let accountHtml = `
        <div class="auth">
            <div class="auth-item clickable" onclick="window.location='/login'">Авторизация</div>
            <div class="auth-item clickable" onclick="window.location='/register'">Регистрация</div>
        </div>`;

    if (req && req.cookies.token != null) {
        accountHtml = `
            <div class="auth">
                <div class="auth-item clickable" onclick="window.location='/account'">${req.cookies.nickname}</div>
            </div>`;
    }

    if (req && req.cookies.token != null && req.cookies.admin != null) {
        accountHtml = `
            <div class="auth">
                <div class="auth-item clickable" onclick="window.location='/admin'">Админ панель</div>
                <div class="auth-item clickable" onclick="window.location='/account'">${req.cookies.nickname}</div>
            </div>`;
    }

    return `
        <!DOCTYPE html>
            <html lang="ru" dir="ltr">
            <head>
                <meta charset="utf-8">
                <link rel="stylesheet" href="/css/bootstrap.min.css">
                <link rel="stylesheet" href="/css/master.css">
                <script type="text/javascript" src="/js/jquery-3.6.0.min.js"></script>
                <link rel="icon" href="favicon.ico">
                <title>Hospital Web</title>
            </head>
            <body class="content-align-center disable-selection">
                <div class="wrapper">
                <header>
                    <div class="header-content">
                        <div class="logo clickable" onclick="window.location='/'">Hospital Web</div>
                        <div class="menu">
                            <div class="menu-item clickable" onclick="window.location='/'">Главная</div>
                            <div class="menu-item clickable">О нас</div>
                        </div>
                        ${accountHtml}
                    </div>
                </header>
            
                <div class="body-wrapper">
                    ${html}
                </div>

                <script></script>
            </body>
        </html>`;
}

function renderFull(html, req) {
    return renderRoot(`<div class="full">${html}</div>`, req);
}

exports.renderPage = function (html, req) {
    return renderRoot(html, req);
}

exports.renderMessage = function (topic, body, req) {
    var body = `
        <div class="message">
            <div class="message-topic">${topic}</div>
            <div class="message-body">${body}</div>
        </div>`;

    return renderFull(body, req);
}

exports.renderError = function (topic, body, req) {
    var body = `
        <div class="error">
            <div class="error-topic">${topic}</div>
            <div class="error-body">${body}</div>
        </div>`;

    return renderFull(body, req);
}

exports.renderForm = function (topic, formHtml, req, prevFormHtml = "") {
    var body = `
        <div class="main-form-wrapper">
            ${prevFormHtml}
            <div class="main-form-topic">${topic}</div>
            <div class="main-form">
                ${formHtml}
            </div>
        </div>`;

    return renderRoot(body, req);
}

module.exports.renderFull = renderFull;
module.exports.renderRoot = renderRoot;