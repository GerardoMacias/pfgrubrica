
var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");
var _ = require('underscore');

module.exports = function(db){
    var router  = express.Router(({mergeParams: true}));
    var middleware = require("../middleware")(db); 


    // Mostrar información de cursos
    router.get("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        selectQuery="SELECT * FROM cursos ORDER BY idcurso";
        db.pool.query(selectQuery,[req.user.idcurso], function(err, cur, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };

            res.render("cursos", {cur: cur, page: 'cursos'}); 
        });

    });

    router.delete("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        selectQuery="SELECT * FROM cursos ORDER BY idcurso";
        db.pool.query(selectQuery, function(err, cur, fields) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            };
            if (cur.length<=1){
                // sólo un curso
                req.flash("error", mensajes.unico_curso);
                res.redirect('/cursos');
            } else {
                var borrar=req.user.idcurso;
                var nuevo=cur[cur.length-2].idcurso;
                updateQuery="UPDATE cursos SET es_actual=1 WHERE idcurso = ?"
                db.pool.query(updateQuery,[nuevo], function(err, rows) {
                    if(err){ // Control del error
                        console.log('SQL Connection error: ', err);
                        req.flash("error", mensajes.error_db);
                        res.redirect('/');
                    }
                    
                    db.pool.query("DELETE FROM cursos WHERE idcurso=?",[req.user.idcurso], function(err, rows, fields) {
                        if(err){ // Control del error
                            console.log('SQL Connection error: ', err);
                            req.flash("error", mensajes.error_db);
                            res.redirect('/');
                        };

                        req.flash("success", mensajes.baja_curso);
                        res.redirect('/cursos');
                    });
                });
            };
        });
    });


    // Mostrar frm de edicion de comision
    router.post("/", middleware.isLoggedIn, middleware.esAdmin, function(req, res){
        // com
        var actual=req.user.idcurso;
        
        var nuevo=(parseInt(actual.substr(0,4))+1)+'/'+(parseInt(actual.substr(5,4))+1);
        
        var insertQuery="INSERT INTO cursos (idcurso, es_actual) VALUES (?,1)";
        db.pool.query(insertQuery,[nuevo], function(err, rows) {
            if(err){ // Control del error
                console.log('SQL Connection error: ', err);
                req.flash("error", mensajes.error_db);
                res.redirect('/');
            }

            updateQuery="UPDATE cursos SET es_actual=0 WHERE idcurso = ?"
            db.pool.query(updateQuery,[actual], function(err, rows) {
                if(err){ // Control del error
                    console.log('SQL Connection error: ', err);
                    req.flash("error", mensajes.error_db);
                    res.redirect('/');
                }

                req.flash("success", mensajes.alta_curso);
                res.redirect('/cursos');
            });
        });
    }); 



    return router;
}