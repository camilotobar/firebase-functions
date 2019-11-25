const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.loginUser = functions.https.onRequest(async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    let authenticated = false;

    // eslint-disable-next-line promise/always-return
    await admin.auth().signInWithEmailAndPassword(email, password).then((response) => {
        authenticated = true;
    });

    res.sendStatus((authenticated) ? 200 : 401);
});

exports.registerUser = functions.https.onRequest(async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const monitor = req.query.monitor;
    const student = req.query.student;
    const name = req.query.name;
    const program = req.query.program;

    let created = false;

    await admin.auth().createUserWithEmailAndPassword(email, password)
    // eslint-disable-next-line promise/always-return
        .then((response)=> {
            admin.firestore().collection('users').add(
                {
                    email: email,
                    monitor: monitor,
                    student: student,
                    name: name,
                    program: program,
                }
            );
            created = true;
        })
        .catch((error) => {
            console.log(error.message);
        });

    res.sendStatus((created)? 200 : 503);
});

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
            monitor_meetings.push(meetingId);

            if(monitor.data().monitor_meetings !== null)
                monitor_meetings = monitor.data().monitor_meetings;

            admin.firestore().collection('users').doc(monitor.id).update({ monitor_meetings : monitor_meetings });
            added = true;
        })
    });

    res.sendStatus((added)? 200 : 503);
});

exports.enrollMeeting = functions.https.onRequest(async (req, res) => {
    const student_email = req.query.student_email;
    const meetingId = req.query.meetingId;
    let enrolled = false;

    // eslint-disable-next-line promise/always-return
    await admin.firestore().collection('users').where('email', '==', student_email).get().then((querySnapshot) => {
        querySnapshot.forEach((student) => {
            let student_meetings = [];
            student_meetings.push(meetingId);

            if(student.data().student_meetings !== null)
                student_meetings = student.data().student_meetings;

            admin.firestore().collection('users').doc(student.id).update({ student_meetings : student_meetings });
            enrolled = true;
        });
    });
    res.sendStatus((enrolled)? 200 : 503);
});

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

exports.helloWorld = functions.https.onRequest((request, response) => {
    let mes = 'Message: ';
    admin.database().ref('/messages').on('value', (snapshot) => {
        console.log(snapshot.val());
        snapshot.forEach((childNodes) => {
            console.log(`${childNodes.key} - ${childNodes.val().original}`);
            mes = `${mes} ${childNodes.val().key} - ${childNodes.val().original} | `;
        });
    });
    response.send(`Hello from Firebase!`);
});


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
