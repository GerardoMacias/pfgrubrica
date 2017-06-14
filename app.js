// app.js

// preparacion ==========================================================================

// importar lo necesario
var express               = require('express'),
    session               = require('express-session'),
    app                   = express(),
    morgan                = require('morgan'),
    bodyParser            = require('body-parser'),
    cookieParser          = require('cookie-parser'),
    mysql                 = require('mysql'),
    flash                 = require('connect-flash'),
    passport              = require('passport'),
    LocalStrategy         = require('passport-local'),
    methodOverride        = require('method-override'),
    bcrypt                = require('bcrypt-nodejs'),
    path                  = require('path');

// configuración ========================================================================

// conexión a la base de datos
const db = require('./server/db.js');

// entorno
const env = require('./server/env.js');
const PORT = env.PORT;
const HOST = env.HOST;

// configurar nuestra aplicación de express
app.use(morgan('dev')); // mostrar en la consola cada request

// Para extraer el body de una request entrante y pasarlo a formato json, más facil para trabajar
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json()); 
app.set('view engine', 'ejs'); // configurar EJS para procesar las páginas web en el servidor 
//app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser('secret')); // leer cookies (necesario para la auth)


// serve public files
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride("_method"));
app.use(flash()); // connect-flash para mensajes guardados en la sesion

// configurar passport
app.use(session({
    secret: env.PASSPORT_SECRET,
    resave: false, // no escribir automaticamente a la sesión // do not automatically write to the session store
    saveUninitialized: false // saved new sessions
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions




// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
    // serializamos en la sesión el id del usuario
    done(null, user.dni);
});

// used to deserialize the user
passport.deserializeUser(function(user, done) {
    // con el id sacamos los datos del usuario y el curso actual,
    // que incorporamos en los datos de usuario para tener dicha información
    db.pool.query("SELECT u.*, c.idcurso FROM usuarios AS u, cursos AS c WHERE dni = ? AND c.es_actual = 1", [user], function(err, rows){ 
        done(err, rows[0]);
    });
});

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
    'local-register',
    new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'dni',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
        // find a user whose dni is the same as the forms dni
        // we are checking to see if the user trying to login already exists
        db.pool.query("SELECT * FROM usuarios WHERE dni = ?",[username], function(err, rows) {
            if (err)
                return done(err);
            if (rows.length) {
                return done(null, false, req.flash('signupMessage', 'El DNI ya existe.'));
            } else {
                // if there is no user with that dni
                // create the user
                var newUserMysql = {
                    dni:        req.body.dni,
                    nombre:     req.body.nombre,
                    apellidos:  req.body.apellidos,
                    expediente: req.body.expediente,
                    email:      req.body.email,
                    rol: 0,
                    admin: 0,
                    password: bcrypt.hashSync(password, null, null) 
                };

                // Averiguar el curso actual. Incorporarlo a la información de usuario para la sesión
                db.pool.query("SELECT idcurso FROM cursos WHERE es_actual like 1", function(err, rows, fields) {
                    if(!err) {
                        newUserMysql.idcurso = rows[0].idcurso;
                    }

                    var insertQuery = "INSERT INTO usuarios ( dni, nombre, apellidos, expediente, email, rol, admin, password ) values (?,?,?,?,?,?,?,?)";

                    db.pool.query(insertQuery, [
                            newUserMysql.dni, 
                            newUserMysql.nombre, 
                            newUserMysql.apellidos, 
                            newUserMysql.expediente, 
                            newUserMysql.email, 
                            newUserMysql.rol, 
                            newUserMysql.admin, 
                            newUserMysql.password
                        ],function(err, rows) {
                        newUserMysql.idusuarios = rows.insertId;

                        return done(null, newUserMysql, req.flash("success", "Bienvenido " + newUserMysql.nombre));
                    });
                })
            }
        });
    })
);

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
    'local-login',
    new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'dni',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with email and password from our form
        // Buscar al usuario
        db.pool.query("SELECT * FROM usuarios WHERE dni = ?",[username], function(err, rows){
            // Gestionar el error
            if (err)
                return done(err);
            // No se encuentra al usuario
            if (!rows.length) {
                // req.flash is the way to set flashdata using connect-flash
                return done(null, false, req.flash('loginMessage', 'No se encuentra el usuario.')); 
            }

            // if the user is found but the password is wrong
            if (!bcrypt.compareSync(password, rows[0].password))
                // create the loginMessage and save it to session as flashdata
                return done(null, false, req.flash('loginMessage', 'Contraseña equivocada.')); 

            var newUserMysql = {};

            newUserMysql = rows[0];

            // Averiguar el curso actual. Incorporarlo a la información de usuario para la sesión
            db.pool.query("SELECT idcurso FROM cursos WHERE es_actual LIKE 1", function(err, r, fields) {
                if(!err) {
                    newUserMysql.idcurso = r[0].idcurso;
                    console.log("CCC: " + JSON.stringify(newUserMysql));
                    // all is well, return successful user
                    return done(null, newUserMysql, req.flash("success", "Bienvenido " + newUserMysql.nombre));
                }
            })
        });
    })
);



// REQUERIR LAS RUTAS ===================================================================
//require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport



// MIDDLEWARE
// wherever function we provide to it, it will be called on every route
app.use(function(req, res, next){
    res.locals.usuarioActual = req.user; // pass usuarioActual to every template 
    res.locals.error = req.flash("error"); // if there is anything in the flash we will have access to it in the template
    res.locals.success = req.flash("success"); 
    next();
});

// ROUTES
var indexRoutes  = require('./routes/index')(db);
var usuariosRoutes   = require('./routes/usuarios')(db);
var pfgPropuestosRoutes   = require('./routes/pfgspropuestos')(db);
var plantillasRoutes   = require('./routes/plantillas')(db);
var seccionesRoutes   = require('./routes/secciones')(db);
var pfgsRoutes   = require('./routes/pfgs')(db);
var rubricasRoutes   = require('./routes/rubricas')(db);
var tribunalRoutes   = require('./routes/tribunal')(db);
var comisionesRoutes   = require('./routes/comisiones')(db);
var cursosRoutes   = require('./routes/cursos')(db);

// acortar rutas
app.use("/", indexRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/pfgspropuestos", pfgPropuestosRoutes);
app.use("/plantillas", plantillasRoutes);
app.use("/plantillas/:id_p/secciones", seccionesRoutes);
app.use("/pfgs", pfgsRoutes);
app.use("/rubricas", rubricasRoutes);
app.use("/pfgs/:id_p/tribunal", tribunalRoutes);
app.use("/comisiones", comisionesRoutes);
app.use("/cursos", cursosRoutes);


app.listen(PORT, HOST, function(){
    console.log("Server started: Express listening on http://%s:%s", HOST, PORT);
});

