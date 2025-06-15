// Importa las funciones o servicios necesarios (puedes usar tu función de envío de correos aquí)
import { sendConfirmationMail } from "../email-clients/gmail/gmailClient.js";

export const sendConfirmationMailHandler = async (req, res) => {
    try {
        const result = await sendConfirmationMail(); // Llama a la función para enviar correos
        res.status(200).send("Correo enviado exitosamente: " + result.response);
    } catch (error) {
        res.status(500).send(`Error enviando el correo: ${error.message}`);
    }
};