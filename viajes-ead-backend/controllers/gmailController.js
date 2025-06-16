// Importa las funciones o servicios necesarios (puedes usar tu función de envío de correos aquí)
import { sendConfirmationMail } from "../email-clients/gmail/gmailClient.js";
import {createEmail} from "../email/email.js";
import {encrypt, decrypt} from "../encryption/encryption.js";

import crypto from "crypto";

console.log(crypto.randomBytes(32).toString("hex"));

export const sendConfirmationMailHandler = async (req, res) => {
    try {
        const data = {email: "cristoca2017@hotmail.com", qrHash: "1234567890"};
        const encryptedData= encrypt(data.toString(), Buffer.from(process.env.CRYPTO_KEY, "hex"));
        console.log(encryptedData);

        const mailOptions = createEmail(
            "Sistema de reserva de viajes - EAD <buses@ead.cl>",
            "cristoca2017@hotmail.com",
            "[Confirmación] - Buses a Ciudad Abierta - DD/MM/YY",
            "Estimada/o:\n" +
            "Junto con saludar, confirmamos su cupo en los Buses a Ciudad Abierta.\n" +
            "Esta confirmación es válida sólo para el DD/MM/YY, a fin de dar la oportunidad a quienes no lo consiguieron esta vez, tengan la opción en otra ocasión. \n" +
            "El sistema de recepción y escaner de QR estará a cargo de la profesora Antonia Jeldes Cajas y dos estudiantes ayudantes.\n" +
            "A continuación se adjunta un código QR que deberá ser mostrado a la hora de ingresar al bus en la ida y la vuelta. El código solo es válido ese día dos veces. \n" +
            "Es muy relevante que el QR sea utilizado el día correspondiente en el trayecto de ida y vuelta a fin de no sub-utilizar el beneficio.\n" +
            "Sin otro particular, se despide atentamente,\n"
        );
        //Desencriptar
        const decryptedData = decrypt(encryptedData, Buffer.from(process.env.CRYPTO_KEY, "utf-8"));
        console.log(decryptedData.toString());
        const jsonData = JSON.parse(decryptedData);
        console.log(jsonData);
        const {email, qrHash} = jsonData;
        console.log(email, qrHash);

        //Generar QR

        //Enviar correo
        const result = await sendConfirmationMail(mailOptions, email, qrHash);

        res.status(200).send("Correo enviado exitosamente: " + result.response);
    } catch (error) {
        res.status(500).send(`Error enviando el correo: ${error}`);
    }
};