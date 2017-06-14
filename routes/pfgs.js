var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside

    // INDEX: mostrar PFGs 
    router.get("/", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        // sólo tiene acceso el alumno
        // Tiene asignado un PFG?

        var selectQuery="SELECT p.*, u1.nombre AS a_n,u1.apellidos AS a_a,u2.nombre AS t_n,u2.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs AS p, usuarios AS u1, usuarios AS u2 "+
                        "WHERE (p.alumno=u1.idusuarios) AND (p.tutor=u2.idusuarios) AND curso LIKE ? "+
                        "UNION SELECT p.*,'','',u.nombre as t_n,u.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs as p, usuarios as u "+
                        "WHERE alumno IS NULL AND (p.tutor=u.idusuarios) AND curso LIKE ? ORDER BY idpfg";
        db.pool.query(selectQuery, [req.user.idcurso,req.user.idcurso], function(err, pfgs, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            res.render("pfgs/index", {pfgs: pfgs, page: 'pfgs'});
        });
    }); 

    
    // Mostrar formulario de nuevo pfg
    router.get("/nuevo", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        /*
        nuevo pfg
        comprobar permisos
        info de alumnos para elegir cual asignar
            alumnos que no tienen proyectos asignados este curso o que no tienen pfgs de otros cursos aprobados
            si no asigna se pone codigo de propuesto COMPROBAR QUE NO ESTA REPETIDO
        info de profesores para elegir el tutor obligatorio
            OBLIGATORIO
        info de rubricas para elegir una de ellas 
            OBLIGATORIO
            SI NO HAY COMPLETAS, NO SE PUEDE ASIGNAR
        */

        // alumnos que no tienen proyectos asignados este curso o que no tienen pfgs de otros cursos aprobados
        var selectQuery="SELECT * FROM usuarios AS u "+
                        "WHERE u.rol=0 AND u.admin=0 AND u.idusuarios NOT IN "+
                        "(SELECT p.alumno FROM pfgs AS p "+
                        "WHERE (p.alumno IS NOT NULL AND p.curso LIKE ?) OR (p.curso NOT LIKE ? AND p.notafinal >= 5))"
        db.pool.query(selectQuery, [req.user.idcurso,req.user.idcurso], function(err, alums, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            if (alums.length<=0){
                // sin alumnos
                req.flash("error", mensajes.no_alumnos);
                res.redirect('/');
            } else {
                // profesores
                db.pool.query("SELECT * FROM usuarios WHERE admin = 0 AND rol = 1", function(err, profs, fields) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    if (profs.length<=0){
                        // sin profesores
                        req.flash("error", mensajes.no_profesores);
                        res.redirect('/');
                    } else {
                        // plantillas de rubricas completas
                        db.pool.query("SELECT * FROM rubricas WHERE completa = 1 AND es_plantilla = 1", function(err, rubs, fields) {
                            if(err){ // Control del error
                                console.log('SQL Connection error: ', err);
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };
                            if (rubs.length<=0){
                                // sin rubricas
                                req.flash("error", mensajes.no_prubricas);
                                res.redirect('/');
                            } else {
                                res.render("pfgs/nuevo", {alums: alums, profs: profs, rubs: rubs, page: 'pfgs'});
                            }
                        });
                    }
                });
            };
        })
    });

    // Mostrar información de pfg
    router.get("/:id", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        var selectQuery="SELECT p.*, u1.nombre AS a_n,u1.apellidos AS a_a,u2.nombre AS t_n,u2.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs AS p, usuarios AS u1, usuarios AS u2 "+
                        "WHERE p.idpfg = ? AND (p.alumno=u1.idusuarios) AND (p.tutor=u2.idusuarios) AND curso LIKE ? "+
                        "UNION SELECT p.*,'','',u.nombre as t_n,u.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs as p, usuarios as u "+
                        "WHERE p.idpfg = ? AND alumno IS NULL AND (p.tutor=u.idusuarios) AND curso LIKE ?"
        db.pool.query(selectQuery, [req.params.id,req.user.idcurso,req.params.id,req.user.idcurso], function(err, pfgs, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            selectQuery="SELECT t.*, u.nombre AS u_n, u.apellidos AS u_a FROM tribunales AS t, usuarios AS u "+
                        "WHERE t.idprofesor = u.idusuarios AND t.idpfg=? AND t.curso=? ORDER BY t.idprofesor";
            db.pool.query(selectQuery,[req.params.id,req.user.idcurso], function(err, trib, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                res.render("pfgs/show", {pfgs: pfgs[0], trib: trib, page: 'pfgs'}); 
            });

            
        });
    });

    // ALTA DE PFG
    router.post("/", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res, next){
        // comprobar que no hay códigos de pfgs propuestos repetidos

        if (req.body.propuesto){
            db.pool.query("SELECT * FROM pfgs WHERE codigo_prop = ? AND curso = ?",[req.body.propuesto,req.user.idcurso], function(err, prop, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                if (prop.length) {
                    req.flash("error", mensajes.cod_prop_repe);
                    res.redirect('back');
                } else
                    next();
            });
        } else {
            next();
        };
    }, function(req, res){
        /*
        nuevo pfg - titulo - descripcion - propuesto - alumno (no_asignado) - tutor - rubrica
        comprobar permisos
        info de alumnos para elegir cual asignar
            alumnos que no tienen proyectos asignados este curso o que no tienen pfgs de otros cursos aprobados
            si no asigna se pone codigo de propuesto COMPROBAR QUE NO ESTA REPETIDO
        info de profesores para elegir el tutor obligatorio
            OBLIGATORIO
        info de rubricas para elegir una de ellas 
            OBLIGATORIO
            SI NO HAY COMPLETAS, NO SE PUED
        */
        /*
         "INSERT INTO rubricas (titulo, descripcion, es_plantilla, completa) VALUES (?,?,1,1)";
        */

        // copia de rúbrica

        var insertQuery = "";

        // Crear nueva rubrica completa a partir de la plantilla
        // crear la rúbrica 
        insertQuery="INSERT INTO rubricas (SELECT null, titulo, descripcion, es_plantilla=0, completa FROM rubricas WHERE idrubrica = ?)"
        db.pool.query(insertQuery,[req.body.rubrica], function(err, rows) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            var id_nueva_rubrica = rows.insertId;
            // Crear sus preguntas

            // Obtengo las preguntas de la bbdd
            db.pool.query("SELECT descripcion, peso FROM preguntas WHERE idrubrica = ?",[req.body.rubrica], function(err, rows) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                var vals = []; // vector para los valores a insertar

                var i = 0;
                while (rows[i]){
                    vals[i]=[rows[i].descripcion,rows[i].peso,id_nueva_rubrica];
                    i++;
                };
                
                insertQuery="INSERT INTO preguntas (descripcion, peso, idrubrica) VALUES ?"
                db.pool.query(insertQuery,[vals], function(err, rows) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };

                    db.pool.query("SELECT MAX(idsecciones) AS m FROM secciones", function(err, rows) {
                        if(err){ // Control del error
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        var m = rows[0].m;
                        console.log("m: "+m);

                        // Obtengo las secciones de la bbdd
                        db.pool.query("SELECT * FROM secciones WHERE idrubrica = ? ORDER BY idsecciones",[req.body.rubrica], function(err, rows) {
                            if(err){ // Control del error
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };


                            var aux=m-parseInt(rows[0].idsecciones)+1;

                            var lista = [];
                            var i = 0;
                            while (rows[i]){
                                lista[i]=[rows[i].idsecciones,id_nueva_rubrica,rows[i].descripcion,rows[i].peso,rows[i].evaluacion,rows[i].padre,rows[i].es_criterio,rows[i].nivel];
                                console.log(i +" :: "+JSON.stringify(lista[i]));
                                i++;
                            };                            

                            console.log("m: "+m+" :: lista[0]: "+lista[0]+" :: aux: "+aux);
                            i = 0;
                            while (lista[i]){
                                lista[i][0]=lista[i][0] + aux;
                                console.log(lista[i][5]);
                                if (lista[i][5]) lista[i][5]=lista[i][5] + aux;
                                console.log(i +" :: "+JSON.stringify(lista[i]));
                                i++;
                            };
                            

                            insertQuery="INSERT INTO secciones (idsecciones, idrubrica, descripcion, peso, evaluacion, padre, es_criterio, nivel) VALUES ?"
                            db.pool.query(insertQuery,[lista], function(err, rows) {
                                if(err){ // Control del error
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                }

                                
                                var nuevoPfg = 
                                    {
                                        titulo:      req.body.titulo,
                                        descripcion: req.body.descripcion,
                                        tutor:       req.body.tutor,
                                        curso:       req.user.idcurso,
                                        idrubrica:   id_nueva_rubrica
                                    }
                                ;
                                if (req.body.alumno=='no_asignado') {
                                    nuevoPfg.alumno=null;
                                } else {
                                    nuevoPfg.alumno=req.body.alumno;
                                };
                                // req.body.alumno=='no_asignado' ? nuevoPfg.alumno=null : nuevoPfg.alumno=req.body.alumno;
                                
                                if (req.body.propuesto) {
                                    nuevoPfg.codigo_prop=req.body.propuesto;
                                } else {
                                    nuevoPfg.codigo_prop=null;
                                };
                                //!req.body.codigo_prop ? nuevoPfg.codigo_prop=null : nuevoPfg.codigo_prop=req.body.codigo_prop;
                                
                                // crear PFG
                                //insertQuery="INSERT INTO pfgs (titulo, descripcion, tutor, curso, idrubrica, alumno, codigo_prop) VALUES ?"
                                insertQuery="INSERT INTO pfgs SET ?"
                                db.pool.query(insertQuery,nuevoPfg, function(err, rows) {
                                    if(err){ // Control del error
                                        console.log('SQL Connection error: ', err);
                                        req.flash("error", mensajes.error_db);
                                        res.redirect('/');
                                    }
                                    req.flash("success", mensajes.alta_pfg);
                                    res.redirect('/pfgs');
                                });
                            });

                        });
                    });

                });
            });
        });
    });

    // Mostrar formulario para editar el pfg
    router.get("/:id/edit", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        var selectQuery="SELECT p.*, u1.nombre AS a_n,u1.apellidos AS a_a,u2.nombre AS t_n,u2.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs AS p, usuarios AS u1, usuarios AS u2 "+
                        "WHERE p.idpfg = ? AND (p.alumno=u1.idusuarios) AND (p.tutor=u2.idusuarios) AND curso LIKE ? "+
                        "UNION SELECT p.*,'','',u.nombre as t_n,u.apellidos AS t_a, "+
                        "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                        "FROM pfgs as p, usuarios as u "+
                        "WHERE p.idpfg = ? AND alumno IS NULL AND (p.tutor=u.idusuarios) AND curso LIKE ?"
        db.pool.query(selectQuery, [req.params.id,req.user.idcurso,req.params.id,req.user.idcurso], function(err, pfg, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            // alumnos que no tienen proyectos asignados este curso o que no tienen pfgs de otros cursos aprobados
            var selectQuery="SELECT * FROM usuarios AS u "+
                            "WHERE u.rol=0 AND u.admin=0 AND u.idusuarios NOT IN "+
                            "(SELECT p.alumno FROM pfgs AS p "+
                            "WHERE (p.alumno IS NOT NULL AND p.curso LIKE ?) OR (p.curso NOT LIKE ? AND p.notafinal >= 5))"
            db.pool.query(selectQuery, [req.user.idcurso,req.user.idcurso], function(err, alums, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                if (alums.length<=0){
                    // sin alumnos
                    req.flash("error", mensajes.no_alumnos);
                    res.redirect('/');
                } else {
                    // profesores
                    db.pool.query("SELECT * FROM usuarios WHERE admin = 0 AND rol = 1", function(err, profs, fields) {
                        if(err){ // Control del error
                            console.log('SQL Connection error: ', err);
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        if (profs.length<=0){
                            // sin profesores
                            req.flash("error", mensajes.no_profesores);
                            res.redirect('/');
                        } else {
                            // plantillas de rubricas completas
                            db.pool.query("SELECT * FROM rubricas WHERE completa = 1 AND es_plantilla = 1", function(err, rubs, fields) {
                                if(err){ // Control del error
                                    console.log('SQL Connection error: ', err);
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                };
                                if (rubs.length<=0){
                                    // sin rubricas
                                    req.flash("error", mensajes.no_prubricas);
                                    res.redirect('/');
                                } else {
                                    res.render("pfgs/edit", {pfg: pfg[0], alums: alums, profs: profs, rubs: rubs, page: 'pfgs'});
                                };
                            });
                        };
                    });
                };
            });
        });
    });


    //ACTUALIZAR PFG
    router.put("/:id", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res, next){
        // comprobar que el código de pfg propuesto si existe no está repetido
        if (req.body.propuesto){
            db.pool.query("SELECT * FROM pfgs WHERE codigo_prop = ? AND curso = ?",[req.body.propuesto,req.user.idcurso], function(err, prop, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                if (prop.length>1) {
                    req.flash("error", mensajes.cod_prop_repe);
                    res.redirect('back');
                } else {
                    // comprobar que no hay selecciones por parte de otros alumnos de ese pfg con ese código de pfg propuesto
                    db.pool.query("SELECT * FROM seleccion_pfgs WHERE idpfg=?",[req.params.id], function(err, sel, fields) {
                        if(err){ // Control del error
                            console.log('SQL Connection error: ', err);
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        if (sel.length>0) {
                            // hay seleciones: indicarlo
                            req.flash("error", mensajes.pfg_con_selecciones);
                            res.redirect('back');
                        }else{
                            // no hay hay seleciones: seguir
                            next();////
                        };
                    });
                }
            });
        } else {
            next();
        };
    }, function(req, res, next){
        /*
        titulo descripcion propuesto alumno - no_modificar no_asignado idusuarios - tutor  rubrica
        */
        
        // Modificar pfg sin modificar rubrica
        nuevoPfg = {  
            titulo:      req.body.titulo,
            descripcion: req.body.descripcion,
            curso:       req.user.idcurso
        };
        if (req.body.alumno!='no_modificar')
            req.body.alumno=='no_asignado' ? nuevoPfg.alumno=null : nuevoPfg.alumno=req.body.alumno;
        if (req.body.tutor!='no_modificar')
            req.body.tutor=='no_asignado' ? nuevoPfg.tutor=null : nuevoPfg.tutor=req.body.tutor;       
        req.body.propuesto ? nuevoPfg.codigo_prop=req.body.propuesto : nuevoPfg.codigo_prop=null;

        if (req.body.rubrica=='no_modificar') {
            // no se modifica la rubrica
            // Modificar datos:
            updateQuery="UPDATE pfgs SET ? WHERE idpfg = ?"
            db.pool.query(updateQuery,[nuevoPfg,req.params.id], function(err, rows) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                }
                req.flash("success", mensajes.modificar_pfg);
                res.redirect('/pfgs/');
            });
        } else {
            // modificar rubrica del pfg
            req.nuevoPfg=nuevoPfg;
            next();
        }  
    }, function(req, res, next){
        // modificar rubrica del pfg
        // 1º borrar rubrica ya asignada
        db.pool.query("SELECT * FROM pfgs WHERE idpfg = ? AND curso = ?",[req.params.id,req.user.idcurso], function(err, pfg, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            console.log("rb "+ pfg[0].idrubrica)
            db.pool.query("DELETE FROM rubricas WHERE idrubrica = ?",[pfg[0].idrubrica], function(err, pfg, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                next();
            });
        });
    }, function(req, res, next){
        // modificar rubrica del pfg
        // 2º crear rubrica desde plantilla
        var insertQuery = "";

        // Crear nueva rubrica completa a partir de la plantilla
        // crear la rúbrica 
        insertQuery="INSERT INTO rubricas (SELECT null, titulo, descripcion, es_plantilla=0, completa FROM rubricas WHERE idrubrica = ?)"
        db.pool.query(insertQuery,[req.body.rubrica], function(err, rows) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            var id_nueva_rubrica = rows.insertId;
            // Crear sus preguntas

            // Obtengo las preguntas de la bbdd
            db.pool.query("SELECT descripcion, peso FROM preguntas WHERE idrubrica = ?",[req.body.rubrica], function(err, rows) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                var vals = []; // vector para los valores a insertar

                var i = 0;
                while (rows[i]){
                    vals[i]=[rows[i].descripcion,rows[i].peso,id_nueva_rubrica];
                    i++;
                };
                
                insertQuery="INSERT INTO preguntas (descripcion, peso, idrubrica) VALUES ?"
                db.pool.query(insertQuery,[vals], function(err, rows) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };

                    db.pool.query("SELECT MAX(idsecciones) AS m FROM secciones", function(err, rows) {
                        if(err){ // Control del error
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        var m = rows[0].m;
                        console.log("m: "+m);

                        // Obtengo las secciones de la bbdd
                        db.pool.query("SELECT * FROM secciones WHERE idrubrica = ? ORDER BY idsecciones",[req.body.rubrica], function(err, rows) {
                            if(err){ // Control del error
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };

                            // Cambiar los identificadores así como los id padres manteniendo su integridad
                            // para añadirlos al final del último de la base de datos 

                            var aux=m-parseInt(rows[0].idsecciones)+1;

                            var lista = [];
                            var i = 0;
                            while (rows[i]){
                                lista[i]=[rows[i].idsecciones,id_nueva_rubrica,rows[i].descripcion,rows[i].peso,rows[i].evaluacion,rows[i].padre,rows[i].es_criterio,rows[i].nivel];
                                //console.log(i +" :: "+JSON.stringify(lista[i]));
                                i++;
                            };                            

                            console.log("m: "+m+" :: lista[0]: "+lista[0]+" :: aux: "+aux);
                            i = 0;
                            while (lista[i]){
                                lista[i][0]=lista[i][0] + aux;
                                //console.log(lista[i][5]);
                                if (lista[i][5]) lista[i][5]=lista[i][5] + aux;
                                //console.log(i +" :: "+JSON.stringify(lista[i]));
                                i++;
                            };
                            
                            // añadir secciones
                            insertQuery="INSERT INTO secciones (idsecciones, idrubrica, descripcion, peso, evaluacion, padre, es_criterio, nivel) VALUES ?"
                            db.pool.query(insertQuery,[lista], function(err, rows) {
                                if(err){ // Control del error
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                }
                                console.log("inser secciones");
                                // editar PFG
                                req.nuevoPfg.idrubrica=id_nueva_rubrica;
                                console.log("req.nuevoPfg : "+JSON.stringify(req.nuevoPfg));
                                updateQuery="UPDATE pfgs SET ? WHERE idpfg = ?"
                                db.pool.query(updateQuery,[req.nuevoPfg,req.params.id], function(err, rows) {
                                    if(err){ // Control del error
                                        console.log('SQL Connection error: ', err);
                                        req.flash("error", mensajes.error_db);
                                        res.redirect('/');
                                    } else {
                                        console.log("end");
                                        req.flash("success", mensajes.modificar_pfg);
                                        res.redirect('/pfgs/');
                                        console.log("fin");
                                    }
                                });

                            });

                        });
                    });

                });
            });
        });
    });

    router.delete("/:id", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res, next){
        db.pool.query("SELECT * FROM pfgs WHERE idpfg = ? AND curso = ?",[req.params.id,req.user.idcurso], function(err, pfg, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            req.idrubrica=pfg[0].idrubrica;

            if (pfg[0].idrubrica){
                db.pool.query("DELETE FROM rubricas WHERE idrubrica = ?",[pfg[0].idrubrica], function(err, rub, fields) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    next();
                });
            } else
                next();
        });
    }, function(req, res, next){
        db.pool.query("DELETE FROM pfgs WHERE idpfg = ?",[req.params.id], function(err, pfg, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            } else {
                console.log("end");
                req.flash("success", mensajes.pfg_borrado);
                res.redirect('/pfgs/');
                console.log("fin");
            }
        });
    });




//res.send(JSON.stringify());
//console.log(" : "+JSON.stringify());

    return router;
}