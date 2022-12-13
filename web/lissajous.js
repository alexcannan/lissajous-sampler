// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

var isMoving = false;
var isRotating = true;

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

async function clearCanvas(gl) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT)
}

async function drawLissajous(gl,
                             x_freq,
                             y_freq,
                             samples,
                             x_phase=0,
                             y_phase=0) {
  var vertices = [];
  for (var i = 0; i <= samples; i++) {
    var w = (2 * Math.PI * i) / samples;
    var x = Math.sin(x_freq * w + degrees_to_radians(x_phase));
    var y = Math.sin(y_freq * w + degrees_to_radians(y_phase));
    vertices.push(x, y, 0)
  }
  var width = gl.canvas.width;
  var height = gl.canvas.height;
  var vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var shaderProgram = gl.getParameter(gl.CURRENT_PROGRAM);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);
  gl.viewport(0, 0, width, height);
  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);
};

window.addEventListener('DOMContentLoaded', function () {
  const drawing = document.getElementById('drawing');
  const options = document.getElementById('options');
  console.log('hi from DOMContentLoaded');

  const glcanvas = document.getElementById('glcanvas');
  var bounds = glcanvas.getBoundingClientRect();
  glcanvas.width = bounds.width;
  glcanvas.height = bounds.height;
  const gl = glcanvas.getContext('webgl');

  if (gl === null) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  console.log(gl.getParameter(gl.VERSION), gl.getParameter(gl.SHADING_LANGUAGE_VERSION));

  // setup gl
  var vertCode = `
    attribute vec3 coordinates;
    void main(void) {
      gl_Position = vec4(coordinates, 1.0);
      gl_PointSize = 10.0;
    }`;
  var vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertCode);
  gl.compileShader(vertShader);
  var fragCode = `
    void main(void) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 0.2);
    }`;
  var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragCode);
  gl.compileShader(fragShader);
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);

  drawLissajous(gl, 10, 14, 100);

  options.addEventListener('input', function() {
    clearCanvas(gl);
    drawLissajous(gl,
                  document.getElementById('x_freq').value,
                  document.getElementById('y_freq').value,
                  document.getElementById('samples').value,
                  document.getElementById('x_phase').value,
                  document.getElementById('y_phase').value);
  });

  function rotate() {
    // rotates x phase on pageload and after doubleclick
    if (isRotating) {
      const x_phase_input = document.getElementById('x_phase')
      var x_phase = x_phase_input.value;
      x_phase = Number(x_phase) + Number(x_phase_input.step);
      if (x_phase >= 360) {
        x_phase = 0;
      }
      document.getElementById('x_phase').value = x_phase;
      document.getElementById('x_phase').dispatchEvent(new Event('input'));
      options.dispatchEvent(new Event('input'));
    }
  }

  const fps = 50;
  const rotatorInterval = setInterval(rotate, 1000/fps);

  function ondown(e) {
    isMoving = true;
  }

  function onup(e) {
    isMoving = false;
  }

  function ondbl(e) {
    isRotating = !isRotating;
  }

  function onmove(e) {
    if (isMoving) {
      isRotating = false;
      var bounds = drawing.getBoundingClientRect();
      var x = e.clientX - bounds.left;
      var y = e.clientY - bounds.top;
      var x_phase = (x / bounds.width) * 360;
      var y_phase = (y / bounds.height) * 360;
      document.getElementById('x_phase').value = x_phase;
      document.getElementById('x_phase').dispatchEvent(new Event('input'));
      document.getElementById('y_phase').value = y_phase;
      document.getElementById('y_phase').dispatchEvent(new Event('input'));
      clearCanvas(gl);
      drawLissajous(gl,
                    document.getElementById('x_freq').value,
                    document.getElementById('y_freq').value,
                    document.getElementById('samples').value,
                    x_phase,
                    y_phase);
    }
  }

  drawing.addEventListener('mousedown', ondown);
  drawing.addEventListener('pointerdown', ondown);

  drawing.addEventListener('mouseup', onup);
  drawing.addEventListener('pointerup', onup);

  drawing.addEventListener('mousemove', onmove);
  drawing.addEventListener('pointermove', onmove);

  drawing.addEventListener('dblclick', ondbl);
});
