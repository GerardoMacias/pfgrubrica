    
$(document).ready(function () {
    var siguiente_id = $("input[name=pregs_long]").val();

    $(".anadirPregunta").on("click", function(evento){
        evento.preventDefault();
        if (siguiente_id<6) {
            var id = siguiente_id++;
            var nueva_pregunta = ''+
                '<div class="row form-group preg_'+id+'">'+
                '<div class="col-lg-2 col-md-2 col-sm-2 col-xs-12">'+
                '</div>'+
                '<div class="col-lg-8 col-md-8 col-sm-8 col-xs-12">'+
                '    <input class="form-control" type="text" id="preg_'+id+'" name="preg['+id+']" placeholder="Pregunta" required>'+
                '</div>'+
                '<div class="col-lg-2 col-md-2 col-sm-2 col-xs-12">'+
                '    <input class="form-control" type="text" id="preg_'+id+'" name="peso['+id+']" placeholder="Peso" required>'+
                '</div>'+
                '</div>';
            $('.ancla').before(nueva_pregunta);    
        };
    });

    $(".quitarPregunta").on('click', function(evento){
        evento.preventDefault();
        if (siguiente_id>2) {
            var id = --siguiente_id;
            $('.preg_'+id).remove();
        };
    });

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
            { "visible": false }        
        ]

    });

    $('#tabla_rubrica tbody').on('click', 'tr', function(){
        var data = tablaRubrica.row(this).data();
        //alert( 'You clicked on '+data[6]+'\'s row' );
        window.location = "/plantillas/"+data[3]+"/secciones/"+data[0];    
    });

    // $('#tabla_rubrica tbody').on( 'click', '.b_b', function () {
    //     var data = tablaRubrica.row($(this).parents('tr')).data();
    //     // alert( 'boton bb '+data[0] );
    //     window.location = "/plantillas/"+data[3]+"/secciones/"+data[0]+"/edit";   
    // } );

    // $("#post-btn").click(function(){        
    // $.post("", $("#reg-form").serialize(), function(data) {
    //     alert(data);
    // });
});

