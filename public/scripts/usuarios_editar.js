$(document).ready(function(){

    // Validación: requiere los tres selects
    $('#form_edit_usuario').validate({
        rules: {
            nombre: {
                required: true
            },
            apellidos: {
                required: true
            },
            expediente: {
                required: true
            },
            dni: {
                required: true,
                minlength: 9,
                maxlength: 9
            },
            email: {
                required: true,
                email: true
            },
            confirmar_password: {
                equalTo: "#password"
            }
        },
        messages: {
            nombre: "Campo requerido.",
            apellidos: "Campo requerido.",
            expediente: "Campo requerido.",
            dni: {
                required: "Campo requerido.",
                minlength: "Debe contener 9 caracteres.",
                maxlength: "Debe contener 9 caracteres."
            },
            email: {
                required: "Campo requerido."
            },
            confirmar_password: {
                equalTo: "La contraseña no coincide."
            }
        }
    });

});