import express from "express";
import {generateQRRoute} from "../controllers/qrController.js";

const router = express.Router();

// Ruta para enviar correos de confirmación
router.post("/generate", generateQRRoute);

export default router;