var mensajes = require("../server/mensajes");

module.exports = function(db){

    var middlewareObj = {};

    var _this=this;

    middlewareObj.isLoggedIn = function isLoggedIn(req, res, next){
        if(req.isAuthenticated()){
            return next();
        }
        //req.flash("error", mensajes.no_registrado);
        res.redirect("/login");
    }

    middlewareObj.isNotLoggedIn = function isNotLoggedIn(req, res, next){
        if(req.isUnauthenticated()){
            return next();
        }
        req.flash("success", mensajes.ya_registrado);
        res.redirect("back");
    }

    // Comprueba si el usuario tiene asignado un proyecto
    middlewareObj.tienePfgAsignado = function tienePfgAsignado(req, res, next){
        db.pool.query("SELECT * FROM pfgs WHERE alumno = ? AND curso LIKE ?", 
            [req.user.idusuarios, req.user.idcurso], function(err, rows, fields) {
            if(err){
                console.log('SQL Connection error: ', err);
                res.redirect('/');
            } else {
                if (rows.length){
                    // Tiene asignado ya un proyecto este curso
                    console.log("Tiene asignado ya un proyecto este curso.");
                    req.flash('error', mensajes.pfg_asignado);
                    res.redirect('/');
                } else {
                    return next();
                }
            }
        });
    }

    // Comprueba si el usuario tiene asignados proyectos propuestos
    middlewareObj.tienePfgsPropAsignado = function tienePfgsPropAsignado(req, res, next){
        db.pool.query("SELECT * FROM seleccion_pfgs WHERE alumno = ? AND curso LIKE ?",
                    [req.user.idusuarios, req.user.idcurso], function(err, rows, fields) { 
            if(err){
                console.log('SQL Connection error: ', err);
                req.flash('error', mensajes.error_db);
                res.redirect('/');
            }
            if (rows.length){
                // Tiene ya una selección realizada de propuestas
                req.flash('error', mensajes.pfgs_prop_repetidos);
                res.redirect('back');
            } else {
                return next();
            }
        });
    }

    middlewareObj.ordenarJerarquicamente = function ordenarJerarquicamente(lista_hash, x, result) {
        // ordena jerarquicamente una lista 
        //llamada recursiva: ordenarJerarquicamente(lista_auxiliar, 0, []); 
        if (lista_hash[x] == undefined) return; // sin hijos
        
        var aux = lista_hash[x];

        for (var i=0; i < aux.length; i++) { // recorrer array
            result.push(aux[i]); // insertar en última posicion
            ordenarJerarquicamente(lista_hash, aux[i].idsecciones, result); // insertar todos sus hijos
        }

        return result; // array ordenado
    }

    middlewareObj.esAdmin = function esAdmin(req, res, next){
        if(!req.user.admin){ 
            // Resto de usuarios
            req.flash('error', mensajes.no_permitido);
            res.redirect('/');
        }else{
            return next();
        };
    }

    middlewareObj.esAlumno = function esAlumno(req, res, next){
        if(!req.user.rol && !req.user.admin){ 
            // Resto de usuarios
            return next();
        }else{
            req.flash('error', mensajes.no_permitido);
            res.redirect('/');
        };
    }

    middlewareObj.esComisionAdmin = function esComisionAdmin(req, res, next){
        if(!req.user.admin){ 
            db.pool.query("SELECT * FROM comisiones WHERE idprofesor = ? AND curso LIKE ?",
                    [req.user.idusuarios, req.user.idcurso], function(err, rows, fields) { 
                if(err){
                    console.log('SQL Connection error: ', err);
                    req.flash('error', mensajes.error_db);
                    res.redirect('/');
                }
                if(!rows.length){ 
                    // Resto de usuarios
                    req.flash('error', mensajes.no_permitido);
                    res.redirect('/');
                } else {
                    return next();
                };
            });
        } else {
            return next();
        };
    }

    return middlewareObj;
};