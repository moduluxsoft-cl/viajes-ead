import express from "express";
import emailRoutes from "./emailRoutes.js";
import qrRoutes from "./qrRoutes.js";

const router = express.Router();

router.use("/mail", emailRoutes);
router.use("/qr", qrRoutes)

export default router;