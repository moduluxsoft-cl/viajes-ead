import nodemailer from "nodemailer";
import dotenv from "dotenv";
import {getOAuth2Client} from "../../oauth/oauthClient.js";
dotenv.config();

// Configuración de OAuth2
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = getOAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN);

// Función para enviar correo de confirmación
export async function sendConfirmationMail(mailOptions, mail, qrHash) {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "buses@ead.cl",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token || "",
            },
        });

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error enviando correo:", error);
    }
}