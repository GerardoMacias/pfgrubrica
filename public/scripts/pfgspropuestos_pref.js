

// Configuración de la tabla que muestra los proyectos propuestos a elegir por los alumnos
$(document).ready(function(){


    var tablaPFGsProp = $('#tabla_pfgs_p').DataTable({
        paging: true,
        "pageLength": 50,
        searching: true,
        bInfo : false,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        },
        "columns": [
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
    
    $("#tabla_pfgs_p tr").css('cursor', 'pointer');

    // $('#form_sel_pfgs_prop tbody').on('click', 'tr', function(){
    //     $(this).toggleClass('selected');
    // });


    $('#tabla_pfgs_p tbody').on('click', 'tr', function(){
        var data = tablaPFGsProp.row(this).data();
        //console.log(data[0] + " + " + data);
        window.location = "/pfgspropuestos/asignar/"+data[0];    
    });



});