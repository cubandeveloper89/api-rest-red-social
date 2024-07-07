// Importar dependencias y modulos
const User = require("../models/user");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const Follow = require('../models/follow');
const Publication = require("../models/publication");


// Importar servicios
const jwt = require('../services/jwt');
const followService = require("../services/followService");
const validate = require("../helpers/validate");


// Acciones de prueba
const pruebaUser = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/user.js",
        usuario: req.user
    });
};

// Registro de usuarios
const register_by_victor = (req, res) => {              // *** este es el metodo usando callback en la funcion exec ***
    // Recoger datos de la peticion
    let params = req.body;


    // Comprobar que me llegan bien + validacion
    if(!params.name || !params.email || !params.password || !params.nick){
        console.log("Validacion minima pasada");
        return res.status(400).json({
            status: "error",
            message: "Faltan datos por enviar"
        });
    } 
    // Crear objeto de usuario
    let user_to_save = new User(params);

    // Control de usuarios duplicados
    User.find({ $or: [
        {email: user_to_save.email.toLowerCase()},
        {nick: user_to_save.nick.toLowerCase()}
    ]}).exec((error, users) => {
        if (error) return res.status(500).json({status: "error", message: "Error al guardar duplicados"});      
        
        if (users && users.length >= 1){
            return res.status(200).send({
                status: "succes",
                message: "El usuario ya existe",
            });
        } else {
            // Cifrar contraseña
        
            // Guardar usuario en la bbdd
        
            // Devolver resultado
            return res.status(200).json({
                status: "succes",
                message: "Accion de registro de usuarios",
                user_to_save
            });

        }
    })
};

const register = async (req, res) => {
 
    let params = req.body;
 
    if (!params.name || !params.email || !params.password || !params.nick) {
 
        console.log("!Faltan datos por enviar");
 
        return res.status(400).json({
            messaje: "Faltan datos por enviar",
            status: "error"
        });
    }
    // Validacion avanzada
    try {
        validate.validate(params);
        
    } catch (error) {
        return res.status(400).json({
            status: "error",
            messaje: "No ha superado la validacion"
        });
    }
    try {
 
        // Control usuarios duplicados
        const users = await User.find({
            $or: [
                { email: params.email.toLowerCase() },
                { nick: params.nick.toLowerCase() }
            ]
        });
    
        if (users && users.length >= 1) {
            return res.status(200).send({
                status: "error",
                message: "El usuario ya existe"
            });
        }
    
        // Cifrar contraseña
        let pwd = await bcrypt.hash(params.password, 10);
        params.password = pwd;
    
        // Crear objeto usuario
        let user_to_save = new User(params);
    
        // Guardar usuario en la base de datos
        const userStored = await user_to_save.save();
    
        if (!userStored) {
            return res.status(500).send({
                status: "error",
                message: "Error al guardar el usuario"
            });
        }
    
        // Devolver resultado
        return res.status(200).json({
            status: "success",
            message: "Usuario registrado correctamente",
            user: userStored
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Error en la petición"
        });
    }
}

const login = async (req, res) => {
    // Recoger los parametros
    let params = req.body;

    if (!params.email || !params.password) {
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        })
    }

    // Buscar en la bbdd si existe el usuario
    let usuarioBuscado = await User.findOne({email: params.email})
        // .select({"password": 0, "role": 0})    //para no devolver la contraseña ni el rol
        .exec()
        if (!usuarioBuscado) {
            return res.status(404).send({
                status: "error",
                message:" El usuario no existe"
            });
        }

    // Comprobar contraseña
        let pwd = bcrypt.compareSync(params.password, usuarioBuscado.password)

        if (!pwd) {
            return res.status(400).send({
                status: "error",
                message: "Contraseña inválida"
            });
        }
    // Conseguir el Token
    const token = jwt.createToken(usuarioBuscado);
    
    // Devolver datos usuario

    return res.status(200).send({
        status: "success",
        message: "Identificado correctamente",
        usuarioBuscado: {
            id: usuarioBuscado._id,
            name: usuarioBuscado.name,
            nick: usuarioBuscado.nick
        },
        token
    })
};

const profile = async (req, res) => {
    // Recibir el parametro del id del usuario por la url
    const id = req.params.id;

    // Consulta para sacar los datos del usuario
    let userProfile = await User.findById(id)
        .select({ password: 0, role: 0 })
        .exec()

        if (!userProfile) {
            return res.status(404).send({
                status: "error",
                message: "El usuario no existe o hay un error."
            });
        }

        // Info de seguimiento
        const followInfo = await followService.followThisUser(req.user.id, id)

    // Devolver resultados
    return res.status(200).send({
        status: "success",
        user: userProfile,
        following: followInfo.following,
        follower: followInfo.followers
    })
    

};

const list = async (req, res) => {
    try {
        // Controlar en que pagina estamos
        let page = 1;
        if (req.params.page) {
            page = req.params.page;
        }
        page = parseInt(page);
        
        // Consulta con mongoose paginate
        let itemsPerPage = 5;

        // Conteo de usuarios
        let totalUsers = await User.countDocuments({}).exec();

        // Busqueda de usuarios
        let users = await User.find().select("-password -email -role -__v").sort('_id').paginate(page, itemsPerPage).exec()

        if(!users){
            return res.status(404).send({
                status: "error",
                messasge: "No hay usuarios que mostrar",
                });
        }

        // Hacer la consulta con mongoose pagination

        // Sacar un array de los ids de lo usuarios que me sigen y los que sigo como camilo
        let followUserIds = await followService.followUserIds(req.user.id);

        // Devolver el resultado (posteriormente info de follows)

        return res.status(200).send({
            status: "success",
            login: req.user.name,
            users,
            page,
            itemsPerPage, 
            totalUsers,
            pages: Math.ceil(totalUsers/itemsPerPage),
            user_following: followUserIds.following,
            user_follow_me: followUserIds.followers
        })

    } catch (error) {
        return res.status(500).send({
            status: 'error',
            message: 'Error while searching users list',
            error
 
        })
    }

};

const update = async (req, res) => {

    // Recoger info de usuario actualizar
    let userIdentity = req.user;    //para poder sacar la info del usuario cuando la necesite
    let userToUpdate = req.body;

    // Eliminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;


    // Comprobar si el usuario existe
    try {
        const users = await User.find({
            $or: [
                { email: userToUpdate.email.toLowerCase() },
                { nick: userToUpdate.nick.toLowerCase() }
            ]
        });

        let userIsset = false;
        users.forEach(user => {
            if (user && user._id != userIdentity.id) userIsset = true;
        });
    
        if (userIsset) {
            return res.status(200).send({
                status: "error",
                message: "El usuario ya existe"
            });
        }else{
            delete userToUpdate.password;
        }
    
        // Cifrar contraseña
        if (userToUpdate.password) {
            let pwd = await bcrypt.hash(userToUpdate.password, 10);
            userToUpdate.password = pwd;
        }
        
        // Buscar y actualizar
        let userUpdated = await User.findByIdAndUpdate({_id:userIdentity.id}, userToUpdate, {new:true})
    
        // Devolver resultado
        return res.status(200).send({
            status: "success",
            message: "Metodo de actualizar usuarios",
            userUpdated
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Error al actualizar usuarios"
        });
    }

};    

const upload = async (req, res) => {

    // Recoger el fichero de imagen y comprobar que existe
    if (!req.file) {
        return res.status(404).send({
            status: "error",
            message: "Peticion no incluye la imagen"
        });
    }

    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extension del archivo
    const imageSplit = image.split("\.");
    const extension = imageSplit[1];

    // Comprobar extension
    if (extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif") {
        
        // Si no es correcto, borrar archivo
        // Eliminar archivo
        const filePath = req.file.path;
        const deletedFile = fs.unlinkSync(filePath);
        // Devolver respuesta negativa
        return res.status(400).send({
            status: "error",
            message: "Extension del archivo invalido"
        })
    }


    // Si si es correcta, guardar en la bbdd
    try {
        let userUpdated = await User.findByIdAndUpdate({_id: req.user.id}, {image: req.file.filename}, {new: true})
        return res.status(200).send({
            status: "Success",
            message: "accion de subir una imagen o avatar",
            user: userUpdated,
            file: req.file,
        })
        
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "No se ha podido subir la imagen"
        })
    }

};

const avatar = (req, res) => {
    // Sacar el parametro de la url
    const file = req.params.file;       //este file es el que le hemos definido en la ruta

    // Montar el path de la imagen
    const filePath = "./uploads/avatars/"+file;

    // Comprobar que existe
    fs.stat(filePath,(error, exists) => {
        if (!exists) {
            return res.status(404).send({
                status: "error",
                message: "No existe la imagen"
            })
        }
        // Devolver un file
    
        return res.sendFile(path.resolve(filePath));
    });
};

const counters = async (req, res) => {

    let userId = req.user.id;

    if(req.params.id) userId = req.params.id;

    try {
        const following = await Follow.countDocuments({ "user": userId}).exec();

        const followed = await Follow.countDocuments({"followed": userId}).exec();

        const publications = await Publication.countDocuments({ "user": userId}).exec();

        return res.status(200).send({
            userId,
            login: req.user.name,
            following: following,
            followed: followed,
            publications: publications
        });

    } catch (error) {
        return res.status(500).send({
            status: "error",
            login: req.user.name,
            message: "Ha ocurrido un error"
        })
    }
}

// Exportar acciones
module.exports = {
    pruebaUser,
    register,
    login,
    profile,
    list,
    update,
    upload,
    avatar,
    counters
}
