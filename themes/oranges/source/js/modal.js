function openFullscreen(element) {
    var modal = document.getElementById("fullscreenModal");
    var modalImg = document.getElementById("fullscreenImage");
    var caption = document.getElementById("caption");

    modal.style.display = "block";
    modalImg.src = element.getAttribute("data-fullsize");
    caption.innerHTML = element.getAttribute("data-caption");
  }
  
function closeFullscreen() {
    var modal = document.getElementById("fullscreenModal");
    modal.style.display = "none";
  }