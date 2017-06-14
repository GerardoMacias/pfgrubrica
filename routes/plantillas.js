var express  = require('express');
var passport = require('passport');
var mensajes = require('../server/mensajes');

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside

    // INDEX: mostrar todas las plantillas
    router.get("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        db.pool.query("SELECT * FROM rubricas WHERE es_plantilla=1", function(err, rows, fields) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            res.render("plantillas/index", {plantillas: rows, page: 'plantillas'});
        });       
    });

    // NUEVO: mostrar formulario para crear las plantillas
    router.get("/nuevo", middleware.isLoggedIn, middleware.esAdmin, function(req, res){

        res.render("plantillas/nuevo", {page: 'plantillas'});
    });

    // CREAR PLANTILLA DE RUBRICA
    router.post("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){

        // validar que son todos positivos y menores/iguales que 100
        var i = 0;
        // var suma = 0;
        
        while (req.body.peso[i]){
            if (req.body.peso[i] > 100) {
                req.flash("error", mensajes.pesos_mayor_cien);
                res.redirect('back');
            } else if (req.body.peso[i] < 0) {
                req.flash("error", mensajes.pesos_menor_cero);
                res.redirect('back');
            };
            // suma += parseInt(req.body.peso[i]);
            i++;
        };

        // if (suma != 100) {
        //     req.flash("error", mensajes.pesos_suma_no_cien);
        //     res.redirect('back');
        // };

        var insertQuery = "INSERT INTO rubricas (titulo, descripcion, es_plantilla) VALUES (?,?,1)";
        db.pool.query(insertQuery,[req.body.titulo, req.body.descripcion], function(err, rows) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            id_nuevo = rows.insertId;

            var i = 0;
            var vals = [];
            
            while (req.body.preg[i]){
                vals[i]=[req.body.preg[i],req.body.peso[i],id_nuevo];
                i++;
            };

            insertQuery = "INSERT INTO preguntas (descripcion, peso, idrubrica) VALUES ?";
            // console.log("A-" + insertQuery);
            // console.log("B-" + JSON.stringify(vals));
            db.pool.query(insertQuery,[vals], function(err, rows) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                var sec_fijas=[
                    [id_nuevo, 'TRABAJO AUTÓNOMO', 50, 0, 0],
                    [id_nuevo, 'MEMORIA', 25, 0, 0],
                    [id_nuevo, 'DEFENSA DEL PFG', 25, 0, 0]
                ];

                insertQuery = "INSERT INTO secciones (idrubrica, descripcion, peso, es_criterio, nivel) VALUES ?";
                db.pool.query(insertQuery,[sec_fijas], function(err, rows) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };

                    
                    req.flash("success", mensajes.alta_plantilla)
                    res.redirect("/plantillas");
                });
            });
        });
    });

    // SHOW: muestra información de una plantilla de rúbrica
    router.get("/:id", middleware.isLoggedIn, middleware.esAdmin, function(req, res){

        db.pool.query("SELECT * FROM rubricas WHERE idrubrica = ? and es_plantilla = 1",[req.params.id], function(err, rub) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            db.pool.query("SELECT * FROM preguntas WHERE idrubrica = ?",[req.params.id], function(err, pregs) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query("SELECT * FROM secciones WHERE idrubrica = ?",[req.params.id], function(err, secc) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    
                    ////ordenar como arbol 
                                        
                    var lista_auxiliar = {};
                    // hacer lista hash
                    for (var i=0; i<secc.length; i++) {
                        if (secc[i].padre===null) // raiz
                            secc[i].padre=0; // sustituir null por 0 para tratar todos como números
                        if (lista_auxiliar[secc[i].padre] == undefined) 
                            lista_auxiliar[secc[i].padre] = []; 
                        lista_auxiliar[secc[i].padre].push(secc[i]); // lista con indice el id del padre del elemento que contiene
                    } 

                    var lista_jerarquica = middleware.ordenarJerarquicamente(lista_auxiliar, 0, []); 

                    // for (var i=0; i<lista_jerarquica.length; i++) console.log(lista_jerarquica[i]);

                    res.render("plantillas/show", {rub: rub[0], pregs: pregs, secc: lista_jerarquica, page: 'plantillas'});
                });
            });
        });
    });


    // Mostrar formulario para editar
    router.get("/:id/edit", middleware.isLoggedIn, middleware.esAdmin, function(req, res){

        db.pool.query("SELECT * FROM rubricas WHERE idrubrica = ? and es_plantilla = 1",[req.params.id], function(err, rub) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            db.pool.query("SELECT * FROM preguntas WHERE idrubrica = ?",[req.params.id], function(err, pregs) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query("SELECT * FROM secciones WHERE idrubrica = ?",[req.params.id], function(err, secc) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    
                    // ordenar como arbol 

                    var lista_auxiliar = {};


                    // hacer lista hash
                    for (var i=0; i<secc.length; i++) {
                        if (secc[i].padre===null) // raiz
                            secc[i].padre=0; // sustituir null por 0 para tratar todos como números

                        // inicializar lista auxiliar
                        if (lista_auxiliar[secc[i].padre] == undefined) 
                            lista_auxiliar[secc[i].padre] = []; 
                        lista_auxiliar[secc[i].padre].push(secc[i]); // lista con indice el id del padre del elemento que contiene
                    } 

                    // ordenar jerárquicamente
                    var lista_jerarquica = middleware.ordenarJerarquicamente(lista_auxiliar, 0, []); 

                    // for (var i=0; i<lista_jerarquica.length; i++) console.log(lista_jerarquica[i]);

                    res.render("plantillas/edit", {rub: rub[0], pregs: pregs, secc: lista_jerarquica, page: 'plantillas'});
                });
            });
        });
    });

    // DELETE borrar la plantilla rubrica así como sus preguntas y secciones
    router.delete("/:id", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        // si tiene secciones se borran en cascada
        db.pool.query('DELETE FROM rubricas WHERE idrubrica = ? AND es_plantilla = 1', [req.params.id], function(err, rub) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            if (rub.affectedRows < 0) {
                req.flash("error", mensajes.plantilla_no_encontrada);
                res.redirect('/plantillas');
            }
            req.flash('success', mensajes.plantilla_borrada);
            res.redirect('/plantillas');
        });
    });

    // Actualizar plantilla de rúbrica - rubrica y preguntas
    router.put("/:id", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        // validar que son todos positivos y menores/iguales que 100
        var i = 0;
        
        while (req.body.peso[i]){
            if (req.body.peso[i] > 100) {
                req.flash("error", mensajes.pesos_mayor_cien);
                res.redirect('back');
            } else if (req.body.peso[i] < 0) {
                req.flash("error", mensajes.pesos_menor_cero);
                res.redirect('back');
            };
            i++;
        };

        // actualizar plantillas
        var updateQuery="UPDATE rubricas SET titulo=?, descripcion=? WHERE idrubrica = ?";

        db.pool.query(updateQuery, [req.body.titulo, req.body.descripcion, req.params.id], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            db.pool.query('DELETE FROM preguntas WHERE idrubrica = ?', [req.params.id], function(err, rub) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                var i = 0;
                var vals = [];
                
                while (req.body.preg[i]){
                    vals[i]=[req.body.preg[i],req.body.peso[i],req.params.id];
                    i++;
                };

                insertQuery = "INSERT INTO preguntas (descripcion, peso, idrubrica) VALUES ?";
                
                db.pool.query(insertQuery,[vals], function(err, rows) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };

                    req.flash('success', mensajes.usuario_actualizado);
                    res.redirect('/plantillas');
                });

            });
        });
    });

    return router;
}
