
// Configuración de la tabla que muestra los proyectos propuestos a elegir por los alumnos
$(document).ready(function(){


    var tablaPFGsProp = $('#tabla_pfgs').DataTable({
        paging: true,
        "pageLength": 50,
        searching: false,
        bInfo : false,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        },
        "columns": [
            { "visible": false, "searchable": false },
            { "visible": false, "searchable": false },
            { "visible": false, "searchable": false },
            { "visible": false, "searchable": false },
            null,
            null,
            null,
            null,
            null
        ]
    });
    
    $("#tabla_pfgs tr").css('cursor', 'pointer');

    // $('#form_sel_pfgs_prop tbody').on('click', 'tr', function(){
    //     $(this).toggleClass('selected');
    // });


    $('#tabla_pfgs tbody').on('click', 'tr', function(){
        var data = tablaPFGsProp.row(this).data();
        window.location = "/pfgs/"+data[0];    
    });

});
