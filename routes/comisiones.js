
var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");
var _ = require('underscore');

module.exports = function(db){
    var router  = express.Router(({mergeParams: true}));
    var middleware = require("../middleware")(db); 


    // Mostrar información de comision
    router.get("/", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        // son 5 componentes de comision
        // presidente secretario y 3 vocales

        selectQuery="SELECT c.*, u.nombre AS u_n, u.apellidos AS u_a FROM comisiones AS c, usuarios AS u "+
                    "WHERE c.idprofesor = u.idusuarios AND c.curso=?";
        db.pool.query(selectQuery,[req.user.idcurso], function(err, com, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            res.render("comisiones/show", {com: com, page: 'comisiones'}); 
        });

    });


    // Mostrar frm de edicion de comision
    router.get("/edit", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        // usuarios 
        var selectQuery="SELECT DISTINCT * FROM usuarios "+
                    "WHERE rol = 1 AND admin = 0";
        db.pool.query(selectQuery, function(err, usus, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            // comision
            selectQuery="SELECT c.*, u.nombre AS u_n, u.apellidos AS u_a FROM comisiones AS c, usuarios AS u "+
                        "WHERE c.idprofesor = u.idusuarios AND c.curso=?";
            db.pool.query(selectQuery,[req.user.idcurso], function(err, com, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };
                console.log("c : " + JSON.stringify(com));
                console.log("c : " + req.user.idcurso);

                res.render("comisiones/edit", {usus: usus, com: com, page: 'comisiones'}); 
            });
        });
    }); 

    // Actualizar comision
    router.put("/", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        //  no_asignado   idusuario   presidente secretario vocal_1 _2 _3
        
        var repe = false;
        if (_.contains([req.body.secretario, req.body.vocal_1, req.body.vocal_2, req.body.vocal_3], req.body.presidente) && (req.body.presidente!='no_asignado')) {
            repe = true;
        } else if (_.contains([req.body.vocal_1, req.body.vocal_2, req.body.vocal_3], req.body.secretario) && (req.body.secretario!='no_asignado')) {
            repe = true;
        } else if (_.contains([req.body.vocal_2, req.body.vocal_3], req.body.vocal_1) && (req.body.vocal_1!='no_asignado')) {
            repe = true;
        } else if ((req.body.vocal_3 == req.body.vocal_2) && (req.body.vocal_2!='no_asignado')) {
            repe = true;
        };
        
        if (repe) {
            req.flash("error", mensajes.miembros_repes_comision);
            res.redirect('/comisiones');
        } else {
            var insertQuery="";
            var cont=0;
            var insertQuery2="INSERT INTO comisiones (idprofesor, curso, rol) VALUES ?";
            var nuevoMiembroComision=[];
            if (req.body.presidente!='no_asignado'){
                insertQuery+=" (?,?,'presidente')";
                nuevoMiembroComision[cont]=[req.body.presidente,req.user.idcurso,'presidente'];
                cont++;
            };
            if (req.body.secretario!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,'secretario')";
                nuevoMiembroComision[cont]=[req.body.secretario,req.user.idcurso,'secretario'];
                cont++;
            };
            if (req.body.vocal_1!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,'vocal')";
                nuevoMiembroComision[cont]=[req.body.vocal_1,req.user.idcurso,'vocal'];
                cont++;
            };
            if (req.body.vocal_2!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,'vocal')";
                nuevoMiembroComision[cont]=[req.body.vocal_2,req.user.idcurso,'vocal'];
                cont++;
            };
            if (req.body.vocal_3!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,'vocal')";
                nuevoMiembroComision[cont]=[req.body.vocal_3,req.user.idcurso,'vocal'];
                cont++;
            };
            console.log("a: "+JSON.stringify(nuevoMiembroComision));
            console.log("b: "+JSON.stringify(insertQuery));
            db.pool.query("DELETE FROM comisiones WHERE curso = ?",req.user.idcurso, function(err, borrado, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query(insertQuery2,[nuevoMiembroComision], function(err, rows) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    }

                    req.flash("success", mensajes.modificar_comision);
                    res.redirect('/comisiones');
                });
            });
        }
    });



    return router;
}