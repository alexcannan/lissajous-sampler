// relies on https://svgjs.dev/docs/3.0/

console.log('hi from lissajous.js');

const fps = 50;
var isMoving = false;
const initialCameraEye = [2.2, 2.0, 2.2];
const initialCameraRadius = Math.hypot(initialCameraEye[0], initialCameraEye[1], initialCameraEye[2]);
var cameraYaw = Math.atan2(initialCameraEye[2], initialCameraEye[0]);
var cameraPitch = Math.asin(initialCameraEye[1] / initialCameraRadius);
var cameraRadius = initialCameraRadius;
var lastPointerX = null;
var lastPointerY = null;
var lastPointerTime = null;
var cameraAutoYawSpeed = 0;
const cameraOrbitSpeed = 0.01;
const cameraAutoYawScale = 0.1;
const cameraPitchLimit = degrees_to_radians(85);
var hudEnabled = false;
var hudElement = null;
var hudLastFrameStartMs = null;
var hudAvgFrameMs = null;
var hudAvgRenderMs = null;

function degrees_to_radians(degrees) {
  return degrees * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCameraEye() {
  const cosPitch = Math.cos(cameraPitch);
  return [
    cameraRadius * cosPitch * Math.cos(cameraYaw),
    cameraRadius * Math.sin(cameraPitch),
    cameraRadius * cosPitch * Math.sin(cameraYaw),
  ];
}

function perspectiveMatrix(fovyRadians, aspect, near, far) {
  const f = 1.0 / Math.tan(fovyRadians / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function lookAtMatrix(eye, center, up) {
  let zx = eye[0] - center[0];
  let zy = eye[1] - center[1];
  let zz = eye[2] - center[2];
  let zLen = Math.hypot(zx, zy, zz);
  zx /= zLen;
  zy /= zLen;
  zz /= zLen;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  let xLen = Math.hypot(xx, xy, xz);
  xx /= xLen;
  xy /= xLen;
  xz /= xLen;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const out = new Float32Array(16);
  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

function identityMatrix() {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
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
  const useStructuredRandom = Math.random() < 0.92;
  let xf;
  let yf;
  let zf;
  let sampleCount;

  if (useStructuredRandom) {
    const ratioTriples = [
      [1, 2, 3],
      [2, 3, 5],
      [3, 4, 5],
      [3, 5, 7],
      [4, 5, 6],
      [5, 7, 9],
      [5, 8, 13],
      [7, 9, 11],
    ];
    const ratio = [...ratioTriples[Math.floor(Math.random() * ratioTriples.length)]];
    ratio.sort(function() { return Math.random() - 0.5; });
    const maxRatio = Math.max(ratio[0], ratio[1], ratio[2]);
    const scaleMax = Math.max(1, Math.floor(300 / maxRatio));
    const scale = Math.floor(Math.random() * scaleMax) + 1;
    xf = ratio[0] * scale;
    yf = ratio[1] * scale;
    zf = ratio[2] * scale;
    if (Math.random() < 0.8) {
      // Heavily bias toward lower sample counts for chunkier, alias-rich shapes.
      sampleCount = Math.floor(10 + Math.pow(Math.random(), 1.8) * 900);
    } else {
      // Occasionally render dense curves for contrast.
      sampleCount = Math.floor(10 + Math.random() * 4990);
    }
  } else {
    // Keep some chance of true unconstrained random values.
    xf = Math.floor(Math.random() * 300) + 1;
    yf = Math.floor(Math.random() * 300) + 1;
    zf = Math.floor(Math.random() * 300) + 1;
    sampleCount = Math.floor(10 + Math.random() * 4990);
  }

  document.getElementById('x_freq').value = xf;
  document.getElementById('x_freq').dispatchEvent(new Event('input'));
  document.getElementById('y_freq').value = yf;
  document.getElementById('y_freq').dispatchEvent(new Event('input'));
  document.getElementById('z_freq').value = zf;
  document.getElementById('z_freq').dispatchEvent(new Event('input'));
  document.getElementById('samples').value = sampleCount;
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
  url.searchParams.set('zf', document.getElementById('z_freq').value);
  url.searchParams.set('samples', document.getElementById('samples').value);
  navigator.clipboard.writeText(url.toString());
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
    precision mediump float;
    attribute vec3 coordinates;
    uniform mat4 model;
    uniform mat4 view;
    uniform mat4 projection;
    void main(void) {
      gl_Position = projection * view * model * vec4(coordinates, 1.0);
      gl_PointSize = 10.0;
    }`;
  var fragCode = `
    precision mediump float;
    void main(void) {
      gl_FragColor = vec4(${color.r}, ${color.g}, ${color.b}, 1.0);
    }`;
  var vertShader = compileShader(gl, gl.VERTEX_SHADER, vertCode);
  var fragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragCode);
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(shaderProgram));
  }
  gl.useProgram(shaderProgram);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.03, 0.03, 0.03, 1.0);
}

async function drawLissajous(gl,
                             x_freq,
                             y_freq,
                             z_freq,
                             samples,
                             x_phase=0,
                             y_phase=0,
                             z_phase=0) {
  const frameStartMs = performance.now();
  const sampleCount = Math.max(Number(samples), 1);
  var vertices = [];
  for (var i = 0; i <= sampleCount; i++) {
    var t = i / sampleCount;
    var w = 2 * Math.PI * t;
    var x = Math.sin(x_freq * w + degrees_to_radians(x_phase));
    var y = Math.sin(y_freq * w + degrees_to_radians(y_phase));
    var z = Math.sin(z_freq * w + degrees_to_radians(z_phase));
    vertices.push(x, y, z);
  }
  resizeCanvasToDisplaySize(gl.canvas);
  const side = Math.min(gl.canvas.width, gl.canvas.height);
  var vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var shaderProgram = gl.getParameter(gl.CURRENT_PROGRAM);
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);
  gl.viewport(0, 0, side, side);
  const modelLocation = gl.getUniformLocation(shaderProgram, "model");
  const viewLocation = gl.getUniformLocation(shaderProgram, "view");
  const projectionLocation = gl.getUniformLocation(shaderProgram, "projection");
  const model = identityMatrix();
  const view = lookAtMatrix(getCameraEye(), [0, 0, 0], [0, 1, 0]);
  const projection = perspectiveMatrix(degrees_to_radians(50), 1, 0.1, 100);
  gl.uniformMatrix4fv(modelLocation, false, model);
  gl.uniformMatrix4fv(viewLocation, false, view);
  gl.uniformMatrix4fv(projectionLocation, false, projection);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);

  if (hudEnabled && hudElement !== null) {
    const renderMs = performance.now() - frameStartMs;
    const frameMs = hudLastFrameStartMs === null ? null : frameStartMs - hudLastFrameStartMs;
    hudLastFrameStartMs = frameStartMs;
    hudAvgRenderMs = hudAvgRenderMs === null ? renderMs : hudAvgRenderMs * 0.9 + renderMs * 0.1;
    if (frameMs !== null) {
      hudAvgFrameMs = hudAvgFrameMs === null ? frameMs : hudAvgFrameMs * 0.9 + frameMs * 0.1;
    }
    const fpsText = hudAvgFrameMs === null ? "--" : (1000 / hudAvgFrameMs).toFixed(1);
    const frameText = hudAvgFrameMs === null ? "--" : hudAvgFrameMs.toFixed(2);
    const renderText = hudAvgRenderMs.toFixed(2);
    const utilText = hudAvgFrameMs === null ? "--" : ((hudAvgRenderMs / hudAvgFrameMs) * 100).toFixed(0);
    hudElement.textContent = `fps ${fpsText}\nframe ${frameText}ms\nrender ${renderText}ms\nutil ${utilText}%`;
  }
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
  hudEnabled = (params.hud || "").toLowerCase() === "true";
  if (hudEnabled) {
    hudElement = document.createElement('div');
    hudElement.style.position = 'absolute';
    hudElement.style.top = '8px';
    hudElement.style.left = '8px';
    hudElement.style.padding = '4px 6px';
    hudElement.style.background = 'rgba(0, 0, 0, 0.55)';
    hudElement.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    hudElement.style.color = '#d6e5f5';
    hudElement.style.fontFamily = 'monospace';
    hudElement.style.fontSize = '10px';
    hudElement.style.lineHeight = '1.2';
    hudElement.style.whiteSpace = 'pre';
    hudElement.style.pointerEvents = 'none';
    hudElement.style.zIndex = '30';
    hudElement.textContent = 'fps --\nframe --ms\nrender --ms\nutil --%';
    drawing.appendChild(hudElement);
  }
  starting_xf = params.xf || Math.floor(Math.random() * 150) + 1;
  starting_yf = params.yf || Math.floor(Math.random() * 150) + 1;
  starting_zf = params.zf || Math.floor(Math.random() * 150) + 1;
  starting_zp = params.zp || 0;
  starting_samples = params.samples || Math.floor(Math.random() * 300) + 10;
  setInput('x_freq', starting_xf);
  setInput('y_freq', starting_yf);
  setInput('z_freq', starting_zf);
  setInput('z_phase', starting_zp);
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
                  document.getElementById('z_freq').value,
                  document.getElementById('samples').value,
                  document.getElementById('x_phase').value,
                  document.getElementById('y_phase').value,
                  document.getElementById('z_phase').value);
  });

  function rotate() {
    const animationEnabled = document.querySelector('#animationToggle').checked;
    let cameraUpdated = false;
    if (!isMoving && cameraAutoYawSpeed !== 0) {
      cameraYaw += cameraAutoYawSpeed;
      cameraUpdated = true;
    }
    if (animationEnabled) {
      var animationSpeed = document.getElementById('animationSpeed').value;
      let input_id = null;
      if (document.getElementById('radioX').checked) {
        input_id = 'x_phase';
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
      } else if (document.getElementById('radioY').checked) {
        input_id = 'y_phase';
      }
      if (!input_id) { return; }
      var phase_input = document.getElementById(input_id)
      var phase = phase_input.value;
      phase = Number(phase) + 0.1 * (animationSpeed / 50);
      if (phase >= 360) {
        phase = 0;
      }
      setInput(input_id, phase)
      options.dispatchEvent(new Event('input'));
    }
    if (cameraUpdated && !animationEnabled) {
      options.dispatchEvent(new Event('input'));
    }
  }

  const rotatorInterval = setInterval(rotate, 1000/fps);

  function ondown(e) {
    e.preventDefault();
    isMoving = true;
    cameraAutoYawSpeed = 0;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    lastPointerTime = e.timeStamp;
    if (e.pointerId !== undefined) {
      drawing.setPointerCapture(e.pointerId);
    }
  }

  function onup(e) {
    e.preventDefault();
    isMoving = false;
    lastPointerX = null;
    lastPointerY = null;
    lastPointerTime = null;
    if (e.pointerId !== undefined) {
      drawing.releasePointerCapture(e.pointerId);
    }
  }

  function ondbl(e) {
    e.preventDefault();
    document.querySelector('#animationToggle').click();
  }

  function onmove(e) {
    e.preventDefault();
    if (isMoving) {
      if (lastPointerX === null || lastPointerY === null) {
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerTime = e.timeStamp;
        return;
      }
      var dx = e.clientX - lastPointerX;
      var dy = e.clientY - lastPointerY;
      var dtMs = Math.max(e.timeStamp - lastPointerTime, 1);
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTime = e.timeStamp;
      var yawStep = dx * cameraOrbitSpeed;
      cameraYaw += yawStep;
      cameraAutoYawSpeed = yawStep * (1000 / fps) / dtMs * cameraAutoYawScale;
      cameraPitch = clamp(cameraPitch + dy * cameraOrbitSpeed, -cameraPitchLimit, cameraPitchLimit);
      options.dispatchEvent(new Event('input'));
    }
  }

  drawing.addEventListener('pointerdown', ondown);
  drawing.addEventListener('pointerup', onup);
  drawing.addEventListener('pointercancel', onup);
  drawing.addEventListener('pointermove', onmove);

  drawing.addEventListener('dblclick', ondbl);
});
