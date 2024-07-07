// Importar dependencias
const {connection} = require("./database/connection")
const express = require('express');
const cors = require('cors');

// Mensaje de bienvenida
console.log("API NODE para red social arrancada");

// Conexion a la base de datos
connection()

// Servidor Node
const app = express();
const puerto = 3900;

// Configurar CORS
app.use(cors());

// Convertir los datos del body a objetos js
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Cargar conf rutas
const UserRutes = require('./routes/user');
const PublicationRutes = require('./routes/publication');
const FollowRutes = require('./routes/follow');

app.use('/api/user', UserRutes);
app.use('/api/publication', PublicationRutes);
app.use('/api/follow', FollowRutes);

// Ruta de prueba
app.get("/ruta-prueba", (req,res) => {
    return res.status(200).json(
        {
            "id": 1,
            "nombre": "Camilo Garcia",
        }
    )
});

// Poner el servidor a escuchar peticiones http
app.listen(puerto, () => {
    console.log("Servidor de NODE corriendo en el puerto: " + puerto);
})