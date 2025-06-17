import { decrypt } from "../encryption/encryption.js";
import dotenv from "dotenv";
dotenv.config();

export const sendConfirmationMailHandler = async (req, res) => {
    try {
        const { data } = req.body;
        // Convertir la clave de hexadecimal a un Buffer
        let key;
        try {
            console.log("Clave de cifrado:", process.env.CRYPTO_KEY);
            key = Buffer.from(process.env.CRYPTO_KEY.toString(), "hex");
            if (key.length !== 16) {
                throw new Error("Invalid key length: La clave debe ser de exactamente 16 bytes.");
            }
        } catch (err) {
            console.error("Error en la clave de cifrado:", err.message);
            res.status(500).send("Error en la configuración de la clave.");
            return;
        }

        // Desencriptar para verificar
        const decryptedData = decrypt(data, key);
        console.log("Datos desencriptados:", decryptedData);

        const jsonData = JSON.parse(decryptedData);
        const { email, qrHash } = jsonData;
        console.log("Email:", email, "QR Hash:", qrHash);

        // Continuar con el envío de correo...
        res.status(200).send("Correo enviado exitosamente.");
    } catch (error) {
        console.error(error.message);
        res.status(500).send(`Error enviando el correo: ${error.message}`);
    }
};