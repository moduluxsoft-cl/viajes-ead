import dotenv from "dotenv";
import {sendConfirmationMail} from "../email-clients/gmail/gmailClient.js";
dotenv.config();

export const sendConfirmationMailHandler = async (req, res) => {
    try {
        const { email, qrHash } = req.body;

        console.log("Email:", email, "QR Hash:", qrHash);

        const mailOptions = {
            from: "Sistema de reserva de viajes - EAD <buses@ead.cl>",
            to: email,
            subject: "[Confirmación] - Buses a Ciudad Abierta - DD/MM/YY",
            text: "Estimada/o:\n" +
                "Junto con saludar, confirmamos su cupo en los Buses a Ciudad Abierta.\n" +
                "Esta confirmación es válida sólo para el DD/MM/YY, a fin de dar la oportunidad a quienes no lo consiguieron esta vez, tengan la opción en otra ocasión. \n" +
                "El sistema de recepción y escaner de QR estará a cargo de la profesora Antonia Jeldes Cajas y dos estudiantes ayudantes.\n" +
                "A continuación se adjunta un código QR que deberá ser mostrado a la hora de ingresar al bus en la ida y la vuelta. El código solo es válido ese día dos veces. \n" +
                "Es muy relevante que el QR sea utilizado el día correspondiente en el trayecto de ida y vuelta a fin de no sub-utilizar el beneficio.\n" +
                "Sin otro particular, se despide atentamente,\n",
        };

        // Continuar con el envío de correo
        await sendConfirmationMail(mailOptions)
            .then(() => {res.status(200).send("Correo enviado correctamente.");})
            .catch((error) => {console.error(error.message);})
    } catch (error) {
        console.error(error.message);
        res.status(500).send(`Error enviando el correo: ${error.message}`);
    }
};