"use strict";

console.log("OCR: Using Tesseract.js version " + Tesseract.version);

var res;

var scale;

var showBoundingBoxes = true;
var boundingBoxColor = "#00ff00";

var showText = true;
var fontSize = 24;
var textColor = "#0000ff";

var confidenceThreshold = 70;

var options = {lang: "eng"};

function setLanguage(lang) {
  options["lang"] = lang;
}

function setBlacklist(blacklist) {
  if (blacklist === "") {
    delete options["tessedit_char_blacklist"];
  } else {
    options["tessedit_char_blacklist"] = blacklist;
  }
}

// setWhiteList("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
function setWhitelist(whitelist) {
  if (whitelist === "") {
    delete options["tessedit_char_whitelist"];
  } else {
    options["tessedit_char_whitelist"] = whitelist;
  }
}

function clear() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function recognize(image) {
  Tesseract.recognize(image, options)
  .progress(function (p) {
    console.log("progress", p);
    OCR.reportProgress(p.status);
  })
  .then(function (result) {
    var textString = "";
    if (showBoundingBoxes) {
      result.words.forEach(function(w) {
        if (w.confidence > confidenceThreshold) {
          var b = w.bbox;
          ctx.lineWidth = 4;
          ctx.strokeStyle = boundingBoxColor;
          ctx.strokeRect(b.x0 * scale, b.y0 * scale, (b.x1 - b.x0) * scale, (b.y1 - b.y0) * scale);
          if (showText) {
            ctx.font = fontSize + "px sans-serif";
            // ctx.textBaseline = "hanging";
            var width = ctx.measureText(w.text).width;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(b.x0 * scale, b.y0 * scale - fontSize, width, fontSize);
            ctx.fillStyle = textColor;
            ctx.fillText(w.text, b.x0 * scale, b.y0 * scale);
          }
          textString += w.text + " ";
        }
      });
    }
    res = result;
    console.log("result", result);
    // OCR.reportResult(result.text);
    OCR.reportResult(textString);
  });
}

var overlay = document.createElement("canvas");
overlay.style.position = "absolute";
overlay.width = 0;
overlay.height = 0;
var ctx = overlay.getContext("2d");

var img = document.createElement("img");
img.width = 500;

var isImageShowing = true;
img.style.display = "block";

var video = document.createElement("video");
video.setAttribute("autoplay", "");
video.setAttribute("playsinline", "");
video.width = 500;
video.style.display = "none";

var frontFacing = false;
var isPlaying = false;
var isVideoMode = false;

document.body.appendChild(overlay);
document.body.appendChild(img);
document.body.appendChild(video);

video.addEventListener("loadedmetadata", function() {
  video.height = this.videoHeight * video.width / this.videoWidth;
}, false);

function startVideo() {
  if (!isPlaying && isVideoMode) {
    navigator.mediaDevices.getUserMedia({video: {facingMode: frontFacing ? "user" : "environment"}, audio: false})
    .then(stream => (video.srcObject = stream))
    .catch(e => log(e));
    isPlaying = true;
    video.style.display = "block";
  }
}

function stopVideo() {
  if (isPlaying && isVideoMode && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    isPlaying = false;
    video.style.display = "none";
  }
}

function toggleCameraFacingMode() {
  frontFacing = !frontFacing;
  stopVideo();
  startVideo();
}

function recognizeImageData(imageData) {
  if (!isVideoMode) {
    img.onload = function() {
      clear();
      overlay.width = img.width;
      overlay.height = img.height;
      scale = img.width / img.naturalWidth;
      recognize(img);
    }
    img.src = "data:image/png;base64," + imageData;
  }
}

function recognizeVideoData() {
  if (isPlaying && isVideoMode) {
    overlay.width = video.width;
    overlay.height = video.height;
    scale = video.width / video.videoWidth;
    recognize(video);
  }
}

function showImage() {
  if (!isImageShowing && !isVideoMode) {
    img.style.display = "block";
    isImageShowing = true;
  }
}

function hideImage() {
  if (isImageShowing) {
    img.style.display = "none";
    isImageShowing = false;
  }
}

function setInputMode(inputMode) {
  if (inputMode === "image" && isVideoMode) {
    clear();
    stopVideo();
    isVideoMode = false;
    showImage();
  } else if (inputMode === "video" && !isVideoMode) {
    clear();
    hideImage();
    isVideoMode = true;
    startVideo();
  }
}

function setInputWidth(width) {
  clear();
  img.width = width;
  video.width = width;
  video.height = video.videoHeight * width / video.videoWidth;
}

OCR.ready();
