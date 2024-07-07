// Importar modulos
const fs = require("fs");
const path = require("path");

// Importar modelos
const Publication = require("../models/publication");

// Importar servicios
const followService = require("../services/followService");

// Acciones de prueba
const pruebaPublication = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/publication.js",
  });
};

// Guardar publicaciones
const save = async (req, res) => {
  // REcoger los datos del body
  const params = req.body;

  // Si no me llegan dar respuesta negativa
  if (!params.text)
    return res
      .status(400)
      .send({ status: "error", message: "Debes de mandar algun texto" });

  // Crear y rellenar el objeto del modelo
  let newPublication = new Publication(params);
  newPublication.user = req.user.id;

  try {
    // Guardar objeto en bbdd
    const publicationStored = await newPublication.save();

    return res.status(200).send({
      status: "success",
      message: "Publicacion guardada",
      publicationStored,
    });
  } catch (error) {
    return res
      .status(400)
      .send({ status: "error", message: "No se ha guardado la publicacion" });
  }
};

// Sacar una publicacion en concreto
const detail = async (req, res) => {
  // Sacar el id de publicacion de la url
  const publicationId = req.params.id;

  // Find con la id de la url
  try {
    const publicationStored = await Publication.findById(publicationId); //aqui me trabe porque se me olvido el "await"

    // Devolver respuesta
    return res.status(200).send({
      status: "success",
      message: "Mostrando publicacion",
      publication: publicationStored,
    });
  } catch (error) {
    return res.status(404).send({
      status: "error",
      message: "Publicacion no encontrada",
    });
  }
};

// Eliminar publicaciones
const deletePubltn = async (req, res) => {
  // Sacar el id de publicacion de la url
  const publicationId = req.params.id;

  // Find con la id de la url
  try {
    const publicationStored = await Publication.findById(publicationId);

    if (publicationStored.user == req.user.id) {
      // Eliminar la publicacion si soy quien la subió
      const publicationDeleted = await Publication.findByIdAndDelete(
        publicationId
      );

      // Devolver respuesta
      return res.status(200).send({
        status: "success",
        message: `Publicacion ${publicationId} eliminada`,
      });
    } else {
      return res.status(404).send({
        status: "error",
        message: "No tienes permisos para eliminar esta publicacion",
      });
    }
  } catch (error) {
    return res.status(404).send({
      status: "error",
      message: "Publicacion no encontrada",
    });
  }
};

// Listar publicaciones de un usuario en concreto
const user = async (req, res) => {
  // Sacar el id de usuario
  const userId = req.params.id;

  // Controlar la pagina
  let page = 1;

  if (req.params.page) page = req.params.page;

  const itemsPerPage = 5;

  try {
    // Find, populate, ordenar, paginar
    const publications = await Publication.find({ user: userId })
      .sort("-created_at")
      .populate("user", "-_id -password -role -__v -email")
      .paginate(page, itemsPerPage);

    // Conteo de publicaciones
    let total = await Publication.countDocuments({ user: req.user.id }).exec();

    if (total < 1) {
      return res.status(404).send({
        status: "error",
        message: "Este usuario no tiene publicaciones",
      });
    }
    // Devolver respuesta

    return res.status(200).send({
      status: "success",
      message: "Publicaciones de: " + req.user.name,
      page,
      total,
      pages: Math.ceil(total / itemsPerPage),
      publications,
    });
  } catch (error) {
    return res.status(404).send({
      status: "error",
      message: "No hay publicaciones para mostrar",
    });
  }
};

// Subir ficheros
const upload = async (req, res) => {
  // Sacar la id de la publicacion
  const publicationId = req.params.id;

  // Recoger el fichero de imagen y comprobar que existe
  if (!req.file) {
    return res.status(404).send({
      status: "error",
      message: "Peticion no incluye la imagen",
    });
  }

  // Conseguir el nombre del archivo
  let image = req.file.originalname;

  // Sacar la extension del archivo
  const imageSplit = image.split(".");
  const extension = imageSplit[1];

  // Comprobar extension
  if (
    extension != "png" &&
    extension != "jpg" &&
    extension != "jpeg" &&
    extension != "gif"
  ) {
    // Si no es correcto, borrar archivo
    // Eliminar archivo
    const filePath = req.file.path;
    const deletedFile = fs.unlinkSync(filePath);
    // Devolver respuesta negativa
    return res.status(400).send({
      status: "error",
      message: "Extension del archivo invalido",
    });
  }

  // Si si es correcta, guardar en la bbdd
  try {
    let publicationUpdated = await Publication.findByIdAndUpdate(
      { user: req.user.id, _id: publicationId },
      { file: req.file.filename },
      { new: true }
    );
    return res.status(200).send({
      status: "Success",
      message: "accion de subir una imagen o avatar",
      publication: publicationUpdated,
      file: req.file,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se ha podido subir la imagen",
    });
  }
};

// DEvolver archivos multimedia
const media = (req, res) => {
  // Sacar el parametro de la url
  const file = req.params.file; //este file es el que le hemos definido en la ruta

  // Montar el path de la imagen
  const filePath = "./uploads/publications/" + file;

  // Comprobar que existe
  fs.stat(filePath, (error, exists) => {
    if (!exists) {
      return res.status(404).send({
        status: "error",
        message: "No existe la imagen",
      });
    }
    // Devolver un file

    return res.sendFile(path.resolve(filePath));
  });
};

// Listar todas las publicaciones (de usuarios que sigo) FEED
const feed = async (req, res) => {
  // Sacar la pagina actual
  let page = 1;
  if (req.params.page) page = req.params.page;

  // Establecer numero de elementos por paginas
  let itemsPerPage = 5;

  try {
    // Sacar array de identificadores de usuarios que yo sigo como user identificado
    const myFollows = await followService.followUserIds(req.user.id);

    // Find a publicaciones usando operador IN, ordenar, popular y paginar
    const publications = await Publication.find({
      user: myFollows.following,
    }).populate("user", "-_id -password -role -__v -email")
      .sort("-created_at")
      .paginate(page, itemsPerPage);

    // Sacar el total de publicaciones
    let total = await Publication.countDocuments({user: myFollows.following}).exec();

    return res.status(200).send({
      status: "success",
      message: "Feed de publicaciones",
      followings: myFollows.following,
      publications,
      total,
      page,
      pages: Math.ceil(total/itemsPerPage)
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "No se han listado las publicaciones del FEED",
    });
  }
};

// Exportar acciones
module.exports = {
  pruebaPublication,
  save,
  detail,
  deletePubltn,
  user,
  upload,
  media,
  feed,
};
