
$(document).ready(function () {

    var siguiente_id = 2;

    $(".anadirPregunta").on("click", function(evento){
        evento.preventDefault();
        if (siguiente_id<6) {
            var id = siguiente_id++;
            var nueva_pregunta = ''+
                '<div class="row form-group preg_'+id+'">'+
                '<div class="col-lg-2 col-md-2 col-sm-2 col-xs-12">'+
                '</div>'+
                '<div class="col-lg-8 col-md-8 col-sm-8 col-xs-12">'+
                '    <input class="form-control" type="text" id="preg_'+id+'" name="preg['+id+']" placeholder="Pregunta" required autofocus>'+
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


});

