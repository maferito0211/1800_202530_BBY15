// Import necessary Firebase and Mapbox libraries
import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "firebase/firestore";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const pageTitle = "🗺️MAP";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

//global variable for user location
let userPosition = null;

async function loadLocations(map) {
  const querySnapshot = await getDocs(collection(db, "locations"));
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const { name, lat, lng, category } = data;
    const locationId = docSnap.id; // Firestore doc ID

    // ------------------ MARKER HTML ELEMENT ------------------
    const el = document.createElement("div");
    el.className = "custom-marker";

    if (category === "Education") {
      el.style.backgroundImage = "url('/images/icons/education.png')";
    } else if (category === "Groceries") {
      el.style.backgroundImage = "url('/images/icons/groceries.png')";
    } else if (category === "Banks") {
      el.style.backgroundImage = "url('/images/icons/bank.png')";
    } else if (category === "Government") {
      el.style.backgroundImage = "url('/images/icons/government.png')";
    } else if (category === "Pharmacies") {
      el.style.backgroundImage = "url('/images/icons/pharmacy.png')";
    } else if (category === "Shopping") {
      el.style.backgroundImage = "url('/images/icons/shopping.png')";
    } else {
      el.style.backgroundImage = "url('/images/icons/default.png')";
    }

    el.style.width = "32px";
    el.style.height = "32px";
    el.style.backgroundSize = "cover";
    el.style.cursor = "pointer";

    // ------------------ DISTANCE CALCULATION ------------------
    let distanceText = "";

    if (userPosition) {
      const km = getDistanceKm(
        userPosition[1], // user lat
        userPosition[0], // user lng
        lat,
        lng
      );

      if (km < 1) {
        distanceText = `${Math.round(km * 1000)} m away`;
      } else {
        distanceText = `${km.toFixed(1)} km away`;
      }
    } else {
      distanceText = "Distance unavailable";
    }

    // ---------------- POPUP HTML (Distance + Forums Link) ----------------
    const popupHTML = `
      <h5>${name}</h5>
      <p>${category}</p>
      <p><strong>${distanceText}</strong></p>

      <a 
        href="./forum-main.html?locationId=${locationId}" 
        class="map-related-link"
      >
        View related posts
      </a>
    `;

    // ------------------ CREATE MARKER ------------------
    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
      .addTo(map);

    // Smooth zoom on click
    el.addEventListener("click", () => {
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true,
      });
    });

    // Save in global array
    markers.push({ marker, name, category, locationId });
  });
}

//Convert getCurrentPosition into a Promise so we can AWAIT it
//crea una función wrapper
function getUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });
}

function showMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // Default center (BCIT) before geolocation resolves
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/standard",
    center: [-123.00163752324765, 49.25324576104826],
    zoom: 12,
  });

  map.addControl(new mapboxgl.NavigationControl());

  map.once("load", async () => {
    try {
      // WAIT for geolocation
      userPosition = await getUserLocation();

      // Zoom to user
      map.flyTo({
        center: userPosition,
        zoom: 14,
        essential: true,
      });

      addUserPin(map);
    } catch (err) {
      console.warn("Geolocation failed:", err);
      addUserPin(map);
    }

    // NOW userPosition is ready — safe to load markers
    await loadLocations(map);
    setupFilters(map);
    setupSearch();

    // "Locate Me" button still works
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

//Function to get the user distance to the locations
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // returns km
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
