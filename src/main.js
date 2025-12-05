function sayHello() {}
// document.addEventListener('DOMContentLoaded', sayHello);

function disappear() {
  let popup = document.getElementById("popupcontainer");
  popup.style.display = "none";

  //Bring the user to the map Page
  window.location.href = "map.html";
}

// display page title
const pageTitle = "MAIN PAGE";
document.getElementById("pageTitleSection").innerHTML = pageTitle;
