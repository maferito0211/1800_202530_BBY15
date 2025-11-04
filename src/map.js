// Import necessary Firebase and Mapbox libraries
import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "firebase/firestore";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

async function loadLocations(map) {
  const querySnapshot = await getDocs(collection(db, "locations"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const { name, lat, lng, category } = data;

    /* ---------------------  MARKERS ------------------------*/
    // Create a custom HTML element for the marker
    const el = document.createElement("div");
    el.className = "custom-marker";

    // Optionally: change marker color or image based on category
    if (data.category === "Education") {
      el.style.backgroundImage = "url('/images/icons/education.png')";
    } else if (data.category === "Groceries") {
      el.style.backgroundImage = "url('/images/icons/groceries.png')";
    } else if (data.category === "Banks") {
      el.style.backgroundImage = "url('/images/icons/bank.png')";
    } else if (data.category === "Government") {
      el.style.backgroundImage = "url('/images/icons/government.png')";
    } else if (data.category === "Pharmacies") {
      el.style.backgroundImage = "url('/images/icons/pharmacy.png')";
    } else {
      el.style.backgroundImage = "url('/images/icons/default.png')";
    }

    // Marker styling (make sure they are visible and clickable)
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.backgroundSize = "cover";
    el.style.cursor = "pointer";

    // Create a new marker using your custom element
    const marker = new mapboxgl.Marker(el)
      .setLngLat([data.lng, data.lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          `<h5>${data.name}</h5><p>${data.category}</p>`
        )
      )
      .addTo(map);

    // 🔹 Add zoom animation when the marker is clicked
    el.addEventListener("click", () => {
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true,
      });
    });

    // Store for filters
    markers.push({ marker, name, category });
  });
}

// 🔹 This function filters markers based on the search box input
function setupSearch() {
  // Select the search input element
  const searchBox = document.getElementById("searchBox");

  // Listen for every keystroke
  searchBox.addEventListener("input", () => {
    // Convert typed text to lowercase for case-insensitive matching
    const query = searchBox.value.toLowerCase();

    // Go through every marker and check if it matches the search
    markers.forEach(({ marker, name, category }) => {
      const matches =
        name.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query);

      // Show or hide marker based on match
      marker.getElement().style.display = matches ? "block" : "none";
    });
  });
}

function showMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN; // put token in .env
  // BCIT location 49.25324576104826, -123.00163752324765  Centered at BCIT
  const map = new mapboxgl.Map({
    container: "map", // <div id="map"></div>
    style: "mapbox://styles/mapbox/standard", // any Mapbox style
    center: [-123.00163752324765, 49.25324576104826],
    zoom: 10,
  });
  // Adds the zoom and rotation controls to the top-right corner of the map.
  // This helps users navigate the map manually.
  map.addControl(new mapboxgl.NavigationControl());

  // Wait for map to finish loading before running setup
  map.once("load", async () => {
    addUserPin(map);
    await loadLocations(map); // Load Firebase markers
    setupFilters(map);
    setupSearch(); // Search bar

    // 🔹 Locate Me button logic
    const locateBtn = document.getElementById("locateBtn");
    if (locateBtn) {
      locateBtn.addEventListener("click", () => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          map.flyTo({
            center: coords,
            zoom: 14,
            essential: true,
          });
        });
      });
    }
  });
}

//-----------------------------------------------------
// Add pin for showing where the user is.
// This is a separate function so that we can use a different
// looking pin for the user.
// This version uses a pin that is just a circle.
//------------------------------------------------------
function addUserPin(map) {
  // Adds user's current location as a source to the map
  navigator.geolocation.getCurrentPosition((position) => {
    const userLocation = [position.coords.longitude, position.coords.latitude];
    console.log(userLocation);
    if (userLocation) {
      map.addSource("userLocation", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: userLocation,
              },
              properties: {
                description: "Your location",
              },
            },
          ],
        },
      });

      // Creates a layer above the map displaying the pins
      // Add a layer showing the places.
      map.addLayer({
        id: "userLocation",
        type: "circle", // what the pins/markers/points look like
        source: "userLocation",
        paint: {
          // customize colour and size
          "circle-color": "blue",
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  });
}

function setupFilters(map) {
  const buttons = document.querySelectorAll("#filters button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.category;

      markers.forEach(({ marker, category }) => {
        if (selected === "All" || category === selected) {
          marker.getElement().style.display = "block";
        } else {
          marker.getElement().style.display = "none";
        }
      });
    });
  });
}

// Global array to store all map markers (so we can show/hide/filter them)
let markers = [];

showMap();
