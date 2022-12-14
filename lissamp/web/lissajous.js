// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

var isMoving = false;
var isRotating = true;

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

function toggleFullscreen() {
  // TODO
  console.log('need to implement toggleFullscreen');
}

function randomize() {
  // randomize parameters
  setInput('x_freq', Math.floor(Math.random() * 150) + 1);
  setInput('y_freq', Math.floor(Math.random() * 150) + 1);
  setInput('samples', Math.floor(Math.random() * 300) + 10);
}

function blinkSpan(spanId) {
  // given a span id, display for 1 second then fade
  var span = document.getElementById(spanId);
  var op = 1;
  span.style.display = 'inline';
  span.style.opacity = op;
  var timer = setInterval(function() {
    if (op <= 0.2) {
      clearInterval(timer);
      span.style.display = 'none';
    }
    span.style.opacity = op;
    span.style.filter = 'alpha(opacity=' + op * 100 + ")";
    op -= op * 0.02;
  }, 25);
}

function setInput(name, value) {
  // set input value and trigger input event to display
  document.getElementById(name).value = value;
  document.getElementById(name).dispatchEvent(new Event('input'));
  document.querySelector('#options').dispatchEvent(new Event('input'));
}

function copyLink() {
  // copies link with current parameters to clipboard
  var url = new URL(window.location.href);
  url.searchParams.set('xf', document.getElementById('x_freq').value);
  url.searchParams.set('yf', document.getElementById('y_freq').value);
  url.searchParams.set('samples', document.getElementById('samples').value);
  navigator.clipboard.writeText(url.toString());
  blinkSpan('copied');
}

async function setupgl(gl) {
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
  const optionsButton = document.getElementById('optionsButton');
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

  setupgl(gl);

  // read query parameters or select random start
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  starting_xf = params.xf || Math.floor(Math.random() * 150) + 1;
  starting_yf = params.yf || Math.floor(Math.random() * 150) + 1;
  starting_samples = params.samples || Math.floor(Math.random() * 300) + 10;
  setInput('x_freq', starting_xf);
  setInput('y_freq', starting_yf);
  setInput('samples', starting_samples);

  // collapsable buttons
  var coll = document.getElementsByClassName("collapsable");
  var i;
  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      console.log(`hi from collapsible click for ${this.id}`)
      this.classList.toggle("active");
      var content = this.parentElement.querySelector('.buttonContent');
      console.log(content, content.id)
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }

  // allow users to edit options with text input
  var outputs = document.querySelectorAll("output");
  var i;
  for (i = 0; i < outputs.length; i++) {
    outputs[i].addEventListener("keydown", function(e) {
      if (e.key === 'Enter') {
        setInput(this.parentElement.querySelector('input').id, this.value);
        e.preventDefault();
      }
    });
  }

  // automatically draw
  options.addEventListener('input', function() {
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
      setInput('x_phase', x_phase)
      options.dispatchEvent(new Event('input'));
    }
  }

  const fps = 50;
  const rotatorInterval = setInterval(rotate, 1000/fps);

  function ondown(e) {
    e.preventDefault();
    isMoving = true;
  }

  function onup(e) {
    e.preventDefault();
    isMoving = false;
  }

  function ondbl(e) {
    e.preventDefault();
    isRotating = !isRotating;
  }

  function onmove(e) {
    e.preventDefault();
    if (isMoving) {
      isRotating = false;
      var bounds = drawing.getBoundingClientRect();
      var x = e.clientX - bounds.left;
      var y = e.clientY - bounds.top;
      var x_phase = (x / bounds.width) * 360;
      var y_phase = (y / bounds.height) * 360;
      setInput('x_phase', x_phase);
      setInput('y_phase', y_phase);
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
