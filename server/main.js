// include required libraries and modules
const express = require('express');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const expressWS = require('express-ws');

// load libraries for S3
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// libraries for mongodb
const ObjectId = require('mongodb').ObjectId;
const MongoClient = require('mongodb').MongoClient;
const Timestamp = require('mongodb').Timestamp;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";

// libraries that are need for emailing and OAuth2
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// Passport core
const passport = require('passport');
// Passport strategy
const LocalStrategy = require('passport-local').Strategy;

// configure PORT and other globals
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

const WSCONN = {}; // a record of all web sockets connected to this server

// configure databases
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_NAME || 'fsdfinal',
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT) || 4,
    timezone: '+08:00'
});

const makeQuery = (sql, dbPool) => {
    console.info('=> Creating query: ', sql);
    return (async (args) => {
        const conn = await dbPool.getConnection();
        try {
            let results = await conn.query(sql, args) || [];
            return results[0];
        } catch (e) {
            console.error('=> Unable to create query: ', e);
        } finally {
            conn.release();
        }
    });
};

SQL_QUERY_USER_INFO = "select username from users where username = ? and password = sha1(?)";
SQL_QUERY_NEW_USER_ADD = "insert into users(email, username, password, hash) values(?, ?, sha1(?), sha1(?))";
SQL_QUERY_GET_HASH = "select hash from users where email = ?";
SQL_QUERY_GET_USER_ID_FROM_HASH = "select user_id from users where hash like ?";
SQL_QUERY_SET_USER_VERIFIED = "update users set is_verified = TRUE, hash = NULL where user_id = ?";

const queryUser = makeQuery(SQL_QUERY_USER_INFO, pool);
const addNewUser = makeQuery(SQL_QUERY_NEW_USER_ADD, pool);
const getUserHash = makeQuery(SQL_QUERY_GET_HASH, pool);
const getUserIDFromHash = makeQuery(SQL_QUERY_GET_USER_ID_FROM_HASH, pool);
const setUserVerified = makeQuery(SQL_QUERY_SET_USER_VERIFIED, pool);

// define any S3 cloud persistance storage settings
const multipart = multer({
    dest: process.env.TMP_DIR || path.join(__dirname, "/uploads/")
});
const cloudEP = process.env.CLOUD_ENDPOINT;
const endpoint = new AWS.Endpoint(cloudEP);
const s3 = new AWS.S3({
    endpoint: endpoint,
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});

// create an instance of the mongodb client and define database-specific constants
const mongoClient = new MongoClient(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const MONGO_DB_NAME = 'fsdfinal';
const MONGO_COLLECTION_NAME = 'users';

const makeUserProfileData = (userdata) => {
    return {
        username: userdata.username,
        profile: {
            income: userdata.income,
            save: userdata.save,
            spend: userdata.spend,
            donate: userdata.donate,
            invest: userdata.invest
        },
        transactions: []
    }
}

const TOKEN_SECRET = process.env.SECRET || "secret";

// helper function to ensure that the express server can start up properly
const startApp = async (newApp, newPool) => {
    try {
        const conn = await newPool.getConnection();

        console.info('We are pinging the MySQL database..');
        await conn.ping();

        // at this point, if an error occurred, the error will be thrown and caught in the catch segment.
        // Otherwise, it is safe to assume that the connection was successful.
        conn.release();

        console.info('We are connecting to S3 and MongoDB..');
        const p0 = new Promise((resolve, reject) => {
            if((!!process.env.ACCESS_KEY) && (!!process.env.SECRET_ACCESS_KEY)) {
                resolve();
            } else {
                reject('S3 Keys are not found');
            }
        });
        const p1 = mongoClient.connect();

        Promise.all([p0, p1]).then(() => {
            newApp.listen(PORT, () => {
                console.info(`Server start at port ${PORT} on ${new Date()}`);
            });
        }).catch(e => {
            console.error('=> Unable to establish a connection to the MongoDB server: ', e);
        });
    } catch (e) {
        console.error('=> Unable to establish a connection to the database!', e);
    }
}

// configure Passport with a strategy
passport.use(
    new LocalStrategy(
        { usernameField: 'username', passwordField: 'password', passReqToCallback: true },
        async (req, user, password, done) => {
            // perform the authentication
            console.info(`=> Received user:${user} and password:${password}`);
            const userInfo = await queryUser([user, password]);
            console.info('=> userInfo: ', userInfo);
            let authResult = false; // (user == password);
            if (userInfo && userInfo.length > 0) {
                authResult = true;
                console.info('=> Setting authResult to true!');
            }
            if (authResult) {
                done(null,
                    // info about the user
                    { username: user, loginTime: (new Date()).toString(), security: 2 }
                );
                return;
            }
            // incorrect login
            done('Incorrect username and password', false);
        }
    )
);

const makeAuth = (newPassport) => {
    return (req, res, next) => {
        newPassport.authenticate('local',
            (err, user, info) => {
                if((err != null) || (!user)) {
                    res.status(401).contentType('application/json').json({ error: err });
                    return;
                }
                req.user = user;
                next();
            }
        )(req, res, next);
    }
}

const localStrategyAuth = makeAuth(passport);

// nodemailer setup with OAuth2 (gmail)
const OAuth2User = process.env.OA_USER || "";
const OAuth2PGUrl = "https://developers.google.com/oauthplayground";
const OAuth2ClientID = process.env.OA_CLIENT_ID || "";
const OAuth2ClientSecret = process.env.OA_CLIENT_SECRET || "";
const OAuth2RefreshToken = process.env.OA_REFRESH_TOKEN || "";

const myOAuth2Client = new OAuth2(OAuth2ClientID, OAuth2ClientSecret, OAuth2PGUrl);
myOAuth2Client.setCredentials({
    refresh_token: OAuth2RefreshToken
});

const sendEMail = (from, to, subject, body) => {
    const myAccessToken = myOAuth2Client.getAccessToken();
    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: OAuth2User,
            clientId: OAuth2ClientID,
            clientSecret: OAuth2ClientSecret,
            refreshToken: OAuth2RefreshToken,
            accessToken: myAccessToken
        }
    });
    const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: body
    }

    const newPromise = new Promise((accept, reject) => {
        transport.sendMail(mailOptions, (err, result) => {
            if(err) {
                reject({ error: err });
            } else {
                transport.close();
                accept({ message: 'Email was sent.. Please check your inbox!' });
            }
        });
    });
    return newPromise;
};

// create an instance of the express server and web socket
const app = express();
const appWS = expressWS(app);

// define middleware and routes
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// initialise passport after json and form-urlencoded has been processed
app.use(passport.initialize());

/* passport authentication with closure function */
app.post('/login', localStrategyAuth, (req, res, next) => {
    console.info('user: ', req.user);
    // generate JWT token
    const currTime = (new Date()).getTime(); // note that the time given is in milliseconds
    const token = jwt.sign({
        sub: req.user.username,
        iss: 'quickjournal',
        iat: currTime / 1000,
        // nbf: (currTime / 1000) + 15, // can only be used 15 seconds later
        exp: (currTime / 1000) + 3*60*60, // for the token to expire 3 hours later
        data: {
            loginTime: req.user.loginTime
        }
    }, TOKEN_SECRET);

    res.status(200).contentType('application/json').json({ message: `Login at ${new Date()}`, token: token, token_type: 'Bearer' });
});

app.get('/summary/:username', (req, res, next) => {
    const username = req.params.username;
    console.info('=> Received username ', username);

    mongoClient.db(MONGO_DB_NAME).collection(MONGO_COLLECTION_NAME)
        .aggregate([
            {
                $match: { username: username }
            },
            {
                $unwind: "$transactions"
            },
            {
                $group: {
                    _id: "$transactions.category",
                    total: { $sum: "$transactions.amount" }
                }
            }
        ])
        .toArray()
        .then(result => {
            console.info('=> Mongo find result: ', result);
            if(result != null && result.length > 0) {
                res.status(200).contentType('application/json').json({ data: result });
            } else {
                res.status(200).contentType('application/json').json({ data: {} });
            }
        })
        .catch(e => {
            console.error('=> Error while updating mongo: ', e);
            res.status(500).contentType('application/json').json({ error: 'Unable to retrieve data from MongoDB' });
        });
});

app.get('/transactions/:username', (req, res, next) => {
    const username = req.params.username;
    console.info('=> Received username ', username);

    mongoClient.db(MONGO_DB_NAME).collection(MONGO_COLLECTION_NAME)
        .find({ username: username })
        .toArray()
        .then(result => {
            console.info('=> Mongo find result: ', result);
            if(result != null && result.length > 0) {
                res.status(200).contentType('application/json').json({ data: result[0] });
            } else {
                res.status(200).contentType('application/json').json({ data: {} });
            }
        })
        .catch(e => {
            console.error('=> Error while updating mongo: ', e);
            res.status(500).contentType('application/json').json({ error: 'Unable to retrieve data from MongoDB' });
        });
});

app.post('/createprofile', (req, res, next) => {
    // check if the request has Authorization header
    const auth = req.get('Authorization');
    if (auth == null) {
        res.status(401).contentType('application/json').json({ message: 'Cannot access' });
        return;
    }
    // bearer authorization
    const terms = auth.split(' ');
    if ((terms.length != 2) || (terms[0] != 'Bearer')) {
        res.status(401).contentType('application/json').json({ message: 'incorrect Authorization' });
        return;
    }
    const token = terms[1];
    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        console.info("Verified token: ", verified);
        req.token = verified;
        next();
    } catch (e) {
        res.status(403).contentType('application/json').json({ message: "Incorrect token", error: e});
    }
}, (req, res, next) => {
    const userData = req.body;
    userData.username = req.token.sub;
    console.info('=> userData: ', userData);
    const doc = makeUserProfileData(userData);
    mongoClient.db(MONGO_DB_NAME).collection(MONGO_COLLECTION_NAME)
        .insertOne(doc)
        .then(result => {
            console.info('=> Successfully created profile in mongo');
            res.status(200).contentType('application/json').json({ message: 'User profile created' });
        })
        .catch(e => {
            console.error('=> Error while creating profile in mongo: ', e);
            res.status(500).contentType('application/json').json({ error: 'Failed while creating profile to mongo' });
        });
});

app.post('/record', (req, res, next) => {
    // check if the request has Authorization header
    const auth = req.get('Authorization');
    if (auth == null) {
        res.status(401).contentType('application/json').json({ message: 'Cannot access' });
        return;
    }
    // bearer authorization
    const terms = auth.split(' ');
    if ((terms.length != 2) || (terms[0] != 'Bearer')) {
        res.status(401).contentType('application/json').json({ message: 'incorrect Authorization' });
        return;
    }
    const token = terms[1];
    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        console.info("Verified token: ", verified);
        req.token = verified;
        next();
    } catch (e) {
        res.status(403).contentType('application/json').json({ message: "Incorrect token", error: e});
    }
}, (req, res, next) => {

    const username = req.token.sub;
    const body = req.body;
    console.info('=> in /record with body:', JSON.stringify(body));

    const doc = {
        title: body['title'] || '',
        amount: body['amount'] || 0,
        comments: body['comments'] || '',
        category: body['category'] || ''
    };
    mongoClient.db(MONGO_DB_NAME).collection(MONGO_COLLECTION_NAME)
        .updateOne(
            { username: username },
            { $push: { transactions: doc }}
        )
        .then(result => {
            console.info('=> Successfully updated transaction in mongo:', result.result);
            res.status(200).contentType('application/json').json({ message: 'Transaction added to user' });
        })
        .catch(e => {
            console.error('=> Error while creating profile in mongo: ', e);
            res.status(500).contentType('application/json').json({ error: 'Failed while adding transaction to mongo' });
        });
});

app.post('/clear', (req, res, next) => {
    // check if the request has Authorization header
    const auth = req.get('Authorization');
    if (auth == null) {
        res.status(401).contentType('application/json').json({ message: 'Cannot access' });
        return;
    }
    // bearer authorization
    const terms = auth.split(' ');
    if ((terms.length != 2) || (terms[0] != 'Bearer')) {
        res.status(401).contentType('application/json').json({ message: 'incorrect Authorization' });
        return;
    }
    const token = terms[1];
    try {
        const verified = jwt.verify(token, TOKEN_SECRET);
        console.info("Verified token: ", verified);
        req.token = verified;
        next();
    } catch (e) {
        res.status(403).contentType('application/json').json({ message: "Incorrect token", error: e});
    }
}, (req, res, next) => {
    const username = req.body["username"];
    console.info('=> clear username: ', username);
    mongoClient.db(MONGO_DB_NAME).collection(MONGO_COLLECTION_NAME)
        .deleteMany({ username: username })
        .then(result => {
            console.info('=> Successfully cleared user transactions in mongo', result.result);
            res.status(200).contentType('application/json').json({ message: 'User transactions cleared' });
        })
        .catch(e => {
            console.error('=> Error while updating mongo: ', e);
            res.status(500).contentType('application/json').json({ error: 'Failed while clearing transactions in mongo' });
        });
});

app.post('/newuser', async (req, res, next) => {
    const newUserData = req.body;
    console.info('=> Inside register: ', newUserData);

    try {
        const addUserResult = await addNewUser([newUserData.email, newUserData.username, newUserData.password, newUserData.email]);
        console.info('=> Add new user results: ', addUserResult);
        if(addUserResult != null && addUserResult.affectedRows > 0) {
            const hashResult = await getUserHash([newUserData.email]);
            console.info('-> Hash obtained: ', hashResult);

            // create the verification email and send out
            const sender = OAuth2User;
            const recipient = newUserData.email;
            const title = "[Quick Journal] Please verify your email";
            const body = `<p>Dear ${newUserData.username}, please kindly verify your email with verification code <strong>${hashResult[0].hash}</strong>. Thank you!</p>`;
            try {
                const emailResult = await sendEMail(sender, recipient, title, body);
                console.info('=> Email sent with message: ', emailResult);
                res.status(200).contentType('application/json').json({ message: "User created.. Please kindly verify your email (you will receive a verification email)!" });
            } catch (e) {
                console.error('=> Error while sending email: ', e);
                res.status(500).contentType('application/json').json({ error: e });
            }
        } else {
            res.status(500).contentType('application/json').json({ error: "New user registration unsuccessful!" });
        }
    } catch (error) {
        res.status(500).contentType('application/json').json({ error });
    }
});

app.post('/verify', async (req, res, next) => {
    const hashVal = req.body['hash'];
    console.info('=> hashVal: ', hashVal);
    if(hashVal != null) {
        let result = await getUserIDFromHash([ hashVal ]);
        console.info('=> user_id result: ', result);
        if(result != null && result.length > 0) {
            const user_id = result[0].user_id;
            result = await setUserVerified([ user_id ]);
            console.info('=> setUserVerified result: ', result);
            const affectedRows = result.affectedRows;
            if(affectedRows > 0) {
                // some modification was done
                res.status(200).contentType('application/json').json({ message: "User verified.. You can now start using the account." });
            } else {
                res.status(500).contentType('application/json').json({ error: "User could not be verified!" });
            }
        } else {
            res.status(500).contentType('application/json').json({ error: "An invalid hash was provided. Please try again with a valid hash." });
        }
    } else {
        res.status(500).contentType('application/json').json({ message: "A hash is require to verify a user. Please try again." });
    }
});

app.ws('/connect', (ws, req) => {
    const username = req.query.username;
    console.info(`New websocket connection: ${username}`);
    // add the web socket connection to the WSCONN object
    ws.participantName = username;
    WSCONN[username] = ws;
    console.info('=> Completed storing WebSocket in WSCONN');

    // setup -> for chat messages
    ws.on('message', (payload) => {
        console.info('=> payload: ', payload);
        const chat = JSON.stringify({
            from: username,
            message: payload,
            timestamp: (new Date()).toString()
        });
        for (let person in WSCONN) {
            WSCONN[person].send(chat);
        }
    });

    ws.on('close', () => {
        console.info(`Closing websocket connection for ${username}`);
        // close our end of the connection
        WSCONN[username].close();
        // remove ownself from the WSCONN object
        delete WSCONN[username];
        console.info('=> close WSCONN: ', username);
    });
});

app.use(express.static(__dirname + "/public"));

// start the express server
startApp(app, pool);
