// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

async function drawLissajous(draw,
                             x_freq,
                             y_freq,
                             samples,
                             x_phase=0,
                             y_phase=0) {
  console.log('hi from drawLissajous');
  var x_prev;
  var y_prev;
  var width = 300;
  var height = 300;
  var x_amp = width / 2 * 0.9;
  var y_amp = height / 2 * 0.9;
  for (var i = 0; i <= samples; i++) {
    var w = (2 * Math.PI * i) / samples;
    var x = x_amp * Math.sin(x_freq * w + degrees_to_radians(x_phase)) + width / 2;
    var y = y_amp * Math.sin(y_freq * w + degrees_to_radians(y_phase)) + height / 2;
    if (i > 0) {
      draw.line(x_prev, y_prev, x, y).stroke({width: 1, color: '#f06'});
    }
    x_prev = x;
    y_prev = y;
  }
};


window.addEventListener('DOMContentLoaded', function () {
  console.log('hi from DOMContentLoaded');
  var draw = SVG().addTo('#drawing').size('400', '400');
  drawLissajous(draw, 10, 14, 100);

  const options = document.getElementById('options');
  options.addEventListener('input', function() {
    console.log('hi from options input');
    draw.clear();
    drawLissajous(draw,
                  document.getElementById('x_freq').value,
                  document.getElementById('y_freq').value,
                  document.getElementById('samples').value,
                  document.getElementById('x_phase').value,
                  document.getElementById('y_phase').value);
  });
});
