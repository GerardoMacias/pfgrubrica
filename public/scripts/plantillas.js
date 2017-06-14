
// Configuración de la tabla de usuarios
$(document).ready(function(){
    var tablaPlantillas = $('#listadoPlantillas').DataTable({
        searching: true,
        info: false,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        },
        "columns": [
            { "visible": false, "searchable": false },
            null,
            null         
        ]
    });

    $('#listadoPlantillas tbody').on('click', 'tr', function(){
        var data = tablaPlantillas.row(this).data();

        window.location = "/plantillas/"+data[0];    
    });
});