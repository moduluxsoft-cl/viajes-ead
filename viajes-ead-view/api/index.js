import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
    baseURL: "http://localhost:3000",
    timeout: 10000, // Tiempo máximo para las peticiones
    headers: {
        "Content-Type": "application/json", // Tipo de datos que envía
    },
});

// Interceptores para autenticar solicitudes
// api.interceptors.request.use(
//     (config) => {
//         // Agregar token de autenticación si existe
//         const token = localStorage.getItem("authToken");
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );

// Manejador de respuestas y errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Puedes manejar errores aquí (por ejemplo, redirección si hay 401)
        console.error("Error en la API:", error);
        return Promise.reject(error);
    }
);

export default api;

