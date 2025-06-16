export function createEmail(from, to, subject, text){
    return {
        from: from,
        to: to,
        subject: subject,
        text: text
    }
}