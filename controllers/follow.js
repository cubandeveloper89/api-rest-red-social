// Importar
const follow = require('../models/follow');
const Follow = require('../models/follow');
const User = require('../models/user');

// Importar dependencias
const mongoosePaginate = require('mongoose-pagination')

// Importar servicio
const followService = require("../services/followService")

// Acciones de prueba
const pruebaFollow = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/follow.js"
    });
};

// Accion de guardar un follow (accion seguir)
const save = async (req, res) => {

    // Conseguir datos por body
    const parametross = req.body;

    // Sacar id del usuario identificado
    const identity = req.user;

    // Crear objeto con modelo follow
    let userToFollow = new Follow({
        user: identity.id,
        followed: parametross.followed
    })
    // Guardar objeto en bbdd
    try {
        let followStored = await userToFollow.save();
        
        return res.status(200).send({
            status: "success",
            identity: req.user,
            follow: followStored
        })
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "no se ha podido seguir al usuario"
        })
        
    }

        
        
        
    

};

// Accion de borrar un follow (accion dejar de seguir)
const unfollow = async (req, res) => {
    // Recoger el usuario identificado
    const userId = req.user.id;

    // REcoger el id del usuario que sigo y quiero dejar de seguir
    const followedId = req.params.id;

    try {
        // Find de las coincidencias y hacer un remove
        const deletedFollow = await Follow.find({
            "user": userId,
            "followed": followedId
        }).deleteOne()
    
        return res.status(200).send({
            status: "success",
            message: "follow eliminado correctamente"
        })
        
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "no se ha podido dejar de seguir al usuario"
        })
    }
}

// Accion listado de usuarios que cualquier usuario esta siguiendo
const following = async (req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega id por parametro en url
    if(req.params.id) userId = req.params.id;

    // Comprobar si me llega la pagina, si no la pagina 1
    let page = 1;
    if (req.params.page) page = req.params.page;

    // Usuarios por pagina quiero mostrar
    const itemsPerPage = 3;

    try {
        // Find a follow, popular los datos de los usuarios y paginar con mongoose pagination
        const follows = await Follow.find({user: userId}).populate("user followed", "-password -role -email -__v").paginate(page, itemsPerPage).exec()
                    
    // Conteo de usuarios
    let totalfollowings = await Follow.countDocuments({user: req.user.id}).exec();

        // Listado de usuarios de annia, y yo soy camilo
        // Sacar un array de los ids de lo usuarios que me sigen y los que sigo como camilo
        let followUserIds = await followService.followUserIds(req.user.id);

        return res.status(200).send({
            status: "success",
            message: "Listado de usuarios que estoy siguiendo",
            usuario: req.user.name,
            follows,
            user_following: followUserIds.following,
            user_follow_me: followUserIds.followers,
            totalfollowings
        })
        
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "no se ha podido listar los seguidores"
        })
    }
}

// Accion listado de usuarios que siguen a cualquier usuario
const followers = async (req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega id por parametro en url
    if(req.params.id) userId = req.params.id;

    // Comprobar si me llega la pagina, si no la pagina 1
    let page = 1;
    if (req.params.page) page = req.params.page;

    // Usuarios por pagina quiero mostrar
    const itemsPerPage = 3;
    try {
        const followers = await Follow.find({followed: userId}).populate("user", "-password -email -role -__v").paginate(page, itemsPerPage).exec()
                    
    // Conteo de usuarios
    let totalfollowers = await Follow.countDocuments({followed: req.user.id}).exec();

        // Listado de usuarios de annia, y yo soy camilo
        // Sacar un array de los ids de lo usuarios que me sigen y los que sigo como camilo
        let followUserIds = await followService.followUserIds(req.user.id);

        return res.status(200).send({
            status: "success",
            usuario: req.user.name,
            message: "Listado de usuarios que me siguen",
            followers,
            totalfollowers,
            user_following: followUserIds.following,
            user_follow_me: followUserIds.followers
        })
        
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Ha ocurrido algun error"
        })
    }

}

// Exportar acciones
module.exports = {
    pruebaFollow,
    save,
    unfollow,
    following,
    followers
}
