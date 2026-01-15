var userLocationMarker = null;
var userLocationCoords = null;

function initTomTomMap(apiKey) {
  console.log('Initializing TomTom Map...');
  
  const checkContainer = setInterval(function() {
    const container = document.getElementById('tomtom-map');
    
    if (container) {
      clearInterval(checkContainer);
      console.log('Container found, creating map...');
      
      tt.setProductInfo("FlutterWebApp", "1.0");
      
      try {
        window.tomTomMap = tt.map({
          key: apiKey,
          container: "tomtom-map",
          center: [121.0437, 14.6760], // Manila, Philippines
          zoom: 13,
          style: 'https://api.tomtom.com/style/1/style/22.2.1-*?map=basic_main&poi=poi_main'
        });
        
        window.tomTomMap.on('load', function() {
          console.log('TomTom map loaded successfully');
        });
        
      } catch (error) {
        console.error('Error initializing TomTom map:', error);
      }
    }
  }, 50);
  
  setTimeout(function() {
    clearInterval(checkContainer);
  }, 5000);
}

function addUserLocationMarker(lat, lng) {
  console.log('addUserLocationMarker called with:', lat, lng);
  
  if (!window.tomTomMap) {
    console.error('Map not initialized');
    return;
  }

  // Remove existing marker if any
  if (userLocationMarker) {
    console.log('Removing existing marker');
    userLocationMarker.remove();
  }

  // Store coordinates
  userLocationCoords = [lng, lat];

  // Create marker container
  var markerContainer = document.createElement('div');
  markerContainer.className = 'user-location-marker-container';
  
  // Create accuracy circle
  var accuracyCircle = document.createElement('div');
  accuracyCircle.className = 'accuracy-circle';
  markerContainer.appendChild(accuracyCircle);
  
  // Create marker dot
  var markerDot = document.createElement('div');
  markerDot.className = 'user-location-marker';
  markerContainer.appendChild(markerDot);

  // Add marker to map with bottom anchor
  userLocationMarker = new tt.Marker({
    element: markerContainer,
    anchor: 'bottom'
  })
    .setLngLat([lng, lat])
    .addTo(window.tomTomMap);

  // Animate to location
  window.tomTomMap.flyTo({
    center: [lng, lat],
    zoom: 16,
    duration: 1500,
    essential: true
  });

  console.log('User location marker added successfully at:', lat, lng);
}

function recenterToUserLocation() {
  console.log('Recentering to user location');
  
  if (!window.tomTomMap || !userLocationCoords) {
    console.error('Map or user location not available');
    return;
  }

  window.tomTomMap.flyTo({
    center: userLocationCoords,
    zoom: 16,
    duration: 1000,
    essential: true
  });

  console.log('Map recentered to user location');
}