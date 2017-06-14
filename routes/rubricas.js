var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside


    // INDEX: mostrar info de los pfgs con rubricas
    router.get("/", middleware.isLoggedIn, function(req, res){
        var selectQuery;
        selectQueryPFGS="SELECT p.*, u1.nombre AS a_n,u1.apellidos AS a_a,u2.nombre AS t_n,u2.apellidos AS t_a, "+
                    "(SELECT titulo from rubricas where idrubrica = p.idrubrica) AS t_r "+
                    "FROM pfgs AS p, usuarios AS u1, usuarios AS u2 "+
                    "WHERE (p.alumno=u1.idusuarios) AND (p.tutor=u2.idusuarios) "+
                    "AND idrubrica IS NOT NULL AND alumno IS NOT NULL AND curso=?";
        if (req.user.rol == 0 && req.user.admin == 0){
            // es alumno
            // muestra su rúbrica
            db.pool.query("SELECT * FROM pfgs WHERE alumno = ? AND curso = ?", [req.user.idusuarios,req.user.idcurso], function(err, pfg, fields) {
                if(err){ 
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                res.redirect("rubricas/"+pfg[0].idrubrica);
            });  
        } else if (req.user.admin == 1){
            //admin
            //selectQuery="SELECT * FROM pfgs WHERE idrubrica IS NOT NULL AND alumno IS NOT NULL AND curso= ?";
            db.pool.query(selectQueryPFGS, [req.user.idcurso], function(err, pfgs, fields) {
                if(err){ 
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };console.log("aa");
                res.render("rubricas", {pfgs: pfgs, rol_2:"admin", page: 'rubricas'});
            });   
        } else if (req.user.rol == 1){
            selectQuery="SELECT * FROM comisiones WHERE idprofesor = ? AND curso LIKE ?";
            db.pool.query(selectQuery,[req.user.idusuarios, req.user.idcurso], function(err, com, fields) {
                if(err){
                    console.log('SQL Connection error: ', err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                }
                if(com.length){ 
                    // comision
                    db.pool.query(selectQueryPFGS, [req.user.idcurso], function(err, pfgs, fields) {
                        if(err){ 
                            console.log('SQL Connection error: ', err);
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        res.render("rubricas", {pfgs: pfgs, rol_2:"comision", page: 'rubricas'});
                    }); 

                } else {
                    // tribunal
                    selectQuery="SELECT * FROM tribunales WHERE idprofesor = ? AND curso LIKE ?";
                    db.pool.query(selectQuery,[req.user.idusuarios, req.user.idcurso], function(err, trib, fields) {
                        if(err){
                            console.log('SQL Connection error: ', err);
                            req.flash('error', mensajes.error_db);
                            res.redirect('/');
                        };
                        if(trib.length){
                            // tribunal
                            
                            selectQuery=selectQueryPFGS + " AND (p.tutor=? OR p.idpfg IN (SELECT t.idpfg FROM tribunales AS t WHERE t.idprofesor = ? AND t.curso= ?))";
                            db.pool.query(selectQuery, [req.user.idcurso,req.user.idusuarios,req.user.idusuarios,req.user.idcurso], function(err, pfgs, fields) {
                                if(err){ 
                                    console.log('SQL Connection error: ', err);
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                };
                                res.render("rubricas", {pfgs: pfgs, rol_2: "tribunal", page: 'rubricas'});
                            }); 
                        } else {
                            // solo tutor
                            selectQuery=selectQueryPFGS + " AND tutor = ?";
                            db.pool.query(selectQuery, [req.user.idcurso,req.user.idusuarios], function(err, pfgs, fields) {
                                if(err){ // Control del error
                                    console.log('SQL Connection error: ', err);
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                };
                                res.render("rubricas", {pfgs: pfgs, rol_2:"tutor", page: 'rubricas'});
                            }); 
                            req.flash('error', mensajes.no_permitido);
                            res.redirect('/');; 
                        }; 
                    });
                }; 
            });
        };
    });


    // SHOW: muestra información de una rúbrica de proyecto
    router.get("/:id", middleware.isLoggedIn, function(req, res){
        
        // Obtenemos información de la túbrica y del PFG asociado
        var selectQuery="SELECT r.*, p.idpfg AS p_id, p.tutor AS p_tut, p.titulo AS p_t, p.descripcion AS p_d, "+
                        "p.eval_seccion_1 AS p_e1, p.eval_seccion_2 AS p_e2, p.eval_seccion_3 AS p_e3, p.notafinal AS p_nf "+
                        "FROM rubricas AS r, pfgs AS p WHERE r.idrubrica=p.idrubrica AND r.idrubrica = ? and r.es_plantilla = 0";
        db.pool.query(selectQuery,[req.params.id], function(err, rub) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            var rol_usu=false;
            // comprobar si es tribunal para el PFG
            
            selectQuery="SELECT * FROM tribunales WHERE idprofesor = ? AND idpfg = ? AND curso LIKE ?";
            db.pool.query(selectQuery,[req.user.idusuarios, rub[0].p_id, req.user.idcurso], function(err, trib, fields) {
                if(err){
                    console.log('SQL Connection error: ', err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                };
                if(trib.length){
                    // es tribunal del PFG (no puede ser tutor)
                    rol_usu="tribunal";
                } else {
                    // solo tutor
                    if (rub[0].p_tut==req.user.idusuarios){
                        rol_usu="tutor";
                    }
                }; 
            });


            db.pool.query("SELECT * FROM preguntas WHERE idrubrica = ? ORDER BY CONVERT(`peso`, decimal) DESC;",[req.params.id], function(err, pregs) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query("SELECT * FROM secciones WHERE idrubrica = ? ORDER BY idsecciones",[req.params.id], function(err, secc) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    
                    // se pasa 
                    var eva_secc = {};
                    eva_secc.a = secc[0].evaluacion;
                    eva_secc.b = secc[1].evaluacion;
                    eva_secc.c = secc[2].evaluacion;

                    // Ordenar como arbol 
                                        
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

                    res.render("rubricas/show", {rub: rub[0], pregs: pregs, secc: lista_jerarquica, eva_secc: eva_secc, rol_usu: rol_usu, page: 'rubricas'});
                });
            });
        });
    });

    // SHOW: mostrar formulario de edicion criterio de rubrica
    router.get("/:id/criterios/:id_c", middleware.isLoggedIn, function(req, res){
        // comprobar si es tribunal para el PFG
        
        selectQuery="SELECT * FROM pfgs WHERE idrubrica = ? AND curso LIKE ?";
        db.pool.query(selectQuery,[req.params.id, req.user.idcurso], function(err, pfg, fields) {
            if(err){
                console.log('SQL Connection error: ', rub[0].p_id, err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            };
            selectQuery="SELECT * FROM tribunales WHERE idprofesor = ? AND idpfg = ? AND curso LIKE ?";
            db.pool.query(selectQuery,[req.user.idusuarios, pfg[0].idpfg, req.user.idcurso], function(err, trib, fields) {
                if(err){
                    console.log('SQL Connection error: ', rub[0].p_id, err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                };
                
                var tutor=(pfg[0].tutor==req.user.idusuarios)?1:null;
                var tribunal=(trib.length)?1:null;
                console.log("c: tut: " + tutor + " - trib "+ tribunal + " - " + req.user.idusuarios + " - " + trib.length);
                if (tutor||tribunal){
                    // tutor o tribunal del PFG
                    db.pool.query("SELECT * FROM secciones WHERE idsecciones = ? ",[req.params.id_c], function(err, secc) {
                        if(err){ // Control del error
                            console.log('SQL Connection error: ', err);
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };
                        // seleccionar las secciones padre y hermanas
                        db.pool.query("SELECT * FROM secciones WHERE padre = ? OR idsecciones = ? ORDER BY idsecciones",[secc[0].padre,secc[0].padre], function(err, sec_padre) {
                            if(err){ // Control del error
                                console.log('SQL Connection error: ', err);
                                req.flash("error", mensajes.error_db);
                                res.redirect('/');
                            };
                            
                            db.pool.query("SELECT * FROM preguntas WHERE idrubrica = ? ORDER BY CONVERT(`peso`, decimal) DESC;",[req.params.id], function(err, pregs) {
                                if(err){ // Control del error
                                    console.log('SQL Connection error: ', err);
                                    req.flash("error", mensajes.error_db);
                                    res.redirect('/');
                                };

                                res.render("rubricas/edit", {sec_padre: sec_padre, tutor:tutor, tribunal:tribunal, secc: secc[0], pregs: pregs, pfg: pfg[0], page: 'rubricas'});

                            });
                        });
                    });
                } else {
                    req.flash('error', mensajes.no_permitido);
                    res.redirect('/');
                }
            });
        });
    });

    router.put("/:id/criterios/:id_c", middleware.isLoggedIn, function(req, res){

        db.pool.query("SELECT * FROM pfgs WHERE idrubrica = ? ",[req.params.id], function(err, pfg) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            console.log("trib: "+req.body.tribunal);
            console.log("tut: "+req.body.tutor);


            // sacar el nodo raiz
            db.pool.query("SELECT * FROM secciones WHERE idrubrica = ? ORDER BY idsecciones",[req.params.id], function(err, secc) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                // buscamos el nodo raiz
                var enc=false,reiniciar=false;
                var i=0, indice=0;
                n_id=req.params.id_c;
                while (!enc && i<secc.length){
                    if(secc[i].idsecciones==n_id){
                        //en seccion
                        if(!secc[i].padre){
                            //es raiz
                            enc=true;
                            indice=i;
                        } else {
                            //no raiz, seguir
                            n_id=secc[i].padre;
                            reiniciar=true;
                        }
                    };
                    if (!enc){
                        if (reiniciar){
                            i=0;
                            reiniciar = false
                        } else {
                            i++;
                        };
                    }
                }
                
                console.log("enco:" + JSON.stringify(secc[indice]));
                console.log("tutor: " +req.body.tutor +" - trib: "+ req.body.tribunal +" - ind: "+indice+" - " +pfg[0].eval_seccion_1);
                
                if (req.body.tutor && (indice!=0 || pfg[0].eval_seccion_1)){console.log("1");
                    req.flash('error', mensajes.no_permitido);
                    res.redirect("/rubricas/"+req.params.id);
                } else if (!req.body.tutor && req.body.tribunal && (parseInt(indice)==0)){console.log("2");
                    req.flash('error', mensajes.no_permitido);
                    res.redirect("/rubricas/"+req.params.id);
                } else if (!req.body.tutor && req.body.tribunal && (parseInt(indice)==1) && (!pfg[0].eval_seccion_1||pfg[0].eval_seccion_2)){console.log("3");
                    req.flash('error', mensajes.no_permitido);
                    res.redirect("/rubricas/"+req.params.id);
                } else if (!req.body.tutor && req.body.tribunal && (parseInt(indice)==2) && (!pfg[0].eval_seccion_1||!pfg[0].eval_seccion_2||pfg[0].eval_seccion_3)){console.log("4");
                    req.flash('error', mensajes.no_permitido);
                    res.redirect("/rubricas/"+req.params.id);
                } else {

                    // actualizar valor
                    selectQuery="UPDATE secciones SET evaluacion = ? WHERE idsecciones = ?";
                    db.pool.query(selectQuery,[req.body.eval, req.params.id_c], function(err, rows, fields) {
                        if(err){
                            console.log('SQL Connection error: ', err);
                            req.flash('error', mensajes.error_db);
                            res.redirect('/');
                        };

                        updateEvaluacionHermanosPadre(req.body.padre);

                        
                        res.redirect("/rubricas/"+req.params.id);
                    });
                } 
            });  
        });
    });


    router.put("/:id", middleware.isLoggedIn, function(req, res){

        db.pool.query("SELECT * FROM secciones WHERE idrubrica = ? AND padre IS NULL ORDER BY idsecciones",[req.params.id], function(err, secc) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            var parcial=null;

            var nf=null;
            updateQuery="UPDATE pfgs SET ";
            if (req.body.seccion=='seccion1'){
                updateQuery+="eval_seccion_1=?, notafinal=? ";
                // parcial=secc[0].evaluacion;
                parcial=(parseInt(secc[0].evaluacion)*parseInt(secc[0].peso))/100;
            } else if (req.body.seccion=='seccion2'){
                updateQuery+="eval_seccion_2=?, notafinal=? ";
                // parcial=secc[1].evaluacion;
                parcial=(parseInt(secc[1].evaluacion)*parseInt(secc[1].peso))/100;
            } else if (req.body.seccion=='seccion3'){
                updateQuery+="eval_seccion_3=?, notafinal=? ";
                // parcial=secc[2].evaluacion;
                parcial=(parseInt(secc[2].evaluacion)*parseInt(secc[2].peso))/100;
                nf= (parseInt(secc[0].evaluacion)*parseInt(secc[0].peso))/100+
                    (parseInt(secc[1].evaluacion)*parseInt(secc[1].peso))/100+
                    (parseInt(secc[2].evaluacion)*parseInt(secc[2].peso))/100;
            };
            updateQuery+="WHERE idrubrica = ? ";


            db.pool.query(updateQuery,[parcial, nf, req.params.id], function(err, rows, fields) {
                if(err){
                    console.log('SQL Connection error: ', err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                };

                res.redirect("/rubricas/"+req.params.id);
            });
        });
    });





    // Funcion que actualiza (según los valores de sus hijos) el valor de la sección del id que se pasa como parámetro
    // Recorre las secciones hijas del id que se pasa como parametro y calcula el valor de la sección
    // función recursiva
    function updateEvaluacionHermanosPadre(id){
        // comprobar valores de los hermanos: si evaluados, evaluar padre (sobreescribir)
        db.pool.query("SELECT * FROM secciones WHERE padre = ? OR idsecciones = ? ORDER BY idsecciones",[id,id], function(err, secc) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            
            var es_nulo=false,actualizar=false;
            var i=1,suma=0;

            if(secc.length==0){
                // sólo una entrada; no se da en rubricas completas
            } else {
                // recorrer hermanos
                while(!es_nulo && i<secc.length){
                    if(!secc[i].evaluacion){
                        // uno de los hermanos no está evaluado. no se actualiza padre
                        es_nulo=true; 
                    } else {
                        suma+=((parseInt(secc[i].evaluacion)*parseInt(secc[i].peso))/100);
                    }
                    i++;
                };
            }
            console.log("suma: "+suma+"    secc[0]: "+secc[0])
            suma=Math.floor(suma);
            if (!es_nulo){console.log("111");
                // ningún hijo es nulo: actualizar valor del padre
                selectQuery="UPDATE secciones SET evaluacion = ? WHERE idsecciones = ?";
                db.pool.query(selectQuery,[suma, secc[0].idsecciones], function(err, rows, fields) {
                    if(err){
                        console.log('SQL Connection error: ', err);
                        req.flash('error', mensajes.error_db);
                        res.redirect('/');
                    };console.log("222");
                    // evaluar el arbol
                    if (secc[0].padre){console.log("333");
                        // el padre no es raiz (no es nulo) seguimos
                        console.log("antes entrar: " + JSON.stringify(secc[0]));
                        updateEvaluacionHermanosPadre(secc[0].padre);console.log("333_b");
                    } else {console.log("444");
                        //es nodo raiz: finalizamos
                        return ;
                    }
                });
            } else {console.log("555");
                // algún hijo nulo: no actualizar valor del padre
                return ;
            };
        });
    };

    return router;
}

// res.send(JSON.stringify(secc[0]));