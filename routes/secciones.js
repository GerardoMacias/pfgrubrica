var express  = require('express');
var passport = require('passport');
var mensajes = require('../server/mensajes');

module.exports = function(db){
    var router  = express.Router(({mergeParams: true}));
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside


    // Mostrar formulario para editar
    router.get("/:id/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        db.pool.query("SELECT * FROM secciones WHERE idsecciones=?", [req.params.id], function(err, rows, fields) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            res.render("secciones/show", {secc: rows[0], page: 'plantillas'});
        });
    });

    // NUEVO: mostrar formulario para crear las secciones a añadir del padre indicado
    // parametros en url: tipo_seccion, num_anadir
    router.get("/:id/anadir", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        // verificar: 
        // NO puede ser CRITERIO
        // Si es seccion: 
        //    Si se añaden criterios solo puede tener criterios dicha seccion
        //    Si se añaden secciones solo puede tener secciones dicha seccion

        db.pool.query("SELECT * FROM secciones WHERE idsecciones=?", [req.params.id], function(err, secc, fields) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            // No puede ser criterio
            if (secc[0].es_criterio) {
                req.flash("error", mensajes.no_anadir_a_criterio);
                res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
            };
            // Es Seccion
            // Obtengo sus hijos
            db.pool.query("SELECT * FROM secciones WHERE padre=?", [req.params.id], function(err, hijos, fields) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                // Si se añaden criterios solo puede tener criterios dicha seccion
                // Si se añaden secciones solo puede tener secciones dicha seccion

                // if (req.query.tipo_seccion=='secciones') { // añade secciones
                //     console.log("añade secciones");
                //     // Comprobar que solo tiene secciones como hijos, o que no tiene nada
                //     if (hijos.length <= 0){
                //         // sin hijos, puede añadir
                //         console.log("sin hijos puede añadir");
                //     } else if (hijos[0].es_criterio){
                //         // Tiene criterios y añade secciones, no está permitido
                //         console.log("Tiene criterios y añade secciones, no está permitido");
                //         req.flash("error", mensajes.no_anadir_secciones_a_criterio);
                //         res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
                //         console.log("redirected");
                //     }
                // } else if (req.query.tipo_seccion=='criterios'){// añade criterios
                //     // Comprobar que solo tiene criterios, o que no tiene nada
                //     console.log("anade criterios");
                //     if (hijos.length <= 0){
                //         // sin hijos, puede añadir
                //         console.log("sin hijos puede añadir");
                //     } else if (!hijos[0].es_criterio){
                //         // Tiene secciones y añade criterios, no está permitido
                //         console.log("Tiene secciones y añade criterios, no está permitido");
                //         req.flash("error", mensajes.no_anadir_criterio_a_secciones);
                //         res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
                //         console.log("redirected");
                //     }
                // } else {
                //     console.log("error entrada");
                //     req.flash("error", mensajes.error_entrada);
                //     res.redirect('/');
                // };
                // console.log("ok");
                // res.render("secciones/nuevo", {secc: secc[0], hijos: hijos, num_anadir: req.query.num_anadir, tipo: req.query.tipo_seccion, page: 'plantillas'});

                if (req.query.tipo_seccion=='secciones' || req.query.tipo_seccion=='criterios') { // añade secciones o criterios
                    if (hijos.length <= 0){
                        // sin hijos, añadir en cualquier caso
                        res.render("secciones/nuevo", {secc: secc[0], hijos: hijos, num_anadir: req.query.num_anadir, tipo: req.query.tipo_seccion, page: 'plantillas'});
                    } else {
                        if (hijos[0].es_criterio && req.query.tipo_seccion=='secciones'){
                            // Tiene criterios y añade secciones, no está permitido
                            console.log("Tiene criterios y añade secciones, no está permitido");
                            req.flash("error", mensajes.no_anadir_secciones_a_criterio);
                            res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
                            console.log("redirected");
                        } else if (!hijos[0].es_criterio && req.query.tipo_seccion=='criterios'){
                            // Tiene secciones y añade criterios, no está permitido
                            console.log("Tiene secciones y añade criterios, no está permitido");
                            req.flash("error", mensajes.no_anadir_criterio_a_secciones);
                            res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
                            console.log("redirected");
                        } else {
                            res.render("secciones/nuevo", {secc: secc[0], hijos: hijos, num_anadir: req.query.num_anadir, tipo: req.query.tipo_seccion, page: 'plantillas'});
                        };
                    };
                } else { // caso de error en entrada
                    console.log("error entrada");
                    req.flash("error", mensajes.error_entrada);
                    res.redirect('/');
                };
            });
        });
    });


    // CREATE: crear las secciones, así como actualizar los pesos de las que indican
    // num_anadir nuevo_preg nuevo_peso upd_peso upd_id tipo
    router.post("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        // comprobar que los pesos son 100
        var suma=0;
        var i=0;
        if (typeof req.body.nuevo_peso != 'undefined') {
            while (req.body.nuevo_peso[i]){
                suma+=(parseInt(req.body.nuevo_peso[i]));
                i++;
            };
        };
        if (typeof req.body.upd_peso != 'undefined') {
            i=0;
            while (req.body.upd_peso[i]){
                suma+=(parseInt(req.body.upd_peso[i]));
                i++;
            };
        }
        if (suma != 100){
            req.flash("error", mensajes.pesos_suma_no_cien);
            res.redirect('back');
        };

        // comprobar si existen secciones a actualizar
        var updateQuery = '';

        console.log("secciones updates "+JSON.stringify(req.body.upd_id));
        if (typeof req.body.upd_id == 'undefined') { 
            // NO existen secciones a actualizar
            next();
        } else {
            // SI existen secciones a actualizar
             
            console.log("existen secciones a actualizar: " + JSON.stringify(req.body.upd_id));

            // actualizamos las secciones o criterios.

            var vals_update = []; // vector para los valores a insertar

            i = 0;
            while (req.body.upd_id[i]){
                vals_update[i]=[req.body.upd_peso[i], req.body.upd_id[i]];
                i++;
            };
            console.log("vals_update: "+ JSON.stringify(vals_update));
            vals_update.forEach(function(elem){
                updateQuery += db.mysql.format("UPDATE secciones SET peso = ? WHERE idsecciones = ?; ", elem);
            });

            db.pool.query(updateQuery, function(err, usu) {
                if(err){
                    console.log('SQL Connection error: ', err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                };
                next();
            });
            // db.pool.query(queries, defered.makeNodeResolver());

            // i=0;
            // while (req.body.upd_id[i]){
            //     console.log("while: llamada a actualizarSeccion: "+ req.body.upd_id[i]);
            //     middleware.actualizarSeccion(req.body.upd_peso[i], req.body.upd_id[i]);
            //     i++;    
            // };
        };  
    }, function(req, res, next){    

        // añadimos las nuevas secciones
        var vals_ins = []; // vector para los valores a insertar
        var tipo = 0;
        if (req.body.tipo=='criterios') tipo = 1; 
        // var completa=0;
        // if (tipo==1) completa = 1; // si son criterios los marcamos como completos
         
        i = 0;
        while (req.body.nuevo_preg[i]){
            vals_ins[i]=[req.params.id_p, req.body.nuevo_preg[i],req.body.nuevo_peso[i],req.body.idsecciones,tipo,parseInt(req.body.nivel)+1];//,completa
            i++;
        };
        console.log("vals_ins: "+ JSON.stringify(vals_ins));
        insertQuery = "INSERT INTO secciones (idrubrica, descripcion, peso, padre, es_criterio, nivel) VALUES ?";
        db.pool.query(insertQuery,[vals_ins], function(err, rows) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            console.log("insertadas las nuevas secciones");
        
        
    
            // Rúbrica completa : no hay secciones sin criterios
            // Rúbrica no completa: sección sin criterio
            // COMPROBAR COMPLETA
            //  Cuando inserta nuevos CRITERIOS en un nodo sin criterios -> puede pasar de incompleta a completa (puede haber más nodos incompletos)
            //  Cuando inserta sin actualizar SECCIONES -> pasa a incompleta, aunque ya podría estarlo (puede haber más nodos incompletos)
            if (typeof req.body.upd_id == 'undefined' && req.body.tipo=='criterios') { 
                console.log("inserta nuevos CRITERIOS en un nodo sin criterios");
                // inserta nuevos CRITERIOS en un nodo sin criterios

                db.pool.query("SELECT * FROM secciones WHERE idrubrica = ?",[req.params.id_p],function(err, secc, fields) { 
                    if(err){
                        console.log('SQL Connection error: ', err);
                        req.flash('error', mensajes.error_db);
                        res.redirect('/');
                    }

                    // hacer lista hash
                    var lista_auxiliar = {};
                    for (var i=0; i<secc.length; i++) {
                        if (secc[i].padre===null) // si es raiz
                            secc[i].padre=0; // sustituir null por 0 para tratar todos como números
                        // inicializar array auxiliar con los indices de los padres
                        if (lista_auxiliar[secc[i].padre] == undefined) 
                            lista_auxiliar[secc[i].padre] = []; 
                        lista_auxiliar[secc[i].padre].push(secc[i]); // lista con indice el id del padre del elemento que contiene
                    } 
                    
                    // ordenar el array: lista jerarquica
                    var l = middleware.ordenarJerarquicamente(lista_auxiliar, 0, []); 

                    var i=0;
                    var completa=true;
                    
                    
                    while (completa && i<(l.length-1)){
                        // para que haya una sección sin criterios, debe haber dos secciones juntas 
                        if (l[i].es_criterio==0 && l[i+1].es_criterio==0){
                            console.log("dos secciones juntas: "+ i + " - " + (i+1));
                            // la excepción es cuando esa sea una subsección (que le tenga como padre)
                            // si no se cumple, no tiene criterios y no está completa la rubrica
                            console.log("l[i].idsecciones + l[i+1].padre + !=: " + l[i].idsecciones + " - " + l[i+1].padre + " - " + (l[i].idsecciones!=l[i+1].padre));
                            if (l[i].idsecciones!=l[i+1].padre){
                                completa=false;
                            };
                        };
                        i++;
                    };

                    if (completa) {
                        console.log("es completa actualizar es true y completa 1");
                        var updateQuery="UPDATE rubricas SET completa=1 WHERE idrubrica=?";
                        db.pool.query(updateQuery, [req.params.id_p], function(err, usu) {
                            if(err){ // Control del error
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };
                            req.flash("success", mensajes.alta_secciones);
                            res.redirect('/plantillas/'+req.params.id_p+'/edit');
                        });
                    } else {
                        req.flash("success", mensajes.alta_secciones);
                        res.redirect('/plantillas/'+req.params.id_p+'/edit');
                    };

                });

                // var completa = esCompleta(req.params.id_p);
            } else if (req.body.tipo=='secciones') { 
                // inserta nuevas SECCIONES en un nodo con o sin secciones
                // pasa a incompleta
                console.log("inserta nuevos SECCIONES en un nodo sin secciones, actualizar true y completa 0");

                var updateQuery="UPDATE rubricas SET completa=0 WHERE idrubrica=?";
                db.pool.query(updateQuery, [req.params.id_p], function(err, usu) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    console.log("en update final");
                    req.flash("success", mensajes.alta_secciones);
                    res.redirect('/plantillas/'+req.params.id_p+'/edit');
                });
            } else {
                // La rubrica mantiene su estado previo de completa o incompleta
                console.log("se mantiene");
                req.flash("success", mensajes.alta_secciones);
                res.redirect('/plantillas/'+req.params.id_p+'/edit');
            };
        });
    });

    // EDIT: MOSTRAR FORMULARIO DE EDICION
    // Actualizar sección de rúbrica - rubrica y preguntas
    // pasar hermanos, secc
    router.get("/:id/edit", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        db.pool.query("SELECT * FROM secciones WHERE padre = (SELECT padre FROM secciones WHERE idsecciones = ?)",[req.params.id], function(err, her) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            var el;
            var i=0, enc=false;
            while (!enc && i<her.length){
                if(her[i].idsecciones==req.params.id)
                    el = her[i];
                i++;
            };

            res.render("secciones/edit", {secc: el, hermanos: her, page: 'plantillas'});
            
        });
    });

    // Actualizar sección/criterio de rúbrica
    router.put("/:id", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        var suma=0;
        var i=0;

        // Comprobar que la suma de pesos es 100
        if (req.body.nuevo_peso) {
            suma+=(parseInt(req.body.nuevo_peso));
        };
        if (typeof req.body.upd_peso != 'undefined') {
            i=0;
            while (req.body.upd_peso[i]){
                suma+=(parseInt(req.body.upd_peso[i]));
                i++;
            };
        }
        if (suma != 100){
            req.flash("error", mensajes.pesos_suma_no_cien);
            res.redirect('back');
        };


        updateQuery="UPDATE secciones SET peso=?, descripcion=? WHERE idsecciones=?";
        db.pool.query(updateQuery, [req.body.nuevo_peso, req.body.nuevo_preg, req.params.id], function(err, usu) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
  
            if (typeof req.body.upd_id == 'undefined'){
                req.flash("success", mensajes.seccion_editada);
                res.redirect('/plantillas/'+req.params.id_p+'/edit');
            } else {
                // actualizamos los pesos de las secciones o criterios.

                var vals_update = []; // vector para los valores a insertar

                i = 0;
                while (req.body.upd_id[i]){
                    vals_update[i]=[req.body.upd_peso[i], req.body.upd_id[i]];
                    i++;
                };
                
                var updateQuery = '';
                vals_update.forEach(function(elem){
                    updateQuery += db.mysql.format("UPDATE secciones SET peso = ? WHERE idsecciones = ?; ", elem);
                });
                
                db.pool.query(updateQuery, function(err, usu) {
                    if(err){
                        console.log('SQL Connection error: ', err);
                        req.flash('error', mensajes.error_db);
                        res.redirect('/');
                    };
                    req.flash("success", mensajes.secciones_editadas);
                    res.redirect('/plantillas/'+req.params.id_p+'/edit');
                });
            };  
        });
    });



    // NUEVO: mostrar formulario para crear las secciones a añadir del padre indicado
    // parametros en url: tipo_seccion, num_anadir
    router.get("/:id/borrar", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        // verificar: 
        // NO puede ser CRITERIO
        // Si es seccion: 
        //    Si se añaden criterios solo puede tener criterios dicha seccion
        //    Si se añaden secciones solo puede tener secciones dicha seccion

        db.pool.query("SELECT * FROM secciones WHERE idsecciones=?", [req.params.id], function(err, secc, fields) {
            if(err){ // Control del error
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            // // No puede ser criterio
            // if (secc[0].es_criterio) {
            //     req.flash("error", mensajes.no_anadir_a_criterio);
            //     res.redirect('/plantillas/'+req.params.id_p+'/secciones/'+req.params.id);
            // };
            // Es Seccion
            // Obtengo sus hermanos
            db.pool.query("SELECT * FROM secciones WHERE padre=?", [secc[0].padre], function(err, her, fields) {
                if(err){ // Control del error
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };


                var index=-1;
                if (her.length > 0){
                    var i=0,enc=false;
                    while (i<her.length && !enc){
                        if (her[i].idsecciones==secc[0].idsecciones) {
                            enc=true;
                            index=i;
                        };
                        i++
                    };

                    // eliminar el elemento de los hermanos
                    console.log("her: " + JSON.stringify(her));
                    console.log("index: " + index);
                    if (index > -1) {
                        her.splice(index, 1);
                    }
                    console.log("her splice: " + JSON.stringify(her));
                };


                console.log("ok");
                res.render("secciones/borrar", {secc: secc[0], hermanos: her, page: 'plantillas'});

            });
        });
    });



    // DELETE borrar la sección rubrica así como sus subsecciones
    // upd_peso  upd_id  id  id_p
    router.delete("/:id", middleware.isLoggedIn, middleware.esAdmin, function(req, res, next){
        // si tiene secciones se borran en cascada

        db.pool.query("SELECT * FROM secciones WHERE idsecciones = ?",[req.params.id], function(err, rows) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            // Comprobar si es nodo raiz
            if (rows[0].padre===null) {
                req.flash("error", mensajes.error_borrar_nodo_raiz);
                res.redirect('back');
            };

            // seleccionamos el mensaje según sección o criterio
            var mens;
            if (rows[0].es_criterio==1) mens=mensajes.criterio_borrado
            else mens=mensajes.seccion_borrada;
            

            db.pool.query('DELETE FROM secciones WHERE idsecciones = ?', [req.params.id], function(err, borr) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query("SELECT * FROM secciones WHERE idrubrica = ?",[req.params.id_p], function(err, secc) {
                    if(err){ // Control del error
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                

                    // comprobar si la rúbrica es completa
                    var i=0,j=0;
                    var tiene_hijos=true;
                    while(i<secc.length && tiene_hijos){
                        //console.log("secc[i].idsecciones: "+ secc[i].idsecciones);

                        if(!secc[i].es_criterio){
                            j=0;
                            tiene_hijos=false;
                            while(!tiene_hijos && j<secc.length){
                                if(i!=j){
                                    if(secc[j].padre==secc[i].idsecciones){
                                        tiene_hijos=true;//console.log("secc[j].idsecciones: "+ secc[j].idsecciones + " - secc[j].padre: "+ secc[j].padre);
                                    }
                                }
                                j++;
                            };
                        };
                        console.log("tiene_hijos: "+tiene_hijos);
                        i++;
                    };
                    var completa;
                    if (tiene_hijos) completa=1; else completa=0;

                    //console.log("actualizar rub completa?: "+completa);

                    var updateQuery="UPDATE rubricas SET completa=? WHERE idrubrica=?";
                    db.pool.query(updateQuery, [completa,req.params.id_p], function(err, usu) {
                        if(err){ // Control del error
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };


                        if (typeof req.body.upd_id != 'undefined'){
                            // actualizamos los pesos de las secciones o criterios.

                            var vals_update = []; // vector para los valores a insertar

                            i = 0;
                            while (req.body.upd_id[i]){
                                vals_update[i]=[req.body.upd_peso[i], req.body.upd_id[i]];
                                i++;
                            };
                            
                            
                            var updateQuery = '';
                            
                            vals_update.forEach(function(elem){
                                updateQuery += db.mysql.format("UPDATE secciones SET peso = ? WHERE idsecciones = ?; ", elem);
                            });

                            console.log("updateQuery: " + JSON.stringify(updateQuery));
                            
                            db.pool.query(updateQuery, function(err, usu) {
                                if(err){
                                    console.log('SQL Connection error: ', err);
                                    req.flash('error', mensajes.error_db);
                                    res.redirect('/');
                                };
                            });
                        }; 

                        req.flash("success", mensajes.mens);
                        res.redirect('/plantillas/'+req.params.id_p+'/edit');

                    });

                });

            });
           
        });
    });

    return router;
}

