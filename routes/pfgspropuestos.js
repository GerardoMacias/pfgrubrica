var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside

    // INDEX: mostrar PFGs a seleccionar
    router.get("/seleccion", middleware.isLoggedIn, middleware.esAlumno, middleware.tienePfgAsignado, middleware.tienePfgsPropAsignado, function(req, res){
        // sólo tiene acceso el alumno
        db.pool.query("SELECT * FROM pfgs WHERE alumno = ? AND curso LIKE ?", 
            [req.user.idusuarios, req.user.idcurso], function(err, rows, fields) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            if (rows.length){ // Tiene asignado ya un proyecto este curso
                req.flash("error", mensajes.pfg_asignado); //failure
                res.redirect("/");
            };
            // Sin proyecto asignado
            // Comprobar que no tiene ya tres proyectos seleccionados
            db.pool.query("SELECT * FROM seleccion_pfgs WHERE alumno = ? AND curso LIKE ?",
                [req.user.idusuarios, req.user.idcurso], function(err, resultado, fields) { 
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                }; 
                if (resultado.length){ // Tiene ya una selección realizada de propuestas
                    req.flash("error", mensajes.pfgs_prop_repetidos); //failure
                    res.redirect("/");
                };
                // Sin selección previa de propuestas
                // Obtenemos los proyectos disponibles
                db.pool.query("SELECT * FROM pfgs WHERE codigo_prop IS NOT NULL AND alumno IS NULL AND curso LIKE ? ORDER BY codigo_prop", 
                    [req.user.idcurso], function(err, resultado, fields) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    }
                    // Mostrar los propuestos para ese año
                    res.render("pfgspropuestos/listado", {pfgs_p: resultado, page: 'pfgspropuestos'});
                });  
            });
        });
    }); 


    // Asignar al alumno los tres nuevos proyectos propuestos
    router.post("/seleccion", middleware.isLoggedIn, middleware.esAlumno,  function(req, res){
        // sólo tiene acceso el alumno
        if (req.body.sel_pr1 == "" || req.body.sel_pr2 == "" || req.body.sel_pr3 == ""){
            // volver y mostrar error: alguno no ha sido elegido
            req.flash("failure", pfgs_prop_min_tres);
            res.redirect("/pfgspropuestos/seleccion");
        } else if (req.body.sel_pr1 === req.body.sel_pr2 || req.body.sel_pr1 === req.body.sel_pr3 || req.body.sel_pr2 === req.body.sel_pr3 ){
            // algun proyecto de los tres es el mismo    
            req.flash("error", pfgs_prop_distintos);
            res.redirect("/pfgspropuestos/seleccion");
        } else {
            var insertQuery = "INSERT INTO seleccion_pfgs (alumno, idpfg, curso, preferencia) values (?,?,?,?), (?,?,?,?), (?,?,?,?)";
            
            db.pool.query(insertQuery, [
                    req.user.idusuarios, 
                    req.body.sel_pr1, 
                    req.user.idcurso, 
                    1,
                    req.user.idusuarios, 
                    req.body.sel_pr2, 
                    req.user.idcurso, 
                    2,
                    req.user.idusuarios, 
                    req.body.sel_pr3, 
                    req.user.idcurso, 
                    3,
                ],function(err, rows) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                req.flash("success", mensajes.pfgs_prop_asignados);
                res.redirect("/");
            });
        }
    });


    // mostrar PFGs a seleccionar
    router.get("/asignar", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        // Acceso Admin y Comision
        console.log("asd");
        selectQuery="SELECT s.*, u.nombre AS a_n, u.apellidos AS a_a, p.titulo, p.codigo_prop "+
                    "FROM seleccion_pfgs AS s, usuarios AS u, pfgs AS p "+
                    "WHERE s.curso LIKE ? AND s.alumno = u.idusuarios AND p.idpfg = s.idpfg "+
                    "ORDER BY idseleccion_pfgs;";
        db.pool.query(selectQuery,[req.user.idcurso], function(err, pfgs_p, fields) { 
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            }; 
            if (!pfgs_p.length){ 
                req.flash("failure", mensajes.pfgs_prop_vacio);
                res.redirect("/");
            };
            selectQuery="SELECT s.idseleccion_pfgs AS idp, u.nombre AS t_n, u.apellidos AS t_a "+
                        "FROM seleccion_pfgs AS s, usuarios AS u, pfgs AS p "+
                        "WHERE s.curso LIKE ? AND p.tutor = u.idusuarios AND p.idpfg = s.idpfg "+
                        "ORDER BY idseleccion_pfgs;";
            db.pool.query(selectQuery,[req.user.idcurso], function(err, pfgs_p_tutor, fields) { 
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                }; 

                res.render("pfgspropuestos/preferencias", {pfgs_p: pfgs_p, pfgs_p_tutor: pfgs_p_tutor, page: 'pfgs'});
            })
            
        });
    });

    // Mostrar formulario
    router.get("/asignar/:id", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        // Acceso Admin y Comision
        console.log("qwe");
        selectQuery="SELECT s.*, u.nombre AS a_n, u.apellidos AS a_a, p.titulo, p.codigo_prop "+
                    "FROM seleccion_pfgs AS s, usuarios AS u, pfgs AS p "+
                    "WHERE s.curso LIKE ? AND s.alumno = u.idusuarios AND p.idpfg = s.idpfg AND s.idseleccion_pfgs = ? "+
                    "ORDER BY idseleccion_pfgs;";
        db.pool.query(selectQuery,[req.user.idcurso,req.params.id], function(err, pfgs_p, fields) { 
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            }; 
            if (!pfgs_p.length){ 
                req.flash("failure", mensajes.pfgs_prop_vacio);
                res.redirect("/");
            };
            //console.log("pfgs_p : " + JSON.stringify(pfgs_p));
            selectQuery="SELECT s.idseleccion_pfgs AS idp, u.nombre AS t_n, u.apellidos AS t_a "+
                        "FROM seleccion_pfgs AS s, usuarios AS u, pfgs AS p "+
                        "WHERE s.curso LIKE ? AND p.tutor = u.idusuarios AND p.idpfg = s.idpfg AND s.idseleccion_pfgs = ? "+
                        "ORDER BY idseleccion_pfgs;";
            db.pool.query(selectQuery,[req.user.idcurso,req.params.id], function(err, pfgs_p_tutor, fields) { 
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                }; 
                //console.log("frm a mostrar " + req.params.id)
                //console.log("pfgs_p_tutor : " + JSON.stringify(pfgs_p_tutor));
                res.render("pfgspropuestos/asignar", {pfgs_p: pfgs_p[0], pfgs_p_tutor: pfgs_p_tutor[0], page: 'pfgs'});
            })
            
        });
    });

    // Mostrar formulario para asignar un proy a un alumno
    router.delete("/asignar/:id", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){

        

        // obtener id de usuario
        db.pool.query("SELECT * FROM seleccion_pfgs WHERE idseleccion_pfgs = ? ",[req.params.id], function(err, sel, fields) { 
            
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            // Asignar alumno a pfg
            db.pool.query("UPDATE pfgs SET alumno = ? WHERE idpfg = ? ",[sel[0].alumno, sel[0].idpfg], function(err, pfgs, fields) { 
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                // borrar selecciones de ese alumno y de ese proyecto
                db.pool.query("DELETE FROM seleccion_pfgs WHERE idpfg = ? OR alumno = ? ",[sel[0].idpfg, sel[0].alumno], function(err, sel_pfg, fields) { 
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    req.flash("success", mensajes.pfg_prop_asignado);
                    res.redirect("/");
                });
            });
        });
    });

    return router;
}

