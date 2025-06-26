import {generateQR} from "../qr-generator/qrGenerator.js";

export const generateQRRoute = (req, res) => {
    try {
        generateQR(null, null, null);
    } catch (error) {
        console.error(error.message);
        res.status(500).send(`Error generando QR: ${error.message}`);
    }
}