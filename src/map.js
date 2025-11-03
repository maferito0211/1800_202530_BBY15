import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "firebase/firestore";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// This function loads all location data from Firestore
// and displays it on the map as red pins with popups.
async function loadMapData(map) {
  // Get all documents from the "locations" collection
  const querySnapshot = await getDocs(collection(db, "locations"));

  // Loop through each document
  querySnapshot.forEach((doc) => {
    const data = doc.data(); // Extract all the document's fields
    const { name, lat, lng, category } = data; // Destructure for convenience

    // Create a marker for each document
    //  Store it in a variable so we can use it later for filtering
    const marker = new mapboxgl.Marker({ color: "red" })
      .setLngLat([lng, lat]) // Set its position
      .setPopup(
        new mapboxgl.Popup().setHTML(`<h5>${name}</h5><p>${category}</p>`)
      ) // Add popup info
      .addTo(map); // Add it to the map

    // Store both the marker and its category in the global array
    // This lets us show/hide them later based on the selected filter
    markers.push({ marker, category });

    // When user clicks the marker, smoothly fly to it
    marker.getElement().addEventListener("click", () => {
      // This moves the map view to center on the clicked marker
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true,
      });
    });
  });
}

async function loadLocations(map) {
  const querySnapshot = await getDocs(collection(db, "locations"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    new mapboxgl.Marker({ color: "red" })
      .setLngLat([data.lng, data.lat])
      .setPopup(new mapboxgl.Popup().setText(data.name))
      .addTo(map);
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

  // Run setupMap() once when the style loads
  map.once("load", () => setupMap(map)); // run once for the initial style

  //One-time setup function to add layers, sources, etc.
  //You can call additional functions from here to keep things organized.
  function setupMap(map) {
    addUserPin(map);
    loadMapData(map).then(() => setupFilters(map)); //  this line loads your Firebase markers
    //then call filters after markers are loaded

    //add other layers and stuff here
    //addCustomLayer1(map);
    //addCustomLayer2(map);
    //addCustomLayer3(map);
  }
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

let markers = []; // Store all marker objects here

showMap();
