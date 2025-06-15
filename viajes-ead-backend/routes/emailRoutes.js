import express from "express";
import { sendConfirmationMailHandler } from "../controllers/gmailController.js";

const router = express.Router();

// Ruta para enviar correos de confirmación
router.get("/send/confirmation", sendConfirmationMailHandler);

export default router;