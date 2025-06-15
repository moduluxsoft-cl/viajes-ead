import {google} from "googleapis";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configuración de OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Función para enviar correo
export async function sendConfirmationMail() {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "buses@ead.cl", // Correo desde donde envías
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token || "", // Token de acceso
            },
        });

        const mailOptions = {
            from: "Sistema de reserva de viajes - EAD <buses@ead.cl>",
            to: "cristoca2017@hotmail.com",
            subject: "[Confirmación] - Buses a Ciudad Abierta - DD/MM/YY",
            text: "Estimada/o:\n" +
                "Junto con saludar, confirmamos su cupo en los Buses a Ciudad Abierta.\n" +
                "Esta confirmación es válida sólo para el DD/MM/YY, a fin de dar la oportunidad a quienes no lo consiguieron esta vez, tengan la opción en otra ocasión. \n" +
                "El sistema de recepción y escaner de QR estará a cargo de la profesora Antonia Jeldes Cajas y dos estudiantes ayudantes.\n" +
                "A continuación se adjunta un código QR que deberá ser mostrado a la hora de ingresar al bus en la ida y la vuelta. El código solo es válido ese día dos veces. \n" +
                "Es muy relevante que el QR sea utilizado el día correspondiente en el trayecto de ida y vuelta a fin de no sub-utilizar el beneficio.\n" +
                "Sin otro particular, se despide atentamente,\n",
        };

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error enviando correo:", error);
    }
}