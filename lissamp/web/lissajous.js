// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

const fps = 50;
var isMoving = false;

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

function toggleFullscreen() {
  var elem = document.getElementById("glcanvas");

  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

function resizeCanvasToDisplaySize(canvas) {
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  const needResize = canvas.width  !== displayWidth ||
                     canvas.height !== displayHeight;
  if (needResize) {
    canvas.width  = displayHeight;
    canvas.height = displayHeight;
  }
}


function oldRandomize() {
  // old random function that created strange patterns due to triple draws
  setInput('x_freq', Math.floor(Math.random() * 150) + 1);
  setInput('y_freq', Math.floor(Math.random() * 150) + 1);
  setInput('samples', Math.floor(Math.random() * 300) + 10);
}

function randomize() {
  document.getElementById('x_freq').value = Math.floor(Math.random() * 150) + 1;
  document.getElementById('x_freq').dispatchEvent(new Event('input'));
  document.getElementById('y_freq').value = Math.floor(Math.random() * 150) + 1;
  document.getElementById('y_freq').dispatchEvent(new Event('input'));
  document.getElementById('samples').value = Math.floor(Math.random() * 300) + 10;
  document.getElementById('samples').dispatchEvent(new Event('input'));
  document.querySelector('#options').dispatchEvent(new Event('input'));
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
  // navigator.clipboard.writeText(url.toString());
  console.log(`can't copy to clipboard when serving so jsyk we copied ${url.toString()}`)
  blinkSpan('copied');
}

function hexToRgb(hex) {
  // returns an array of rgb values from 0 to 1
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

async function setupgl(gl) {
  // setup gl
  var color = hexToRgb(document.getElementById('animationColor').value);
  console.log(color);
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
      gl_FragColor = vec4(${color.r}, ${color.g}, ${color.b}, 1.0);
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
  resizeCanvasToDisplaySize(gl.canvas);
  side = Math.min(gl.canvas.width, gl.canvas.height);
  var vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var shaderProgram = gl.getParameter(gl.CURRENT_PROGRAM);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);
  gl.viewport(0, 0, side, side);
  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);
};

window.addEventListener('DOMContentLoaded', function () {
  const drawing = document.getElementById('drawing');
  const options = document.getElementById('options');
  console.log('hi from DOMContentLoaded');
  this.document.querySelector('#animationToggle').checked = true;

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
      this.classList.toggle("active");
      var content = this.parentElement.querySelector('.buttonContent');
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }

  // update color when animationColor changed
  document.getElementById('animationColor').addEventListener('input', function() {
    setupgl(gl);
  });

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
    if (document.querySelector('#animationToggle').checked) {
      var animationSpeed = document.getElementById('animationSpeed').value;
      if (document.getElementById('radioX').checked) {
        input_id = 'x_phase';
      } else if (document.getElementById('radioY').checked) {
        input_id = 'y_phase';
      } else if (document.getElementById('radioXY').checked) {
        var phaseX = document.getElementById('x_phase').value;
        var phaseY = document.getElementById('y_phase').value;
        // divide by sqrt(2) bc of pythagorean theorem
        phaseX = Number(phaseX) + 0.1 * (animationSpeed / 50 / Math.sqrt(2));
        phaseY = Number(phaseY) + 0.1 * (animationSpeed / 50 / Math.sqrt(2));
        if (phaseX >= 360) { phaseX = 0; }
        if (phaseY >= 360) { phaseY = 0; }
        // don't use setInput bc it would trigger a duplicate draw here
        document.getElementById('x_phase').value = phaseX;
        document.getElementById('x_phase').dispatchEvent(new Event('input'));
        document.getElementById('y_phase').value = phaseY;
        document.getElementById('y_phase').dispatchEvent(new Event('input'));
        options.dispatchEvent(new Event('input'));
        return;
      }
      var phase_input = document.getElementById(input_id)
      var phase = phase_input.value;
      phase = Number(phase) + 0.1 * (animationSpeed / 50);
      if (phase >= 360) {
        phase = 0;
      }
      setInput(input_id, phase)
      options.dispatchEvent(new Event('input'));
    }
  }

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
    document.querySelector('#animationToggle').click();
  }

  function onmove(e) {
    e.preventDefault();
    if (isMoving) {
      document.querySelector('#animationToggle').checked = false;
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
