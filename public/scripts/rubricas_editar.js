    
$(document).ready(function () {


    var tablaRubrica = $('#tabla_rubrica').DataTable({
        searching: false,
        paging: false,
        ordering: false,
        info: false,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        },
        "columns": [
            { "visible": false },
            { "width": "5%" },
            null,
            { "visible": false },
            { "width": "30%" },
            { "width": "5%" }      
        ]

    });

    $('#tabla_rubrica tbody').on('click', 'tr', function(){
        var data = tablaRubrica.row(this).data();
        
        window.location = "/rubricas/"+data[3]+"/criterios/"+data[0];    
    });


});

