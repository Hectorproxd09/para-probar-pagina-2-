/* Código JS para activar animaciones */
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".anim-fadeIn, .anim-slide, .anim-bounce").forEach((element) => {
    element.classList.add("play");
  });
});
