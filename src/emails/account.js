const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'genazn@mailto.plus',
        subject: 'Thanks for joining in!',
        text: `Welcome to the app, ${name}. Let me know how you get along with the app.`
    });
};

const sendCancellationEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'genazn@mailto.plus',
        subject: 'Account cancellation confirmation.',
        text: `${name}, we're sorry to see you go. Can you tell us about what lead you to this decision?`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancellationEmail
}