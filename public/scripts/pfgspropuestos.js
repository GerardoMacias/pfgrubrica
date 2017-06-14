
// Configuración de la tabla que muestra los proyectos propuestos a elegir por los alumnos
$(document).ready(function(){
    var tablaPFGsProp = $('#tabla_pfgs_prop').DataTable({
        paging: false,
        searching: false,
        bInfo : false,
        "language": {
                "url": "https://cdn.datatables.net/plug-ins/1.10.15/i18n/Spanish.json"
        }
    });

    // // Si hace click
    // $('#tabla_pfgs_prop tbody').on('click', 'tr', function(){
    //     var data = tablaPFGsProp.row(this).data();
    //     //alert( 'You clicked on '+data[6]+'\'s row' );
    //     window.location = "/usuarios/"+data[1];    
    // });

    $('#form_sel_pfgs_prop tbody').on('click', 'tr', function(){
        $(this).toggleClass('selected');
    });


    // Validación: requiere los tres selects
    $('#form_sel_pfgs_prop').validate({
        rules: {
            sel_pr1: {
                required: true
            },
            sel_pr2: {
                required: true
            },
            sel_pr3: {
                required: true
            }
        },
        messages: {
            sel_pr1: { 
                required: "Debe seleccionar un proyecto." 
            },
            sel_pr2: {
                required: "Debe seleccionar un proyecto." 
            },
            sel_pr3: {
                required: "Debe seleccionar un proyecto." 
            }
        }
    });

    // // Deshabilita los mismos pfgs ya escogidos en los otros selects
    // $("select").change(function(){

    //     $("select option").prop("disabled",false); //enable everything

    //     //collect the values from selected;
    //     var arr = $.map($("select option:selected"), function(n){
    //         return n.value;
    //     });

    //     // disable
    //     $("select option").filter(function(){
    //         return $.inArray($(this).val(),arr)>-1; //if value is in the array of selected values
    //     }).prop("disabled",true);   

    // });


});




