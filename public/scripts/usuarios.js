
// Configuración de la tabla de usuarios
$(document).ready(function(){
    var tablaUsuarios = $('#listadoUsuarios').DataTable({
        searching: true,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        },
        "columnDefs": [
            {
                "targets": [ 0 ],
                "visible": false,
                "searchable": false
            }
        ]
    });

    $('#listadoUsuarios tbody').on('click', 'tr', function(){
        var data = tablaUsuarios.row(this).data();
        //alert( 'You clicked on '+data[6]+'\'s row' );
        window.location = "/usuarios/"+data[0];    
    });
});