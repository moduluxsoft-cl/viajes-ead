import express from "express";
import routes from "./routes/index.js"; // Importamos las rutas definidas

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para el manejo de datos JSON en solicitudes
app.use(express.json());

// Registrar todas las rutas
app.use("/api", routes); // Prefijo general para las rutas (por ejemplo: /api/email/send/confirmation)

// Servidor activo
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});