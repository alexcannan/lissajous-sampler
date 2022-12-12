// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

var isMoving = false;

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

async function drawLissajous(draw,
                             x_freq,
                             y_freq,
                             samples,
                             x_phase=0,
                             y_phase=0) {
  var x_prev;
  var y_prev;
  var bounds = draw.getBoundingClientRect();
  var width = bounds.width;
  var height = bounds.height;
  var x_amp = width / 2 * 0.9;
  var y_amp = height / 2 * 0.9;
  for (var i = 0; i <= samples; i++) {
    var w = (2 * Math.PI * i) / samples;
    var x = x_amp * Math.sin(x_freq * w + degrees_to_radians(x_phase)) + width / 2;
    var y = y_amp * Math.sin(y_freq * w + degrees_to_radians(y_phase)) + height / 2;
    if (i > 0) {
      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x_prev.toFixed(2));
      line.setAttribute('y1', y_prev.toFixed(2));
      line.setAttribute('x2', x.toFixed(2));
      line.setAttribute('y2', y.toFixed(2));
      draw.appendChild(line);
    }
    x_prev = x;
    y_prev = y;
  }
};

window.addEventListener('DOMContentLoaded', function () {
  const drawing = document.getElementById('drawing');
  const options = document.getElementById('options');
  console.log('hi from DOMContentLoaded');

  var draw = document.createElementNS("http://www.w3.org/2000/svg",'svg');
  drawing.appendChild(draw);
  drawLissajous(draw, 10, 14, 100);

  options.addEventListener('input', function() {
    draw.innerHTML = '';
    drawLissajous(draw,
                  document.getElementById('x_freq').value,
                  document.getElementById('y_freq').value,
                  document.getElementById('samples').value,
                  document.getElementById('x_phase').value,
                  document.getElementById('y_phase').value);
  });

  drawing.addEventListener('mousedown' , function(e) {
    isMoving = true;
  });

  drawing.addEventListener('mouseup' , function(e) {
    isMoving = false;
  });

  drawing.addEventListener('mousemove', function(e) {
    if (isMoving) {
      var bounds = drawing.getBoundingClientRect();
      var x = e.clientX - bounds.left;
      var y = e.clientY - bounds.top;
      var x_phase = (x / bounds.width) * 360;
      var y_phase = (y / bounds.height) * 360;
      document.getElementById('x_phase').value = x_phase;
      document.getElementById('x_phase').dispatchEvent(new Event('input'));
      document.getElementById('y_phase').value = y_phase;
      document.getElementById('y_phase').dispatchEvent(new Event('input'));
      draw.innerHTML = '';
      drawLissajous(draw,
                    document.getElementById('x_freq').value,
                    document.getElementById('y_freq').value,
                    document.getElementById('samples').value,
                    x_phase,
                    y_phase);
    }
  });
});
