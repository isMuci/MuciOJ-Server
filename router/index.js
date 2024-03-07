const express = require('express');
const router = express.Router();//引用express的路由
const jwt = require('jsonwebtoken');// 导入用于生成JWT字符串的包
const expressJWT = require('express-jwt');// 导入用于将客户端发送过来的JWT字符串，解析还原成JSON对象的包
const secretKey = 'MuciOj';
const moment = require('moment');

const serveErr = {
    success: false,
    msg: '服务器出错'
};

let get_ip = function (req) {
    var ip = req.headers['x-real-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress || '';
    if (ip.split(',').length > 0) {
        ip = ip.split(',')[0];
    }
    return ip;
};

router.get('/login', (req, resp) => {
    console.log('login...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            console.log(err)
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id,password,nick FROM users WHERE user_id = '${data.user_id}' AND defunct = 'N'`, [], (err, result) => {
                if (err) {
                    resp.send(serveErr);
                }
                else {
                    if (result.length == 0)
                        resp.send({ success: false, msg: '用户不存在' })
                    else {
                        if (result[0].password == data.password) {
                            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, privilege) => {
                                if (err) {
                                    resp.send(serveErr);
                                }
                                else {
                                    const tokenStr = jwt.sign({ user_id: data.user_id, muci: data.password, password: Math.random() * 1000 }, secretKey, { expiresIn: '3d' })
                                    resp.send({ success: true, msg: '登录成功', token: tokenStr, user_id: result[0].user_id, nick: result[0].nick, privilege: privilege[0].privilege });
                                }
                            });
                        }
                        else {
                            resp.send({ success: false, msg: '密码错误' })
                        }
                    }
                }
            });
        }
    });
});

router.get('/autoLogin', (req, resp) => {
    console.log('autoLogin...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id,password,nick FROM users WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                if (err) {
                    resp.send(serveErr);
                }
                else {
                    if (result.length == 0)
                        resp.send({ success: false, msg: '用户不存在', delete: true })
                    else {
                        if (result[0].password == data.muci) {
                            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, privilege) => {
                                if (err) {
                                    resp.send(serveErr);
                                }
                                else {
                                    resp.send({ success: true, msg: '自动登录成功', user_id: data.user_id, nick: result[0].nick, privilege: privilege[0].privilege });
                                }
                            });
                        }
                        else {
                            resp.send({ success: false, msg: '密码已过期', delete: true })
                        }
                    }
                }
            });
        }
    });
});

router.get('/register', (req, resp) => {
    console.log('register...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`INSERT INTO users ( user_id, password, nick, signature, email, school ) VALUES ( '${data.user_id}', '${data.password}', '${data.nick}', '${data.signature}', '${data.email}', '${data.school}' )`, [], (err, result) => {
                if (err) {
                    console.log(err)
                    if (err.sqlState == '23000') {
                        return resp.send({ success: false, msg: '用户名已存在' })
                    }
                    resp.send(serveErr);
                }
                else {
                    const tokenStr = jwt.sign({ user_id: data.user_id, muci: data.password, password: Math.random() * 1000 }, secretKey, { expiresIn: '3d' })
                    resp.send({ success: true, msg: '注册成功', token: tokenStr });
                }
            });
        }
    });
});

router.get('/getInfo', (req, resp) => {
    console.log('getInfo...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id,nick,signature,email,school FROM users WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                if (err) {
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取用户信息成功', userInfo: result[0] });
                }
            });
        }
    });
});

router.post('/setInfo', (req, resp) => {
    console.log('setInfo...')
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id,password,nick FROM users WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                if (err) {
                    return resp.send(serveErr);
                }
                else {
                    if (result[0].password == data.password) {
                        let tokenStr = '';
                        let msg = '修改用户信息成功';
                        if (data.newPassword != '') {
                            data.password = data.newPassword;
                            tokenStr = jwt.sign({ user_id: data.user_id, muci: data.password, password: Math.random() * 1000 }, secretKey, { expiresIn: '3d' });
                            msg += ',请重新登录';
                        }
                        conn.query(`UPDATE users SET nick='${data.nick}', signature='${data.signature}', email='${data.email}', school='${data.school}', password='${data.password}' WHERE user_id='${data.user_id}'`, [], (err, result) => {
                            if (err) {
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: msg, token: tokenStr });
                            }
                        });
                    }
                    else {
                        return resp.send({ success: false, msg: '密码错误' })
                    }
                }
            });
        }
    });
});

router.get('/getSolutionInDate', (req, resp) => {
    console.log('getSolutionInDateing...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT DISTINCT problem_id FROM solution WHERE user_id = '${data.user_id}' AND in_date_col = '${data.date}' AND result = '4'`, [], (err, result) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    console.log(result);
                    resp.send({ success: true, problemId: result });
                }
            });
        }
    });
});

router.get('/getUserInfo', (req, resp) => {
    console.log('getUserInfo...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id,nick,signature,email,school,submit,solved FROM users WHERE user_id = '${data.user_id}'`, [], (err, result1) => {
                if (err) {
                    resp.send(serveErr);
                }
                else {
                    conn.query(`SELECT COUNT(*) FROM users WHERE solved > ${result1[0].solved}`, [], (err, result) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            console.log(result)
                            resp.send({ success: true, msg: '获取用户信息成功', userInfo: result1[0], rank: result[0]['COUNT(*)'] + 1 });
                        }
                    });
                }
            });
        }
    });
});

router.get('/getProblemSet', (req, resp) => {
    console.log('getProblemSet...')
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT * FROM (SELECT problem_id, title, accepted, submit, defunct  FROM problem order by problem_id) problemset WHERE defunct = 'N'`, [], (err, problemset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取题目列表成功', problemset: problemset });
                }
            });
        }
    });
});

router.get('/getProblemSetUserInfo', (req, resp) => {
    console.log('getProblemSetUserInfo...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT problem_id FROM solution WHERE user_id = '${data.user_id}' GROUP BY problem_id`, [], (err, submit) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    conn.query(`SELECT problem_id FROM solution WHERE user_id = '${data.user_id}' AND result=4 GROUP BY problem_id`, [], (err, ac) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            resp.send({ success: true, msg: '获取用户题目列表信息成功', submit: submit, ac: ac });
                        }
                    });
                }
            });
        }
    });
});

router.get('/searchProblemSetByTitle', (req, resp) => {
    console.log('searchProblemSetByTitle...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT * FROM (SELECT problem_id, title, accepted, submit, defunct  FROM problem order by problem_id) problemset WHERE defunct = 'N' AND title REGEXP '${data.title}'`, [], (err, problemset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取题目列表成功', problemset: problemset });
                }
            });
        }
    });
});

router.get('/searchProblemSetByID', (req, resp) => {
    console.log('searchProblemSetByID...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT * FROM (SELECT problem_id, title, accepted, submit, defunct  FROM problem order by problem_id) problemset WHERE defunct = 'N' AND  problem_id ='${data.ID}'`, [], (err, problemset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取题目列表成功', problemset: problemset });
                }
            });
        }
    });
});

router.get('/getProblem', (req, resp) => {
    console.log('getProblem...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            if (data.contest_id != 'undefined' && data.contest_id != 'null'&&data.contest_id != undefined&&data.contest_id != null) {
                conn.query(`SELECT private,password,start_time FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, contest) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        console.log(contest)
                        if (contest[0].private && contest[0].password != data.password) {
                            return resp.send({ success: false, msg: '比赛密码错误' });
                        }
                        if (new Date(contest[0].start_time).getTime() - new Date().getTime() > 0) {
                            return resp.send({ success: false, msg: '比赛尚未开始' });
                        }
                        conn.query(`SELECT * FROM (SELECT *  FROM problem order by problem_id) problemset WHERE defunct = 'N' AND  problem_id = '${data.problem_id}'`, [], (err, problem) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '获取题目成功', problem: problem[0] });
                            }
                        });
                    }
                });
            }
            else {
                conn.query(`SELECT * FROM (SELECT *  FROM problem order by problem_id) problemset WHERE defunct = 'N' AND  problem_id = '${data.problem_id}'`, [], (err, problem) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        resp.send({ success: true, msg: '获取题目成功', problem: problem[0] });
                    }
                });
            }
        }
    });
});

router.post('/submit', (req, resp) => {
    console.log('submit...')
    let data = req.body;
    console.log(data);
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')
    let nowCol = moment(Date.now()).format('YYYY-MM-DD')
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            if (data.contest_id != 'undefined' && data.contest_id != 'null' && data.contest_id != undefined) {
                conn.query(`SELECT private,password,start_time FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, contest) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        console.log(contest)
                        if (contest[0].private && contest[0].password != data.password) {
                            return resp.send({ success: false, msg: '比赛密码错误' });
                        }
                        if (new Date(contest[0].start_time).getTime() - new Date().getTime() > 0) {
                            return resp.send({ success: false, msg: '比赛尚未开始' });
                        }
                        conn.query(`SELECT num FROM contest_problem WHERE problem_id ='${data.problem_id}' AND  contest_id ='${data.contest_id}'`, [], (err, num) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`INSERT INTO solution ( problem_id, contest_id, num, user_id, nick, in_date, in_date_col, language, ip, code_length, result ) VALUES ( '${data.problem_id}', '${data.contest_id}', '${num[0].num}', '${data.user_id}', '${data.nick}', '${now}', '${nowCol}', '${data.language}', '${get_ip(req)}', '${data.code_length}', 14 )`, [], (err, insert) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        conn.query(`INSERT INTO source_code ( solution_id, source ) VALUES ( '${insert.insertId}', '${data.source}' )`, [], (err) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {
                                                conn.query(`UPDATE problem SET submit=submit+1 WHERE problem_id = '${data.problem_id}'`, [], (err) => {
                                                    if (err) {
                                                        console.log(err)
                                                        resp.send(serveErr);
                                                    }
                                                    else {
                                                        conn.query(`UPDATE solution SET result=0 WHERE solution_id = '${insert.insertId}'`, [], (err) => {
                                                            if (err) {
                                                                console.log(err)
                                                                resp.send(serveErr);
                                                            }
                                                            else {
                                                                resp.send({ success: true, msg: '代码提交成功' });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
        
                                    }
                                });
                            }
                        });
                    }
                });
            }
            else {
                conn.query(`INSERT INTO solution ( problem_id, user_id, nick, in_date, in_date_col, language, ip, code_length, result ) VALUES ( '${data.problem_id}', '${data.user_id}', '${data.nick}', '${now}', '${nowCol}', '${data.language}', '${get_ip(req)}', '${data.code_length}', 14 )`, [], (err, insert) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        conn.query(`INSERT INTO source_code ( solution_id, source ) VALUES ( '${insert.insertId}', '${data.source}' )`, [], (err) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`UPDATE problem SET submit=submit+1 WHERE problem_id = '${data.problem_id}'`, [], (err) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        conn.query(`UPDATE solution SET result=0 WHERE solution_id = '${insert.insertId}'`, [], (err) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {
                                                resp.send({ success: true, msg: '代码提交成功' });
                                            }
                                        });
                                    }
                                });
                            }
                        });

                    }
                });
            }
        }
    });
});

router.get('/getStatus', (req, resp) => {
    console.log('getStatus...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            console.log(err)
            resp.send(serveErr);
        }
        else {
            if (data.contest_id != 'undefined' && data.contest_id != 'null') {
                conn.query(`SELECT private,password,start_time FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, contest) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        console.log(contest)
                        if (contest[0].private && contest[0].password != data.password) {
                            return resp.send({ success: false, msg: '比赛密码错误' });
                        }
                        if (new Date(contest[0].start_time).getTime() - new Date().getTime() > 0) {
                            return resp.send({ success: false, msg: '比赛尚未开始' });
                        }
                        let flag = false;
                        let sql = "SELECT solution_id, problem_id, contest_id, user_id, nick, time, memory, in_date, result, language, code_length FROM solution";
                        if (data.user_id != '' && data.user_id != 'undefined' && data.user_id != 'null') {
                            if (flag) {
                                sql += " AND ";
                            }
                            else {
                                sql += " WHERE ";
                            }
                            sql += ` user_id = '${data.user_id}'`;
                            flag = true;
                        }
                        if (data.problem_id != -1 && data.problem_id != 'undefined' && data.problem_id != 'null') {
                            if (flag) {
                                sql += " AND ";
                            }
                            else {
                                sql += " WHERE ";
                            }
                            sql += ` problem_id = '${data.problem_id}'`;
                            flag = true;
                        }
                        if (data.contest_id != -1 && data.contest_id != 'undefined' && data.contest_id != 'null') {
                            if (flag) {
                                sql += " AND ";
                            }
                            else {
                                sql += " WHERE ";
                            }
                            sql += ` contest_id = '${data.contest_id}'`;
                            flag = true;
                        }
                        if (data.language != -1 && data.language != 'undefined' && data.language != 'null') {
                            if (flag) {
                                sql += " AND ";
                            }
                            else {
                                sql += " WHERE ";
                            }
                            sql += ` language = '${data.language}'`;
                            flag = true;
                        }
                        if (data.result != -1 && data.result != 'undefined' && data.result != 'null') {
                            if (flag) {
                                sql += " AND ";
                            }
                            else {
                                sql += " WHERE ";
                            }
                            sql += ` result = '${data.result}'`;
                            flag = true;
                        }
                        sql += ` ORDER BY solution_id DESC LIMIT ${data.num} OFFSET ${data.page * data.num}`;
                        conn.query(sql, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                if (data.page != 0 && result.length == 0) {
                                    resp.send({ success: false, msg: '不能再往后了' });
                                    return;
                                }
                                resp.send({ success: true, status: result });
                            }
                        });
                    }
                });
            }
            else {
                let flag = false;
                let sql = "SELECT solution_id, problem_id, user_id, nick, time, memory, in_date, result, language, code_length FROM solution";
                if (data.user_id != '' && data.user_id != 'undefined' && data.user_id != 'null') {
                    if (flag) {
                        sql += " AND ";
                    }
                    else {
                        sql += " WHERE ";
                    }
                    sql += ` user_id = '${data.user_id}'`;
                    flag = true;
                }
                if (data.problem_id != -1 && data.problem_id != 'undefined' && data.problem_id != 'null') {
                    if (flag) {
                        sql += " AND ";
                    }
                    else {
                        sql += " WHERE ";
                    }
                    sql += ` problem_id = '${data.problem_id}'`;
                    flag = true;
                }
                if (data.language != -1 && data.language != 'undefined' && data.language != 'null') {
                    if (flag) {
                        sql += " AND ";
                    }
                    else {
                        sql += " WHERE ";
                    }
                    sql += ` language = '${data.language}'`;
                    flag = true;
                }
                if (data.result != -1 && data.result != 'undefined' && data.result != 'null') {
                    if (flag) {
                        sql += " AND ";
                    }
                    else {
                        sql += " WHERE ";
                    }
                    sql += ` result = '${data.result}'`;
                    flag = true;
                }
                sql += ` ORDER BY solution_id DESC LIMIT ${data.num} OFFSET ${data.page * data.num}`;
                conn.query(sql, [], (err, result) => {
                    if (err) {
                        console.log(err)
                        resp.send(serveErr);
                    }
                    else {
                        if (data.page != 0 && result.length == 0) {
                            resp.send({ success: false, msg: '不能再往后了' });
                            return;
                        }
                        resp.send({ success: true, status: result });
                    }
                });
            }
        }
    });
});

router.get('/getProblemStatus', (req, resp) => {
    console.log('getProblemStatus...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            console.log(err)
            resp.send(serveErr);
        }
        else {
            let sql = `SELECT * FROM (
                SELECT COUNT(*) att, user_id, min(1000000000000000 + time*10000000000 + memory*100000 + code_length) score
                FROM solution
                WHERE problem_id = ${data.problem_id} AND result =4
                GROUP BY user_id
                ORDER BY score 
                )c
                  inner JOIN (
                  SELECT solution_id, user_id, language, 1000000000000000 + time*10000000000 + memory*100000 + code_length score, in_date
                  FROM solution 
                  WHERE problem_id = ${data.problem_id} AND result =4  
                  ORDER BY score
                  )b ON b.user_id=c.user_id AND b.score=c.score ORDER BY c.score, solution_id ASC LIMIT ${data.num} OFFSET ${data.page * data.num};`;

            conn.query(sql, [], (err, list) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (list.length == 0) {
                        resp.send({ success: false, msg: '不能再往后了' });
                        return;
                    }
                    conn.query(`SELECT count(*) AS submit FROM solution WHERE problem_id = ${data.problem_id}`, [], (err, submit) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            conn.query(`SELECT count(DISTINCT user_id) AS users FROM solution WHERE problem_id = ${data.problem_id}`, [], (err, users) => {
                                if (err) {
                                    console.log(err)
                                    resp.send(serveErr);
                                }
                                else {
                                    conn.query(`SELECT count(DISTINCT user_id) AS acusers FROM solution WHERE problem_id = ${data.problem_id} AND result = '4'`, [], (err, acusers) => {
                                        if (err) {
                                            console.log(err)
                                            resp.send(serveErr);
                                        }
                                        else {
                                            conn.query(`SELECT count(*) AS ac FROM solution WHERE problem_id = ${data.problem_id} AND result = '4'`, [], (err, ac) => {
                                                if (err) {
                                                    console.log(err)
                                                    resp.send(serveErr);
                                                }
                                                else {
                                                    conn.query(`SELECT count(*) AS pe FROM solution WHERE problem_id = ${data.problem_id} AND result = '5'`, [], (err, pe) => {
                                                        if (err) {
                                                            console.log(err)
                                                            resp.send(serveErr);
                                                        }
                                                        else {
                                                            conn.query(`SELECT count(*) AS wa FROM solution WHERE problem_id = ${data.problem_id} AND result = '6'`, [], (err, wa) => {
                                                                if (err) {
                                                                    console.log(err)
                                                                    resp.send(serveErr);
                                                                }
                                                                else {
                                                                    conn.query(`SELECT count(*) AS tle FROM solution WHERE problem_id = ${data.problem_id} AND result = '7'`, [], (err, tle) => {
                                                                        if (err) {
                                                                            console.log(err)
                                                                            resp.send(serveErr);
                                                                        }
                                                                        else {
                                                                            conn.query(`SELECT count(*) AS ole FROM solution WHERE problem_id = ${data.problem_id} AND result = '8'`, [], (err, ole) => {
                                                                                if (err) {
                                                                                    console.log(err)
                                                                                    resp.send(serveErr);
                                                                                }
                                                                                else {
                                                                                    conn.query(`SELECT count(*) AS mle FROM solution WHERE problem_id = ${data.problem_id} AND result = '9'`, [], (err, mle) => {
                                                                                        if (err) {
                                                                                            console.log(err)
                                                                                            resp.send(serveErr);
                                                                                        }
                                                                                        else {
                                                                                            conn.query(`SELECT count(*) AS re FROM solution WHERE problem_id = ${data.problem_id} AND result = '10'`, [], (err, re) => {
                                                                                                if (err) {
                                                                                                    console.log(err)
                                                                                                    resp.send(serveErr);
                                                                                                }
                                                                                                else {
                                                                                                    conn.query(`SELECT count(*) AS ce FROM solution WHERE problem_id = ${data.problem_id} AND result = '11'`, [], (err, ce) => {
                                                                                                        if (err) {
                                                                                                            console.log(err)
                                                                                                            resp.send(serveErr);
                                                                                                        }
                                                                                                        else {
                                                                                                            resp.send({ success: true, list: list, submit: submit[0].submit, users: users[0].users, acusers: acusers[0].acusers, status: { ac: ac[0].ac, pe: pe[0].pe, wa: wa[0].wa, tle: tle[0].tle, ole: ole[0].ole, mle: mle[0].mle, re: re[0].re, ce: ce[0].ce } });
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/getRanklist', (req, resp) => {
    console.log('getRanklist...')
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id, nick, solved, submit FROM users ORDER BY solved DESC,submit,reg_time`, [], (err, ranklist) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取排名列表成功', ranklist: ranklist });
                }
            });
        }
    });
});

router.get('/getContestSet', (req, resp) => {
    console.log('getContestSet...')
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT contest_id, title, start_time, end_time, private, user_id FROM contest WHERE defunct = 'N' ORDER BY contest_id DESC`, [], (err, contestset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取竞赛列表成功', contestset: contestset });
                }
            });
        }
    });
});

router.get('/searchContestSetByTitle', (req, resp) => {
    console.log('searchContestSetByTitle...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT contest_id, title, start_time, end_time, private, user_id FROM contest WHERE defunct = 'N' AND title REGEXP '${data.title}' ORDER BY contest_id DESC`, [], (err, contestset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    console.log(contestset)
                    resp.send({ success: true, msg: '标题搜索竞赛列表成功', contestset: contestset });
                }
            });
        }
    });
});

router.get('/searchContestSetByID', (req, resp) => {
    console.log('searchContestSetByID...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT contest_id, title, start_time, end_time, private, user_id FROM contest WHERE defunct = 'N' AND  contest_id ='${data.ID}' ORDER BY contest_id DESC`, [], (err, contestset) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: 'ID搜索竞赛列表成功', contestset: contestset });
                }
            });
        }
    });
});

router.get('/getContestInfo', (req, resp) => {
    console.log('getContestInfo...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT contest_id, title, description, start_time, end_time, private, user_id FROM contest WHERE defunct = 'N' AND  contest_id ='${data.contest_id}'`, [], (err, contest) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    resp.send({ success: true, msg: '获取竞赛列表成功', contest: contest[0] });
                }
            });
        }
    });
});

router.get('/getContestProblemSet', (req, resp) => {
    console.log('getContestProblemSet...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT private,password,start_time FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, contest) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    console.log(contest)
                    if (contest[0].private && contest[0].password != data.password) {
                        return resp.send({ success: false, msg: '比赛密码错误' });
                    }
                    if (new Date(contest[0].start_time).getTime() - new Date().getTime() > 0) {
                        return resp.send({ success: false, msg: '比赛尚未开始' });
                    }
                    conn.query(`SELECT problem_id, title, num, c_accepted, c_submit FROM contest_problem WHERE contest_id = '${data.contest_id}' ORDER BY num`, [], (err, problemset) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            console.log(problemset)
                            if (data.user_id != '' && data.user_id != 'undefined' && data.user_id != 'null') {
                                conn.query(`SELECT problem_id FROM solution WHERE user_id = '${data.user_id}' AND contest_id = '${data.contest_id}' GROUP BY problem_id`, [], (err, submit) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        console.log(submit)
                                        conn.query(`SELECT problem_id FROM solution WHERE user_id = '${data.user_id}' AND result=4 AND contest_id = '${data.contest_id}' GROUP BY problem_id`, [], (err, ac) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {
                                                console.log(ac)
                                                resp.send({ success: true, msg: '获取用户题目列表信息成功', problemset: problemset, submit: submit, ac: ac });
                                            }
                                        });
                                    }
                                });
                            }
                            else resp.send({ success: true, msg: '获取题目列表成功', problemset: problemset });
                        }
                    });
                }
            });
        }
    });
});

router.get('/getHomeInfo', (req, resp) => {
    console.log('getHomeInfo...')
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT user_id, nick, signature FROM users ORDER BY solved DESC,submit,reg_time LIMIT 10`, [], (err, ranklist) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    conn.query(`SELECT problem_id, title, in_date  FROM problem WHERE defunct = 'N' ORDER BY problem_id DESC LIMIT 10`, [], (err, problemset) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            conn.query(`SELECT contest_id, title, start_time FROM contest WHERE defunct = 'N' ORDER BY contest_id DESC LIMIT 10`, [], (err, contestset) => {
                                if (err) {
                                    console.log(err)
                                    resp.send(serveErr);
                                }
                                else {
                                    resp.send({ success: true, msg: '获取首页信息成功', ranklist: ranklist, problemset: problemset, contestset: contestset });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/getUserlist', (req, resp) => {
    console.log('ggetUserlist...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT * FROM (SELECT user_id, nick, email, school, accesstime, reg_time, defunct FROM users) a INNER JOIN privilege b ON a.user_id = b.user_id  ORDER BY reg_time DESC,accesstime`, [], (err, userlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                console.log(userlist)
                                resp.send({ success: true, msg: '获取用户列表成功', userlist: userlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/setUserInfo', (req, resp) => {
    console.log('setUserInfo...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`UPDATE ${data.list} SET ${data.seting} = '${data.info}' WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '用户信息修改成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/deleteUser', (req, resp) => {
    console.log('deleteUser...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`DELETE FROM users WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`DELETE FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        conn.query(`DELETE FROM solution WHERE user_id = '${data.user_id}'`, [], (err, result) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {
                                                resp.send({ success: true, msg: '用户删除成功' });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/addUser', (req, resp) => {
    console.log('addUser...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`INSERT INTO users ( user_id, password ) VALUES ( '${data.user_id}', '${data.password}' )`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                if (err.sqlState == '23000') {
                                    return resp.send({ success: false, msg: '用户名已存在' })
                                }
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`INSERT INTO privilege ( user_id, privilege ) VALUES ( '${data.user_id}', 'normal' )`, [], (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        if (err.sqlState == '23000') {
                                            return resp.send({ success: false, msg: '用户名已存在' })
                                        }
                                        resp.send(serveErr);
                                    }
                                    else {
                                        resp.send({ success: true, msg: '添加用户成功' });
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/searchUsers', (req, resp) => {
    console.log('searchUsers...')
    let priv = req.user;
    console.log(priv);
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT * FROM (SELECT user_id, nick, email, school, accesstime, reg_time, defunct FROM users WHERE user_id REGEXP '${data.search}' OR nick REGEXP '${data.search}' OR email REGEXP '${data.search}' OR school REGEXP '${data.search}' ) a INNER JOIN privilege b ON a.user_id = b.user_id  ORDER BY reg_time DESC,accesstime`, [], (err, userlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                console.log(userlist)
                                resp.send({ success: true, msg: '获取用户列表成功', userlist: userlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/getProblemlist', (req, resp) => {
    console.log('getProblemlist...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT problem_id, title, accepted, in_date, defunct FROM problem ORDER BY problem_id`, [], (err, poblemlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                // console.log(poblemlist)
                                resp.send({ success: true, msg: '获取题目列表成功', poblemlist: poblemlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/setProblemInfo', (req, resp) => {
    console.log('setProblemInfo...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`UPDATE ${data.list} SET ${data.seting} = '${data.info}' WHERE problem_id = '${data.problem_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '题目信息修改成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/deleteProblem', (req, resp) => {
    console.log('deleteProblem...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`DELETE FROM problem WHERE problem_id = '${data.problem_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '题目删除成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/searchProblems', (req, resp) => {
    console.log('searchProblems...')
    let priv = req.user;
    console.log(priv);
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT problem_id, title, accepted, in_date, defunct FROM problem WHERE problem_id REGEXP '${data.search}' OR title REGEXP '${data.search}' ORDER BY problem_id`, [], (err, problemlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                console.log(problemlist)
                                resp.send({ success: true, msg: '获取题目列表成功', problemlist: problemlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/addProblem', (req, resp) => {
    console.log('addProblem...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`INSERT INTO problem ( title, description, input, output, sample_input, sample_output, spj, hint, time_limit, memory_limit ) VALUES 
                        ( '${data.title}', '${data.description}', '${data.input}', '${data.output}', '${data.sample_input}', '${data.sample_output}', '${data.spj}', '${data.hint}', '${data.time_limit}', '${data.memory_limit}' )`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '添加题目成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/modifyProblem', (req, resp) => {
    console.log('modifyProblem...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`UPDATE problem SET title='${data.title}', description='${data.description}', input='${data.input}', output='${data.output}', sample_input='${data.sample_input}', sample_output='${data.sample_output}', spj='${data.spj}', hint='${data.hint}', time_limit='${data.time_limit}', memory_limit='${data.memory_limit}' WHERE problem_id='${data.problem_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '修改题目成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/getContestlist', (req, resp) => {
    console.log('getContestlist...')
    let data = req.user;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${data.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT contest_id, title, start_time, end_time, private, defunct FROM contest ORDER BY contest_id DESC`, [], (err, contestlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                // console.log(contestlist)
                                resp.send({ success: true, msg: '获取比赛列表成功', contestlist: contestlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/setContestInfo', (req, resp) => {
    console.log('setContestInfo...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`UPDATE ${data.list} SET ${data.seting} = '${data.info}' WHERE contest_id = '${data.contest_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '题目信息修改成功' });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/deleteContest', (req, resp) => {
    console.log('deleteContest...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`DELETE FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`DELETE FROM contest_problem WHERE contest_id = '${data.contest_id}'`, [], (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        resp.send({ success: true, msg: '比赛删除成功' });
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/searchContests', (req, resp) => {
    console.log('searchContests...')
    let priv = req.user;
    console.log(priv);
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT contest_id, title, start_time, end_time, private, defunct FROM contest WHERE contest_id REGEXP '${data.search}' OR title REGEXP '${data.search}' ORDER BY contest_id DESC`, [], (err, contestlist) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                console.log(contestlist)
                                resp.send({ success: true, msg: '获取题目列表成功', contestlist: contestlist });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/getContestAdd', (req, resp) => {
    console.log('getContestAdd...')
    let priv = req.user;
    console.log(priv);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT problem_id, title FROM problem ORDER BY problem_id`, [], (err, uncheck) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                resp.send({ success: true, msg: '获取题目列表成功', uncheck: uncheck });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/addContest', (req, resp) => {
    console.log('modifyContest...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`INSERT INTO contest ( title, description, start_time, end_time, private, defunct, password ) VALUES ('${data.contest.title}', '${data.contest.description}', '${moment(data.contest.start_time).format('YYYY-MM-DD HH:mm:ss')}', '${moment(data.contest.end_time).format('YYYY-MM-DD HH:mm:ss')}', '${data.contest.private}', 'N', '${data.contest.password}' )`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                console.log(result.insertId)
                                let sql=`INSERT INTO contest_problem ( problem_id, contest_id, title, num ) VALUES `;
                                for(let i=0;i<data.problemlist.length;i++){
                                    sql+=`('${data.problemlist[i].problem_id}', '${result.insertId}', '${data.problemlist[i].title}', '${i}')`
                                    sql+=i==data.problemlist.length-1?';':', ';
                                }
                                console.log(sql)
                                conn.query(sql, [], (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        resp.send({ success: true, msg: '添加比赛信息成功' });
                                        
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/getContestEdit', (req, resp) => {
    console.log('getContestEdit...')
    let priv = req.user;
    console.log(priv);
    let data = req.query;
    console.log(data)
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`SELECT contest_id, title, start_time, end_time, description, private, password FROM contest WHERE contest_id = '${data.contest_id}'`, [], (err, contest) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`SELECT problem_id, title FROM contest_problem WHERE contest_id = '${data.contest_id}' ORDER BY problem_id`, [], (err, checked) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        conn.query(`SELECT problem_id, title FROM problem WHERE problem_id NOT IN (SELECT problem_id FROM contest_problem WHERE contest_id = '${data.contest_id}') ORDER BY problem_id`, [], (err, uncheck) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {

                                                resp.send({ success: true, msg: '获取比赛成功', contest: contest[0], checked: checked, uncheck: uncheck });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.post('/modifyContest', (req, resp) => {
    console.log('modifyContest...')
    let priv = req.user;
    console.log(priv);
    let data = req.body;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT privilege FROM privilege WHERE user_id = '${priv.user_id}'`, [], (err, privilege) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    if (privilege[0].privilege == 'admin') {
                        conn.query(`UPDATE contest SET title='${data.contest.title}', description='${data.contest.description}', start_time='${moment(data.contest.start_time).format('YYYY-MM-DD HH:mm:ss')}', end_time='${moment(data.contest.end_time).format('YYYY-MM-DD HH:mm:ss')}', private='${data.contest.private}', defunct='N', password='${data.contest.password}' WHERE contest_id='${data.contest.contest_id}'`, [], (err, result) => {
                            if (err) {
                                console.log(err)
                                resp.send(serveErr);
                            }
                            else {
                                conn.query(`DELETE FROM contest_problem WHERE contest_id = '${data.contest.contest_id}'`, [], (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        resp.send(serveErr);
                                    }
                                    else {
                                        let sql=`INSERT INTO contest_problem ( problem_id, contest_id, title, num ) VALUES `;
                                        for(let i=0;i<data.problemlist.length;i++){
                                            sql+=`('${data.problemlist[i].problem_id}', '${data.contest.contest_id}', '${data.problemlist[i].title}', '${i}')`
                                            sql+=i==data.problemlist.length-1?';':', ';
                                        }
                                        console.log(sql)
                                        conn.query(sql, [], (err, result) => {
                                            if (err) {
                                                console.log(err)
                                                resp.send(serveErr);
                                            }
                                            else {
                                                resp.send({ success: true, msg: '修改比赛信息成功' });
                                                
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else resp.send({ success: false, msg: '未授权的访问' });
                }
            });
        }
    });
});

router.get('/getContestRank', (req, resp) => {
    console.log('getContestRank...')
    let data = req.query;
    console.log(data);
    req.getConnection((err, conn) => {
        if (err) {
            resp.send(serveErr);
        }
        else {
            conn.query(`SELECT start_time, end_time ,num FROM contest WHERE contest_id ='${data.contest_id}'`, [], (err, contest) => {
                if (err) {
                    console.log(err)
                    resp.send(serveErr);
                }
                else {
                    conn.query(`SELECT user_id, nick, result, num, in_date FROM solution WHERE contest_id ='${data.contest_id}' AND ( in_date BETWEEN '${contest[0].start_time}' AND '${contest[0].end_time}' ) AND ( result BETWEEN 4 AND 10 ) ORDER BY in_date`, [], (err, submits) => {
                        if (err) {
                            console.log(err)
                            resp.send(serveErr);
                        }
                        else {
                            resp.send({ success: true, msg: '获取竞赛提交列表成功', submits: submits ,contest:contest[0]});
                        }
                    });
                }
            });
        }
    });
});

module.exports = router;//模块导出