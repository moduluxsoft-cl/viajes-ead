import express from "express";
import emailRoutes from "./emailRoutes.js";

const router = express.Router();

// Ruta base para los endpoints relacionados con correos
router.use("/mail", emailRoutes);

export default router;