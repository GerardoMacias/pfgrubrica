
var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");
var _ = require('underscore');

module.exports = function(db){
    var router  = express.Router(({mergeParams: true}));
    var middleware = require("../middleware")(db); 


    // // Mostrar información de tribunal
    // router.get("/", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
    //     // son 5 componentes del tribunal
    //     // presidente secretario y 3 vocales

    //     selectQuery="SELECT p.*, u.nombre AS u_n, u.apellidos AS u_a FROM pfgs AS p, usuarios AS u "+
    //                 "WHERE p.tutor = u.idusuarios AND p.idpfg =? AND p.curso =?";
    //     db.pool.query(selectQuery,[req.params.id_p,req.user.idcurso], function(err, pfg, fields) {
    //         if(err){ // Control del error
    //             console.log('SQL Connection error: ', err);
    //             req.flash("error", mensajes.error_db);
    //             res.redirect('/');
    //         };
            

    //         selectQuery="SELECT t.*, u.nombre AS u_n, u.apellidos AS u_a FROM tribunales AS t, usuarios AS u "+
    //                     "WHERE t.idprofesor = u.idusuarios AND t.idpfg=? AND t.curso=?";
    //         db.pool.query(selectQuery,[req.params.id_p,req.user.idcurso], function(err, trib, fields) {
    //             if(err){ // Control del error
    //                 console.log('SQL Connection error: ', err);
    //                 req.flash("error", mensajes.error_db);
    //                 res.redirect('/');
    //             };
    //             console.log("trib : " + JSON.stringify(trib));
    //             console.log("trib : " + req.params.id_p);
    //             console.log("trib : " + req.user.idcurso);

    //             res.render("tribunal/show", {pfg: pfg[0], trib: trib, page: 'pfgs'}); 
    //         });
    //     });
    // });


    // Mostrar frm de edicion de tribunal
    router.get("/edit", middleware.isLoggedIn, middleware.esComisionAdmin, function(req, res){
        selectQuery="SELECT p.*, u.nombre AS u_n, u.apellidos AS u_a FROM pfgs AS p, usuarios AS u "+
                    "WHERE p.tutor = u.idusuarios AND p.idpfg =? AND p.curso =?";
        db.pool.query(selectQuery,[req.params.id_p,req.user.idcurso], function(err, pfg, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            // usuarios que no son tutor del proyecto 
            selectQuery="SELECT DISTINCT u.* FROM usuarios AS u, pfgs AS p "+
                        "WHERE u.idusuarios != p.tutor AND u.rol = 1 AND u.admin = 0 AND p.idpfg = ? ORDER BY u.idusuarios";
            db.pool.query(selectQuery,[req.params.id_p] , function(err, usus, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                // tribunal
                selectQuery="SELECT t.*, u.nombre AS u_n, u.apellidos AS u_a FROM tribunales AS t, usuarios AS u "+
                            "WHERE t.idprofesor = u.idusuarios AND t.idpfg=? AND t.curso=? ORDER BY t.idprofesor";
                db.pool.query(selectQuery,[req.params.id_p,req.user.idcurso], function(err, trib, fields) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    };
                    console.log("trib : " + JSON.stringify(trib));
                    console.log("trib : " + req.params.id_p);
                    console.log("trib : " + req.user.idcurso);

                    res.render("tribunal/edit", {pfg: pfg[0], usus: usus, trib: trib, page: 'pfgs'}); 
                });

            });

        });
    }); 

    // Actualizar tribunal
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
            req.flash("error", mensajes.miembros_repes_tribunal);
            res.redirect('/pfgs/'+req.params.id_p);
        } else {
            var insertQuery="";
            var cont=0;
            var insertQuery2="INSERT INTO tribunales (idpfg, idprofesor, curso, rol) VALUES ?";
            var nuevoMiembroTribunal=[];
            if (req.body.presidente!='no_asignado'){
                insertQuery+=" (?,?,?,'presidente')";
                nuevoMiembroTribunal[cont]=[req.params.id_p,req.body.presidente,req.user.idcurso,'presidente'];
                cont++;
            };
            if (req.body.secretario!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,?,'secretario')";
                nuevoMiembroTribunal[cont]=[req.params.id_p,req.body.secretario,req.user.idcurso,'secretario'];
                cont++;
            };
            if (req.body.vocal_1!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,?,'vocal')";
                nuevoMiembroTribunal[cont]=[req.params.id_p,req.body.vocal_1,req.user.idcurso,'vocal'];
                cont++;
            };
            if (req.body.vocal_2!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,?,'vocal')";
                nuevoMiembroTribunal[cont]=[req.params.id_p,req.body.vocal_2,req.user.idcurso,'vocal'];
                cont++;
            };
            if (req.body.vocal_3!='no_asignado'){
                if (cont>0) insertQuery+=",";
                insertQuery+=" (?,?,?,'vocal')";
                nuevoMiembroTribunal[cont]=[req.params.id_p,req.body.vocal_3,req.user.idcurso,'vocal'];
                cont++;
            };
            console.log("a: "+JSON.stringify(nuevoMiembroTribunal));
            console.log("b: "+JSON.stringify(insertQuery));
            db.pool.query("DELETE FROM tribunales WHERE idpfg = ?",req.params.id_p, function(err, borrado, fields) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                };

                db.pool.query(insertQuery2,[nuevoMiembroTribunal], function(err, rows) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    }

                    req.flash("success", mensajes.modificar_tribunal);
                    res.redirect('/pfgs/'+req.params.id_p);
                });
            });
        }
    });



    return router;
}

//console.log("a: "+JSON.stringify(pfg[0]));