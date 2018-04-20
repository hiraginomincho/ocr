function recognize_image(){
  var image = new Image();
  image.src = "abbey_road.JPG";

  image.onload = function() {
    OCRAD(image, function(text){
      console.log(text);
    });
  }
}

recognize_image();