// simple sqlite interface with sqlite
const guid = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Table: people
// id | uid | interests

// interface interest:{
//  interestName: string,
//  impact: int,
//}

// create table if not exists
db.run(`
CREATE TABLE IF NOT EXISTS people (
    uid TEXT PRIMARY KEY
);
`);
db.run(`
CREATE TABLE IF NOT EXISTS interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interestName TEXT,
    impact INTEGER,
    uid TEXT,
    CONSTRAINT fk_uid
        FOREIGN KEY (uid)
        REFERENCES people(uid)
);`);
// Database class

class Database {
    static getPerson(uid) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM people WHERE uid = ?', [uid], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }
    static getInterests(uid) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM interests WHERE uid = ?', [uid], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }
    static async addInterest(uid, interest, impact = 1) {
        const interests = await Database.getInterests(uid);
        if (interests && interests.length > 0) {
            const interestExists = interests.find(i => i.interestName === interest);
            if (!interestExists) {
                db.run('INSERT INTO interests (uid, interestName, impact) VALUES (?, ?, ?)', [uid, interest, impact]);
            }else{
                db.run('UPDATE interests SET impact = ? WHERE uid = ? AND interestName = ?', [interestExists.impact + impact, uid, interest]);
            }
        } else {
            db.run('INSERT INTO interests (uid, interestName, impact) VALUES (?, ?, ?)', [uid, interest, impact]);
        }
    }
}

// simple express server

const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use((req, res, next) => {
    if(!req.session.uid) return next();
    if(req.url == "/interests" && req.method == "GET") return next();
    console.log(req.session.uid + " " + req.method + " " + req.url, req.body, req.query);

    next();
})
app.get('/', (req, res) => {
    if (!req.session.uid) {
        req.session.uid = guid();
    }
    res.sendFile(__dirname + '/views/index.html');

    Database.getPerson(req.session.uid).then(person => {
        if (!person) {
            db.run('INSERT INTO people (uid) VALUES (?)', [req.session.uid]);
        }
    });
});

app.get('/interests', async (req, res) => {
    const uid = req.session.uid || guid();
    const interests = await Database.getInterests(uid);
    res.json({ interests });
});

app.post('/interests', async (req, res) => {
    const uid = req.session.uid || guid();
    const interests = req.body.interests;
    for (let interest of interests) {
        if(interest.impact === 0) continue;
        await Database.addInterest(uid, interest.interestName, interest.impact);
    }
    res.status(200).send('ok');
});


const pos = require("pos");
app.get("/partofspeech",(req,res)=>{
    var word = req.query.word;

    var words = new pos.Lexer().lex(word);
    var tagger = new pos.Tagger();
    var taggedWords = tagger.tag(words);
    var response = [];
    for (let taggedWord of taggedWords) {
        var word = taggedWord[0];
        var tag = taggedWord[1];
        response.push({word,tag});
    }
    res.json(response);
});
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});


