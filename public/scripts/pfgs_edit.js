
$(document).ready(function () {

    $('#formEditSeccion').submit(function() {
        if ($("#alumno").val()=='no_asignado' && $("#propuesto").val()==''){
            alert('Si no asigna el PFG a un alumno debe indicar un código como PFG propuesto.');
            return false;
        };
    });

});
