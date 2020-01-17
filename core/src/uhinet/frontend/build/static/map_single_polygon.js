var map;
var polygon;
var infoWindow;
var markers = [];
var coords = [];
var overlay;
var drawingManager;
var selectedShape;

function clearSelection () {
    if (selectedShape) {
        if (selectedShape.type !== 'marker') {
            selectedShape.setEditable(false);
        }
        selectedShape = null;
    }
}

function setSelection (shape) {
    if (shape.type !== 'marker') {
        clearSelection();
        shape.setEditable(true);
    }

    selectedShape = shape;
}

function deleteSelectedShape () {
    if (selectedShape) {
        selectedShape.setMap(null);
    }
}

$(function() {
  $('input#send_coords_button').bind('click', function() {
    if (coords.length < 1){
      window.alert('Please create a polygon first.');
      return;
    }
    $.getJSON($SCRIPT_ROOT + '/send_coordinates', {
      a: JSON.stringify(coords),
    }, function(image_name) {
      document.getElementById('test_image').src='/static/' + image_name;
    });
    return false;
  });
});


function initMap () {

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14.1,
        center: new google.maps.LatLng(43.65, -79.4),
        zoomControl: true
    });

    var imageBounds = {
        north: 43.670826,
        south: 43.621760,
        east: -79.360921,
        west: -79.435593
    };

    overlay = new google.maps.GroundOverlay(
        'image.png', imageBounds);

    var Options = {
        strokeWeight: 0,
        fillOpacity: 0.45,
        editable: true,
        draggable: true
    };

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon','rectangle']
        },
        rectangleOptions: Options,
        polygonOptions: Options,
        map: map
    });

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function (shp) {
        var newShape = shp.overlay;
        drawingManager.setDrawingMode(null);
        google.maps.event.addListener(newShape, 'click', function (shp) {
            setSelection(newShape);
        });
        google.maps.event.addListener(newShape,'mouseover', function (shp) {


            var vertices = newShape.getPath();

            var contentString = '<b>Polygon</b><br>';

            for (var i =0; i < vertices.getLength(); i++) {
                var xy = vertices.getAt(i);
                contentString += '<br>' + 'Coordinate ' + i + ':<br>' + xy.lat() + ',' +
                xy.lng();
            }

            console.log(contentString)
        });
        setSelection(newShape);
    });

    google.maps.event.addListener(drawingManager, 'drawingmode_changed', clearSelection);
    google.maps.event.addListener(map, 'click', clearSelection);
    google.maps.event.addDomListener(document.getElementById('delete-button'), 'click', deleteSelectedShape);
    google.maps.event.addDomListener(document, 'keydown', function (e) {
        if (e.key ==="Backspace" || e.key === "Delete") {
            deleteSelectedShape();
        }
     });
}

function clearSelection () {
    if (selectedShape) {
        selectedShape.setEditable(false);
        selectedShape = null;
    }
}

function setSelection (shape) {
    clearSelection();
    shape.setEditable(true);
    selectedShape = shape;
}

function deleteSelectedShape () {
    if (selectedShape) {
        selectedShape.setMap(null);
    }
}

function addOverlay(){
  overlay.setMap(map);
}

function removeOverlay(){
  overlay.setMap(null);
}

google.maps.event.addDomListener(window, 'load', initialize);