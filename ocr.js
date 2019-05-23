"use strict";

console.log("OCR: Using Tesseract.js version " + Tesseract.version);

class Word {
  constructor(word, x0, y0, x1, y1, confidence, endOfWord) {
    this.word = word;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.confidence = confidence;
    this.endOfWord = endOfWord;
  }
}

var wordList = [];
var text = "";
var filteredWordList = [];
var filteredText = "";

var res;

var scale;

var boundingBoxColor = "#00ff00";

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

function filterText() {
  filteredWordList = [];
  for (let i = 0; i < wordList.length; i++) {
    var word = new Word(wordList[i].word, wordList[i].x0, wordList[i].y0, wordList[i].x1, wordList[i].y1, wordList[i].confidence, wordList[i].endOfWord);
    filteredWordList.push(word);
  }
  var i = 0;
  while (i < filteredWordList.length) {
    if (filteredWordList[i].confidence < confidenceThreshold) {
      if (i > 0) {
        filteredWordList[i - 1].endOfWord = filteredWordList[i].endOfWord;
      }
      filteredWordList.splice(i, 1);
    } else {
      i++;
    }
  }
  filteredText = "";
  for (let i = 0; i < filteredWordList.length; i++) {
    filteredText += filteredWordList[i].word + filteredWordList[i].endOfWord;
  }
}

function drawBoundingBox(i, label) {
  console.log("drawBoundingBox with i " + i + " and label " + label);
  console.log("overlay is " + overlay.width + " by " + overlay.height);
  ctx.lineWidth = 4;
  ctx.strokeStyle = boundingBoxColor;
  console.log(wordList[i].x0 * scale);
  console.log(wordList[i].y0 * scale);
  console.log((wordList[i].x1 - wordList[i].x0) * scale);
  console.log((wordList[i].y1 - wordList[i].y0) * scale);
  console.log("--");
  ctx.strokeRect(wordList[i].x0 * scale, wordList[i].y0 * scale, (wordList[i].x1 - wordList[i].x0) * scale, (wordList[i].y1 - wordList[i].y0) * scale);
  if (label !== "") {
    console.log("adding label");
    ctx.font = fontSize + "px sans-serif";
    // ctx.textBaseline = "hanging";
    var displayText = decodeURIComponent(label); // wordList[i].word + " - " + wordList[i].confidence.toFixed(1);
    var width = ctx.measureText(displayText).width;
    console.log("width is " + width);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(wordList[i].x0 * scale, wordList[i].y0 * scale - fontSize, width, fontSize);
    ctx.fillStyle = textColor;
    ctx.fillText(displayText, wordList[i].x0 * scale, wordList[i].y0 * scale);
  }
}

function setConfidence(confidence) {
  confidenceThreshold = confidence;
  filterText();
  OCR.gotFilteredText(filteredText);
  // drawBoundingBoxes();
}

function listWords() {
  var wList = [];
  for (let i = 0; i < wordList.length; i++) {
    var wordAndConfidence = [];
    wordAndConfidence.push(wordList[i].word);
    wordAndConfidence.push(wordList[i].confidence);
    wList.push(wordAndConfidence);
  }
  return wList;
}

function recognize(image) {
  wordList = [];
  Tesseract.recognize(image, options)
  .progress(function (p) {
    console.log("progress", p);
    OCR.gotProgress(p.status);
  })
  .then(function (result) {
    text = result.text;
    var index = 0;
    result.words.forEach(function(w) {
      var wordLoc = result.text.indexOf(w.text, index);
      if (wordLoc === -1) {
        console.log("ERROR");
      } else {
        var word = new Word(w.text, w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1, w.confidence, "");
        wordList.push(word);
        if (wordList.length > 1) {
          wordList[wordList.length - 2].endOfWord = result.text.substring(index, wordLoc);
          index += result.text.substring(index, wordLoc).length;
        }
        index += w.text.length;
      }
    });
    wordList[wordList.length - 1].endOfWord = result.text.substring(index);
    filterText();
    res = result;
    console.log("OCR: result is " + text);
    clear();
    OCR.gotText(text);
    OCR.gotFilteredText(filteredText);
    OCR.gotWords(JSON.stringify(listWords()));
  });
}

var overlay = document.createElement("canvas");
overlay.style.position = "absolute";
overlay.width = 0;
overlay.height = 0;
var ctx = overlay.getContext("2d");

var img = document.createElement("img");
img.width = window.innerWidth;
img.style.display = "block";

var video = document.createElement("video");
video.setAttribute("autoplay", "");
video.setAttribute("playsinline", "");
video.width = window.innerWidth;
video.style.display = "none";

var frontFacing = false;
var isVideoMode = false;

document.body.appendChild(overlay);
document.body.appendChild(img);
document.body.appendChild(video);

video.addEventListener("loadedmetadata", function() {
  video.height = this.videoHeight * video.width / this.videoWidth;
  overlay.width = video.width;
  overlay.height = video.height;
  scale = video.width / video.videoWidth;
}, false);

function startVideo() {
  if (isVideoMode) {
    navigator.mediaDevices.getUserMedia({video: {facingMode: frontFacing ? "user" : "environment"}, audio: false})
    .then(stream => (video.srcObject = stream))
    .catch(e => console.log(e));
    video.style.display = "block";
  }
}

function stopVideo() {
  if (isVideoMode && video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
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
      console.log("before: overlay is " + overlay.width + " by " + overlay.height);
      overlay.width = img.width;
      overlay.height = img.height;
      console.log("after: overlay is " + overlay.width + " by " + overlay.height);
      scale = img.width / img.naturalWidth;
      recognize(img);
    }
    img.src = "data:image/png;base64," + imageData;
  }
}

function recognizeVideoData() {
  if (isVideoMode) {
    recognize(video);
  }
}

function setInputMode(inputMode) {
  if (inputMode === "image" && isVideoMode) {
    clear();
    stopVideo();
    isVideoMode = false;
    img.style.display = "block";
  } else if (inputMode === "video" && !isVideoMode) {
    clear();
    img.style.display = "none";
    isVideoMode = true;
    startVideo();
  }
}

window.addEventListener("resize", function() {
  console.log("in resize");
  // clear();
  img.width = window.innerWidth;
  video.width = window.innerWidth;
  video.height = video.videoHeight * window.innerWidth / video.videoWidth;
  if (isVideoMode) {
    overlay.width = video.width;
    overlay.height = video.height;
    scale = video.width / video.videoWidth;
  }
});

OCR.ready();
