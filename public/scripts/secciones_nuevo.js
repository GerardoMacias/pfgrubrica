
$(document).ready(function () {


    var sum = 0;
    $(".pesos").each(function(){
        sum += +$(this).val();
    });
    $(".suma_total").val(sum);

    $(document).on("change", ".pesos", function() {
        var sum = 0;
        $(".pesos").each(function(){
            sum += +$(this).val();
        });
        $(".suma_total").val(sum);
    });

    $('#formAltaSecciones').submit(function() {
        if (parseInt($(".suma_total").val()) != 100 ) {
            alert('La suma de los pesos debe ser 100.');
            return false;
        }
    });

    
});