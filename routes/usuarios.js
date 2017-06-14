var express  = require('express');
var passport = require('passport');
var bcrypt   = require('bcrypt-nodejs');
var mensajes = require('../server/mensajes');

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside

    // INDEX: mostrar todos los usuarios
    router.get("/", middleware.isLoggedIn, function(req, res){
        if(req.user.admin){ // Administrador
            db.pool.query("SELECT * FROM usuarios", function(err, rows, fields) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                res.render("usuarios/index", {usuarios: rows, page: 'usuarios'});
            });
        } else {
            // Resto de usuarios
            db.pool.query("SELECT * FROM usuarios WHERE id=?", [req.user.id], function(err, rows, fields) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                console.log("dime algo: " + JSON.stringify(rows))
                res.render("usuarios/show", {usuario: rows[0], page: 'usuarios'});
            });
        };
    });

    // CREATE: crear un usuario con opción a que sea admin, alumno, profesor, comisión, tribunal
    router.post("/", middleware.isLoggedIn, function(req, res){
        var adm = 0;
        var rol = 0;
        if (req.body.rol===2) admin=1 // Es administrador
        else if (req.body.rol===1) rol=1 // Es profesor
        else rol=0; // Es alumno

        // var nuevoUsuario = {
        //     dni:        req.body.dni,
        //     nombre:     req.body.nombre,
        //     apellidos:  req.body.apellidos,
        //     expediente: req.body.expediente,
        //     email:      req.body.email,
        //     rol: 0,
        //     admin: adm
        // };

        db.pool.query("SELECT * FROM usuarios WHERE dni = ?",[username], function(err, rows) {
            if (err){
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length) {
                req.flash("error", mensajes.dni_repetido);
                res.redirect('/usuarios');
            } else {
                // No existe usuario con ese DNI
                
                var adm = 0;
                var rol = 0;
                if (req.body.rol===2) admin=1 // Es administrador
                else if (req.body.rol===1) rol=1 // Es profesor
                else rol=0; // Es alumno

                var nuevoUsuario = {
                    dni:        req.body.dni,
                    nombre:     req.body.nombre,
                    apellidos:  req.body.apellidos,
                    expediente: req.body.expediente,
                    email:      req.body.email,
                    rol: 0,
                    admin: 0,
                    password: bcrypt.hashSync(password, null, null)
                };

                // // Averiguar el curso actual. Incorporarlo a la información de usuario para la sesión
                // db.pool.query("SELECT idcurso FROM cursos WHERE es_actual like 1", function(err, rows, fields) {
                //     if(err) {
                        
                //         req.flash("error", mensajes.error_db);
                //         res.redirect('/');
                //     };

                nuevoUsuario.idcurso = rows[0].idcurso;

                var insertQuery = "INSERT INTO usuarios (dni, nombre, apellidos, expediente, email, rol, admin, password) values (?,?,?,?,?,?,?,?)";

                db.pool.query(insertQuery, [
                        nuevoUsuario.dni, 
                        nuevoUsuario.nombre, 
                        nuevoUsuario.apellidos, 
                        nuevoUsuario.expediente, 
                        nuevoUsuario.email, 
                        nuevoUsuario.rol, 
                        nuevoUsuario.admin,
                        nuevoUsuario.password
                    ],function(err, rows) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    nuevoUsuario.idusuarios = rows.insertId;

                    req.flash("success", "Usuario con DNI: " + nuevoUsuario.dni + " dado de alta con éxito.")
                    res.redirect("/usuarios");
                });
                // })
            }
        });

    });

    // NEW: mostrar formulario para crear el usuario
    router.get("/nuevo", middleware.isLoggedIn, function(req, res){
       res.render("usuarios/nuevo", {page: 'usuarios'});
    });

    // SHOW: muestra información de un usuario 
    router.get("/:id", middleware.isLoggedIn, function(req, res){

        // Obtener el usuario mediante id
        db.pool.query("SELECT * FROM usuarios WHERE idusuarios = ?",[req.params.id], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            
            if (usu.length < 1){
                res.redirect('/');
            } else if (usu[0].admin){ // admin
                res.render("usuarios/show", {usuario: usu[0], page: 'usuarios'});
            } else if (usu[0].rol){ // Es profesor
                // Comprobar si es tutor de ninguno, uno o varios proyectos
                db.pool.query("SELECT * FROM pfgs WHERE tutor = ? AND alumno IS NOT NULL AND curso = ?",
                    [usu[0].idusuarios, req.user.idcurso], function(err, tut) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    // Comprobar si pertenece a comision
                    db.pool.query("SELECT * FROM comisiones WHERE idprofesor = ? AND curso = ?",
                        [usu[0].idusuarios, req.user.idcurso], function(err, com) {
                        if(err){ // Control del error
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };

                        // Comprobar si pertenece a un tribunal
                        var tribunalQuery = "SELECT * FROM tribunales AS T, pfgs AS P WHERE T.idprofesor = ? AND T.curso = ? AND P.curso = ? AND T.idpfg = P.idpfg";
                        db.pool.query(tribunalQuery,
                            [
                                usu[0].idusuarios,
                                req.user.idcurso,
                                req.user.idcurso
                            ], function(err, trib) {
                            if(err){ // Control del error
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };
                            res.render("usuarios/show", {usuario: usu[0], tutor_pfgs: tut, comision:com[0], tribunales: trib, page: 'usuarios'});
                        });
                    });
                });
            } else {// alumno
                // Comprobar si tiene pfg asignado
                db.pool.query("SELECT * FROM pfgs WHERE alumno = ? AND curso = ?",
                    [usu[0].idusuarios, req.user.idcurso], function(err, pfgs) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    // Comprobar si tiene pfgs propuestos
                    db.pool.query("SELECT p.titulo, s.preferencia FROM pfgs AS p, seleccion_pfgs as s WHERE s.alumno = ? AND s.curso = ? AND p.idpfg = s.idpfg ORDER BY s.preferencia",
                        [usu[0].idusuarios, req.user.idcurso], function(err, props) {
                        if(err){ // Control del error
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        res.render("usuarios/show", {usuario: usu[0], pfg_u: pfgs[0], pfgs_prop: props, page: 'usuarios'});
                    });
                });
            };
        });
    }); // show

    // Mostrar formulario para editar
    router.get("/:id/edit", middleware.isLoggedIn, function(req, res){

        db.pool.query("SELECT * FROM usuarios WHERE idusuarios = ?",[req.params.id], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            res.render("usuarios/edit", {usuario: usu[0], page: 'usuarios'});
        });
        
    });

    // Actualizar información de usuario
    router.put("/:id", middleware.isLoggedIn, function(req, res, next){
        // Comprobar dni no repetido y los roles antiguos 
        db.pool.query("SELECT * FROM usuarios WHERE idusuarios = ? OR dni = ?",[req.params.id, req.body.dni], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            //console.log("length : " + JSON.stringify(usu.length));
            if (usu.length > 1) {
                req.flash("error", mensajes.dni_repetido);
                res.redirect('/usuarios');
            } else {
                res.old_rol=usu[0].rol;
                res.old_admin=usu[0].admin;
                next();
            }
        });
    }, function(req, res, next){
        // Comprobar si tiene asignado proyecto como tutor o como alumno
        db.pool.query("SELECT * FROM pfgs WHERE (tutor = ? OR alumno = ?) AND curso LIKE ?",
            [req.params.id, req.params.id, req.user.idcurso], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length && res.old_rol && (req.body.rol != 1)) {
                // Profesor: Tutoriza proyectos y cambia de rol
                req.flash('error', mensajes.profesor_tutoriza);
                res.redirect('back');
            } else if (rows.length && !res.old_rol && (req.body.rol != 0)) {
                // Alumno: Tiene un proyecto y cambia de rol
                req.flash('error', mensajes.alumno_tiene_pfg);
                res.redirect('back');
            } else {
                next();
            }
        });
    }, function(req, res, next){
        // Comprobar si pertenece a comisión
        db.pool.query("SELECT * FROM comisiones WHERE idprofesor = ? AND curso LIKE ?",
            [req.params.id, req.user.idcurso], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length && res.old_rol && (req.body.rol != 1)) {
                // Pertenece a comisión y cambia de rol
                req.flash('error', mensajes.pertenece_comision);
                res.redirect('back');
            } else {
                next();
            }
        });
    }, function(req, res, next){
        // Comprobar si pertenece a tribunal
        db.pool.query("SELECT * FROM tribunales WHERE idprofesor = ? AND curso LIKE ?",
            [req.params.id, req.user.idcurso], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length && res.old_rol && (req.body.rol != 1)) {
                // Pertenece a tribunal y cambia de rol
                req.flash('error', mensajes.pertenece_tribunal);
                res.redirect('back');
            } else {
                next();
            }
        });
    }, function(req, res, next){
        // Comprobar si tiene proyectos propuestos seleccionados
        db.pool.query("SELECT * FROM seleccion_pfgs WHERE alumno = ? AND curso LIKE ?",
            [req.params.id, req.user.idcurso], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length && !res.old_rol && (req.body.rol != 0)) {
                // Tiene pfgs propuestos seleccionados y cambia de rol
                req.flash('error', mensajes.alumno_tiene_pfg_prop_asignados);
                res.redirect('back');
            } else {
                next();
            }
        });
    }, function(req, res){
        if (!req.user.admin) { 
            if (req.params.id != req.user.idusuarios) {
                // Un usuario no admin intenta editar otro usuarios que no es el suyo
                req.flash('error', mensajes.no_permitido);
                res.redirect('/');
            }
        }
        var nuevoUsuario = [
            req.body.nombre,
            req.body.apellidos,
            req.body.dni,
            req.body.expediente,
            req.body.email
        ];
        var updateQuery="UPDATE usuarios SET nombre=?, apellidos=?, dni=?, expediente=?, email=?";

        var passwd_actualizada = false;
        if (req.body.password !== '') {
            if (req.body.password == req.body.confirmar_password) {
                updateQuery += ", password=?";
                nuevoUsuario.push(bcrypt.hashSync(req.body.password, null, null));
                passwd_actualizada = true;
            } else {
                req.flash("error", mensajes.password_distinta);
                res.redirect('back');
            }
        };
        nuevoUsuario.push(req.params.id);

        if (req.user.admin) { 
            // Usuario Aministrador
            if (req.body.rol == 0 ) { 
                // Es alumno
                updateQuery += ", rol=0, admin=0"
            } else if (req.body.rol == 1) { 
                // Es profesor
                updateQuery += ", rol=1, admin=0"
            } else { 
                // Admin
                updateQuery += ", rol=0, admin=1"
            } 
        };

        updateQuery += " WHERE idusuarios = ?";
        console.log(updateQuery);
        console.log(nuevoUsuario);

        console.log("usu: " + JSON.stringify(nuevoUsuario));
        db.pool.query(updateQuery, nuevoUsuario, function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            
            
            if (!req.user.admin && passwd_actualizada) {
                req.logout();
                req.flash('success', mensajes.logout_passwd_actualizada);
                res.redirect("/login");
            } else {
            req.flash('success', mensajes.usuario_actualizado);
            res.redirect('/');
            }
        });

    }); // -- Actualizar información de usuario

    // Actualizar información de usuario

    router.delete("/:id", middleware.isLoggedIn, function(req, res, next){
        // Comprobar si tiene asignado proyecto como tutor o como alumno en algún curso
        db.pool.query("SELECT * FROM pfgs WHERE (tutor = ? OR alumno = ?)",
            [req.params.id, req.params.id], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            
            if (rows.length) {
                // asignados pfgs
                console.log("asignados pfgs");
                req.flash('error', mensajes.usuario_tiene_pfg);
                res.redirect('back');
            } else { 
                console.log("no tiene asignados pfgs");
                // no tiene asignados pfgs
                next();
            }
        });
    }, function(req, res, next){
        // Comprobar si pertenece a comisión o  tibunal en algún curso
        db.pool.query("SELECT * FROM comisiones AS c, tribunales AS t WHERE c.idprofesor = ? OR t.idprofesor = ?",
            [req.params.id, req.params.id], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length) {
                // Pertenece a comisión y o a tribunal
                req.flash('error', mensajes.pertenece_comision_o_tribunal);
                res.redirect('back');
            } else {
                next();
            }
        });
    }, function(req, res){

        // si tiene seleccion de pfgs propuestos se borran en cascada
        db.pool.query('DELETE FROM usuarios WHERE idusuarios = ?', [req.params.id], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            req.flash('success', mensajes.usuario_borrado);
            res.redirect('/usuarios');
        });
    });


    return router;
}
