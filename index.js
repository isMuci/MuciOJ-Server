const express = require('express');
const route = require('./router/index');
const mysql = require('mysql');
const myConnection = require('express-myconnection');
const expressJWT = require('express-jwt');// 导入用于将客户端发送过来的JWT字符串，解析还原成JSON对象的包
const myDatabase = {
    host: 'localhost', //数据库地址
    user: 'root',//用户名
    password: '',//密码
    port: '3306',//端口号
    database: 'mucioj',//数据库名称
    timezone: "SYSTEM"
}
const app = express();
//跨域
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length,Authorization,Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    if (req.method == "OPTIONS") res.send(200);
    else next();
});

app.use(expressJWT({
    secret: 'MuciOj',
    credentialsRequired: true,
    algorithms: ['HS256']
}).unless({
    path: ['/login', '/register', '/getUserInfo',
        '/getProblemSet', '/searchProblemSetByTitle', '/searchProblemSetByID',
        '/getProblem', '/getStatus', '/getProblemStatus',
        '/getRanklist', '/getContestSet', '/searchContestSetByTitle',
        '/searchContestSetByID', '/getContestInfo', '/getContestProblemSet',
        '/getHomeInfo','/getContestRank']
}));

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(myConnection(mysql, myDatabase, 'pool'));
app.use('/', route);

app.use((err, req, res, next) => {
    // token解析失败导致的错误
    if (err.name === 'UnauthorizedError') {
        console.log(err)
        return res.send({ success: false, msg: '身份信息失效', delete: true })
    }
    // 其它原因导致的错误
    res.send({ success: false, msg: '位置错误' })
})

app.listen(14516, () => {
    console.log("服务器启动！")
});