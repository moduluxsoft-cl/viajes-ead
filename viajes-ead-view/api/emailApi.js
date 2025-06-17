import api from './index.js';

export async function sendConfirmationEmail(email, qrHash) {
    const response = await api.post('/api/mail/send/confirmation', { email, qrHash });
    return response.data;
}

