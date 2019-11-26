const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
admin.initializeApp();

var firebaseConfig = {
    apiKey: "AIzaSyCtcyIAL81Ovwqw5n60FALg5E-NYxiPXt4",
    authDomain: "proyecto-web-km.firebaseapp.com",
    databaseURL: "https://proyecto-web-km.firebaseio.com",
    projectId: "proyecto-web-km",
    storageBucket: "proyecto-web-km.appspot.com",
    messagingSenderId: "467185900660",
    appId: "1:467185900660:web:7f61c51ba9e37a75070521"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// POST Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/loginUser - Params passed by body
exports.loginUser = functions.https.onRequest(async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    let authenticated = false;

    // eslint-disable-next-line promise/always-return,promise/catch-or-return
    await firebase.auth().signInWithEmailAndPassword(email, password).then((response) => {
        authenticated = true;
    }).catch((error) => {
        console.log(error.message);
    });

    res.sendStatus((authenticated) ? 200 : 401);
});

// POST Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/registerUser - Params passed by body
exports.registerUser = functions.https.onRequest(async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const monitor = req.body.monitor;
    const student = req.body.student;
    const name = req.body.name;
    const program = req.body.program;

    console.log(`Email: ${email}, Password: ${password} and Name: ${name}`);

    let created = false;

    await admin.auth().createUser({email: email, password: password})
    // eslint-disable-next-line promise/always-return
        .then((response) => {
            admin.firestore().collection('users').add(
                {
                    email: email,
                    monitor: monitor,
                    student: student,
                    name: name,
                    program: program,
                    student_meetings: [],
                    monitor_meetings: []
                }
            );
            created = true;
        })
        .catch((error) => {
            console.log(error.message);
        });

    res.sendStatus((created) ? 200 : 503);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/addMeeting?monitor_email=EMAIL&location=LOCATION&start_time=START&end_time=END
exports.addMeeting = functions.https.onRequest(async (req, res) => {
    const monitor_email = req.query.monitor_email;
    const location = req.query.location;
    const start_time = req.query.start_time;
    const end_time = req.query.end_time;

    let added = false;
    let meetingId = '';

    // Add meeting document
    await admin.firestore().collection('meetings').add(
        {
            monitor_email: monitor_email,
            location: location,
            start_time: start_time,
            end_time: end_time,
        }

        // eslint-disable-next-line promise/always-return
    ).then((ref) => {
        meetingId = ref.id;
    });

    // Bind the meeting to the monitor meetings
    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('users').where('email', '==', monitor_email).get().then((querySnapshot) => {
        querySnapshot.forEach((monitor) => {
            let monitor_meetings = [];
            if (monitor.data().monitor_meetings !== null)
                monitor_meetings = monitor.data().monitor_meetings;
            monitor_meetings.push(meetingId);

            admin.firestore().collection('users').doc(monitor.id).update({monitor_meetings: monitor_meetings});
            added = true;
        })
    });

    res.sendStatus((added) ? 200 : 503);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/enrollMeeting?student_email=EMAIL&meetingId=MEETING
exports.enrollMeeting = functions.https.onRequest(async (req, res) => {
    const student_email = req.query.student_email;
    const meetingId = req.query.meetingId;
    let enrolled = false;

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('users').where('email', '==', student_email).get().then((querySnapshot) => {
        querySnapshot.forEach((student) => {
            let student_meetings = [];
            if (student.data().student_meetings !== null)
                student_meetings = student.data().student_meetings;
            student_meetings.push(meetingId);

            admin.firestore().collection('users').doc(student.id).update({student_meetings: student_meetings});
            enrolled = true;
        });
    });
    res.sendStatus((enrolled) ? 200 : 503);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/getUser
exports.getUser = functions.https.onRequest(async (req, res) => {
    const email = req.query.email;
    let user = null;
    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('users').where('email', '==', email).get().then((querySnapshot) => {
        querySnapshot.forEach((item) => {
            user = item.data();
        });
    });
    res.send(user);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/getPrograms
exports.getPrograms = functions.https.onRequest(async (req, res) => {
    let programs = [];

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('programs').get().then((querySnapshot) => {
        querySnapshot.forEach((item) => {
            programs.push(item.data().name);
        });
    });
    res.send(programs);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/getSubjects?program=PROGRAM
exports.getSubjects = functions.https.onRequest(async (req, res) => {
    const program = req.query.program;
    let subjects = [];

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('programs').where('name', '==', program).get().then((querySnapshot) => {
        querySnapshot.forEach((item) => {
            subjects.push(item.data().subjects);
        })
    });

    res.send(subjects);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/getMeetingsBooked?email=EMAIL
exports.getMeetingsBooked = functions.https.onRequest(async (req, res) => {
    const email = req.query.email;
    let meetings = {asStudent: [], asMonitor: []};
    let monitorMeetings = [];
    let studentMeetings = [];
    let mnMeetings = [];
    let stMeetings = [];

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('users').where('email', '==', email).get().then((querySnapshot) => {
        querySnapshot.forEach((item) => {
            monitorMeetings = item.data().monitor_meetings;
            studentMeetings = item.data().student_meetings;
        });
    });

    if (monitorMeetings !== null)
        for (const meeting of monitorMeetings) {
            // eslint-disable-next-line promise/catch-or-return,promise/always-return,no-await-in-loop
            await admin.firestore().collection('meetings').doc(meeting).get().then((document) => {
                // eslint-disable-next-line promise/always-return
                if (document.exists)
                    meetings.asMonitor.push(document.data());
            });
        }

    if (studentMeetings !== null)
         for (const meeting of studentMeetings) {
             // eslint-disable-next-line promise/catch-or-return,promise/always-return,no-await-in-loop
             await admin.firestore().collection('meetings').doc(`${meeting}`).get().then((document) => {
                // eslint-disable-next-line promise/always-return
                if (document.exists) {
                    meetings.asStudent.push(document.data());
                }
            });
        }

    res.send(meetings);
});

// GET Ex: https://us-central1-proyecto-web-km.cloudfunctions.net/getMeetingsBySubject?subject=SUBJECT
exports.getMeetingsBySubject = functions.https.onRequest(async (req, res) => {
    const subject = req.query.subject;
    let meetings = [];

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('meetings').where('subject', '==', subject).get().then((querySnapshot) => {
        querySnapshot.forEach((item) => {
            meetings.push(item.data());
        })
    });

    res.send(meetings);
});
