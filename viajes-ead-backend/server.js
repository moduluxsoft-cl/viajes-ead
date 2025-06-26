import express from "express";
import routes from "./routes/index.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para el manejo de datos JSON en solicitudes
app.use(express.json());

// Habilitar CORS
app.use(cors());

// Registrar todas las rutas
app.use("/api", routes);

// Servidor activo
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});