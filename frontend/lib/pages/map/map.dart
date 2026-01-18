import 'dart:convert' as convert;
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_map/flutter_map.dart' show LatLngBounds, CameraFit;

class MapPage extends StatefulWidget {
  final String apiKey;
  const MapPage({super.key, required this.apiKey});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  bool _isMapInitialized = false;
  bool _isLoadingLocation = false;
  bool _locationShared = false;
  bool _isSearching = false;
  bool _isCalculatingRoute = false;
  bool _isTrackingLocation = false;
  String? _currentAddress;
  latlong.LatLng? _userLocation;
  latlong.LatLng? _destinationLocation;
  String? _destinationAddress;
  List<latlong.LatLng> _routePoints = [];
  List<Map<String, dynamic>> _searchResults = [];
  Map<String, dynamic>? _routeInfo;
  StreamSubscription<Position>? _positionStreamSubscription;

  @override
  void initState() {
    super.initState();
    _isMapInitialized = true;
  }

  @override
  void dispose() {
    _searchController.dispose();
    _positionStreamSubscription?.cancel();
    super.dispose();
  }

  Future<void> _shareMyLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permissions are denied');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permissions are permanently denied. Please enable them in app settings.',
        );
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final lat = position.latitude;
      final lng = position.longitude;

      debugPrint('Location obtained: $lat, $lng');

      _userLocation = latlong.LatLng(lat, lng);
      _mapController.move(_userLocation!, 16.0);

      final address = await _reverseGeocode(lat, lng);

      setState(() {
        _locationShared = true;
        _isLoadingLocation = false;
        _currentAddress = address;
        _userLocation = latlong.LatLng(lat, lng);
      });

      // Start continuous location tracking
      _startLocationTracking();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(address ?? 'Location shared successfully'),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoadingLocation = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    e.toString().contains('permission') || e.toString().contains('denied')
                        ? e.toString()
                        : 'Unable to get your location. Please enable location services.',
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      debugPrint('Error getting location: $e');
    }
  }

  void _startLocationTracking() {
    // Cancel existing subscription if any
    _positionStreamSubscription?.cancel();

    // Set up location settings for continuous tracking
    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update every 10 meters
    );

    // Start listening to position updates
    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      final newLocation = latlong.LatLng(position.latitude, position.longitude);
      
      // Update user location
      setState(() {
        _userLocation = newLocation;
        _isTrackingLocation = true;
      });

      debugPrint('Location updated: ${position.latitude}, ${position.longitude}');

      // If there's an active route, recalculate it
      if (_destinationLocation != null && _routePoints.isNotEmpty) {
        _recalculateRoute();
      }
    });
  }

  void _stopLocationTracking() {
    _positionStreamSubscription?.cancel();
    setState(() {
      _isTrackingLocation = false;
    });
  }

  Future<void> _recalculateRoute() async {
    if (_userLocation == null || _destinationLocation == null) return;

    // Silently recalculate route without showing loading indicator
    try {
      final url = 'https://api.tomtom.com/routing/1/calculateRoute/'
          '${_userLocation!.latitude},${_userLocation!.longitude}:'
          '${_destinationLocation!.latitude},${_destinationLocation!.longitude}/json?'
          'key=${widget.apiKey}'
          '&traffic=true'
          '&travelMode=car';

      final uri = Uri.parse(url);
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = convert.jsonDecode(response.body);
        final routes = data['routes'] as List?;

        if (routes != null && routes.isNotEmpty) {
          final route = routes[0];
          final legs = route['legs'] as List?;

          if (legs != null && legs.isNotEmpty) {
            final points = legs[0]['points'] as List?;

            if (points != null) {
              final routePoints = points.map((point) {
                return latlong.LatLng(
                  point['latitude'] as double,
                  point['longitude'] as double,
                );
              }).toList();

              final summary = route['summary'];
              final lengthInMeters = summary['lengthInMeters'] as int;
              final travelTimeInSeconds = summary['travelTimeInSeconds'] as int;
              final trafficDelayInSeconds = summary['trafficDelayInSeconds'] as int? ?? 0;

              setState(() {
                _routePoints = routePoints;
                _routeInfo = {
                  'distance': _formatDistance(lengthInMeters),
                  'duration': _formatDuration(travelTimeInSeconds),
                  'trafficDelay': _formatDuration(trafficDelayInSeconds),
                };
              });

              debugPrint('Route updated automatically');
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Route recalculation error: $e');
    }
  }

  Future<void> _searchLocation(String query) async {
    if (query.isEmpty) {
      setState(() {
        _searchResults = [];
      });
      return;
    }

    setState(() {
      _isSearching = true;
    });

    try {
      final center = _userLocation ?? const latlong.LatLng(14.6760, 121.0437);
      final url = 'https://api.tomtom.com/search/2/search/$query.json?'
          'key=${widget.apiKey}'
          '&lat=${center.latitude}'
          '&lon=${center.longitude}'
          '&limit=5';
      
      final uri = Uri.parse(url);
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = convert.jsonDecode(response.body);
        final results = data['results'] as List?;

        if (results != null) {
          setState(() {
            _searchResults = results.map((result) {
              return {
                'name': result['poi']?['name'] ?? result['address']?['freeformAddress'] ?? 'Unknown',
                'address': result['address']?['freeformAddress'] ?? '',
                'lat': result['position']?['lat'],
                'lng': result['position']?['lon'],
              };
            }).toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Search error: $e');
    } finally {
      setState(() {
        _isSearching = false;
      });
    }
  }

  Future<void> _calculateRoute(latlong.LatLng destination) async {
    if (_userLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please share your location first'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isCalculatingRoute = true;
      _destinationLocation = destination;
    });

    try {
      final url = 'https://api.tomtom.com/routing/1/calculateRoute/'
          '${_userLocation!.latitude},${_userLocation!.longitude}:'
          '${destination.latitude},${destination.longitude}/json?'
          'key=${widget.apiKey}'
          '&traffic=true'
          '&travelMode=car';

      final uri = Uri.parse(url);
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = convert.jsonDecode(response.body);
        final routes = data['routes'] as List?;

        if (routes != null && routes.isNotEmpty) {
          final route = routes[0];
          final legs = route['legs'] as List?;

          if (legs != null && legs.isNotEmpty) {
            final points = legs[0]['points'] as List?;

            if (points != null) {
              final routePoints = points.map((point) {
                return latlong.LatLng(
                  point['latitude'] as double,
                  point['longitude'] as double,
                );
              }).toList();

              // Extract route info
              final summary = route['summary'];
              final lengthInMeters = summary['lengthInMeters'] as int;
              final travelTimeInSeconds = summary['travelTimeInSeconds'] as int;
              final trafficDelayInSeconds = summary['trafficDelayInSeconds'] as int? ?? 0;

              setState(() {
                _routePoints = routePoints;
                _routeInfo = {
                  'distance': _formatDistance(lengthInMeters),
                  'duration': _formatDuration(travelTimeInSeconds),
                  'trafficDelay': _formatDuration(trafficDelayInSeconds),
                };
              });

              // Fit bounds to show entire route
              _fitRouteBounds();
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Route calculation error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to calculate route'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isCalculatingRoute = false;
      });
    }
  }

  void _fitRouteBounds() {
    if (_routePoints.isEmpty) return;

    double minLat = _routePoints[0].latitude;
    double maxLat = _routePoints[0].latitude;
    double minLng = _routePoints[0].longitude;
    double maxLng = _routePoints[0].longitude;

    for (var point in _routePoints) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }

    final bounds = LatLngBounds(
      latlong.LatLng(minLat, minLng),
      latlong.LatLng(maxLat, maxLng),
    );

    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.all(50),
      ),
    );
  }

  String _formatDistance(int meters) {
    if (meters < 1000) {
      return '$meters m';
    } else {
      final km = (meters / 1000).toStringAsFixed(1);
      return '$km km';
    }
  }

  String _formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;

    if (hours > 0) {
      return '$hours h ${minutes} min';
    } else {
      return '$minutes min';
    }
  }

  Future<String?> _reverseGeocode(double lat, double lng) async {
    try {
      final url = 'https://api.tomtom.com/search/2/reverseGeocode/$lat,$lng.json?key=${widget.apiKey}';
      final uri = Uri.parse(url);
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = convert.jsonDecode(response.body);
        return _parseAddress(data);
      }
    } catch (e) {
      debugPrint('Reverse geocode error: $e');
    }
    return null;
  }

  String? _parseAddress(dynamic data) {
    final addresses = data['addresses'] as List?;

    if (addresses != null && addresses.isNotEmpty) {
      final address = addresses[0]['address'] as Map<String, dynamic>?;
      if (address != null) {
        final freeformAddress = address['freeformAddress'] as String?;
        if (freeformAddress != null && freeformAddress.isNotEmpty) {
          return freeformAddress;
        }

        final parts = <String>[];
        if (address['streetName'] != null) parts.add(address['streetName']);
        if (address['municipality'] != null) parts.add(address['municipality']);
        if (address['countrySubdivision'] != null) parts.add(address['countrySubdivision']);
        if (address['postalCode'] != null) parts.add(address['postalCode']);
        if (address['country'] != null) parts.add(address['country']);

        return parts.isNotEmpty ? parts.join(', ') : 'Current Location';
      }
    }
    return 'Current Location';
  }

  void _recenterMap() {
    if (!_locationShared || _userLocation == null) return;
    _mapController.move(_userLocation!, 16.0);
  }

  void _clearRoute() {
    setState(() {
      _routePoints = [];
      _destinationLocation = null;
      _destinationAddress = null;
      _routeInfo = null;
      _searchResults = [];
      _searchController.clear();
    });
    
    // Continue tracking location even after clearing route
    debugPrint('Route cleared, location tracking continues');
  }

  void _selectSearchResult(Map<String, dynamic> result) {
    final lat = result['lat'] as double;
    final lng = result['lng'] as double;
    final destination = latlong.LatLng(lat, lng);

    setState(() {
      _destinationAddress = result['address'];
      _searchResults = [];
      _searchController.text = result['name'];
    });

    _calculateRoute(destination);
  }

  Widget _buildMapView() {
    final center = _userLocation ?? const latlong.LatLng(14.6760, 121.0437);

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: _userLocation != null ? 16.0 : 13.0,
        minZoom: 3.0,
        maxZoom: 19.0,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.all,
          enableMultiFingerGestureRace: true,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${widget.apiKey}',
          userAgentPackageName: 'com.project.logistics',
          tileSize: 256,
          maxZoom: 19,
          subdomains: const ['a', 'b', 'c', 'd'],
        ),
        
        // Route polyline
        if (_routePoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              Polyline(
                points: _routePoints,
                color: Colors.blue,
                strokeWidth: 5.0,
                borderColor: Colors.white,
                borderStrokeWidth: 2.0,
              ),
            ],
          ),
        
        // Markers
        MarkerLayer(
          markers: [
            // User location marker
            if (_userLocation != null)
              Marker(
                point: _userLocation!,
                width: 40,
                height: 40,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.blue,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.blue.withOpacity(0.3),
                        blurRadius: 8,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    _isTrackingLocation ? Icons.navigation : Icons.my_location,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            
            // Destination marker
            if (_destinationLocation != null)
              Marker(
                point: _destinationLocation!,
                width: 40,
                height: 40,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.red.withOpacity(0.3),
                        blurRadius: 8,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SizedBox.expand(
        child: Stack(
          children: [
            // Map View
            Positioned.fill(
              child: _buildMapView(),
            ),

            // Loading Indicator
            if (!_isMapInitialized)
              Container(
                color: Colors.white,
                child: const Center(
                  child: CircularProgressIndicator(),
                ),
              ),

            // Top Search Bar
            if (_isMapInitialized)
              Positioned(
                top: MediaQuery.of(context).padding.top + 16,
                left: 16,
                right: 16,
                child: Column(
                  children: [
                    Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.search, color: Colors.grey),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                decoration: const InputDecoration(
                                  hintText: 'Search destination...',
                                  border: InputBorder.none,
                                ),
                                onChanged: (value) {
                                  _searchLocation(value);
                                },
                              ),
                            ),
                            if (_searchController.text.isNotEmpty || _routePoints.isNotEmpty)
                              IconButton(
                                icon: const Icon(Icons.clear, color: Colors.grey),
                                onPressed: _clearRoute,
                              ),
                          ],
                        ),
                      ),
                    ),
                    
                    // Search Results
                    if (_searchResults.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: ListView.separated(
                          shrinkWrap: true,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: _searchResults.length,
                          separatorBuilder: (context, index) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final result = _searchResults[index];
                            return ListTile(
                              leading: const Icon(Icons.location_on, color: Colors.red),
                              title: Text(
                                result['name'],
                                style: const TextStyle(fontWeight: FontWeight.w500),
                              ),
                              subtitle: Text(
                                result['address'],
                                style: const TextStyle(fontSize: 12),
                              ),
                              onTap: () => _selectSearchResult(result),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),

            // Route Info Card
            if (_routeInfo != null)
              Positioned(
                top: MediaQuery.of(context).padding.top + 90,
                left: 16,
                right: 16,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.blue.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.directions_car,
                                color: Colors.blue.shade600,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _destinationAddress ?? 'Destination',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(Icons.timer, size: 16, color: Colors.grey.shade600),
                                      const SizedBox(width: 4),
                                      Text(
                                        _routeInfo!['duration'],
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Icon(Icons.straighten, size: 16, color: Colors.grey.shade600),
                                      const SizedBox(width: 4),
                                      Text(
                                        _routeInfo!['distance'],
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              // Start navigation (you can implement turn-by-turn here)
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Navigation started!'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            },
                            icon: const Icon(Icons.navigation),
                            label: const Text('Start Navigation'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Recenter Button
            if (_isMapInitialized && _locationShared)
              Positioned(
                right: 16,
                bottom: 100,
                child: Column(
                  children: [
                    // Zoom In Button
                    Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        onTap: () {
                          final currentZoom = _mapController.camera.zoom;
                          _mapController.move(
                            _mapController.camera.center,
                            currentZoom + 1,
                          );
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.blue,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Zoom Out Button
                    Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        onTap: () {
                          final currentZoom = _mapController.camera.zoom;
                          _mapController.move(
                            _mapController.camera.center,
                            currentZoom - 1,
                          );
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.remove,
                            color: Colors.blue,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Recenter Button
                    Material(
                      elevation: 4,
                      borderRadius: BorderRadius.circular(28),
                      child: InkWell(
                        onTap: _recenterMap,
                        borderRadius: BorderRadius.circular(28),
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: const Icon(
                            Icons.my_location,
                            color: Colors.blue,
                            size: 28,
                          ),
                        ),
                      ),
                    ),
                    if (_routePoints.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      // Fit Route Button
                      Material(
                        elevation: 4,
                        borderRadius: BorderRadius.circular(28),
                        child: InkWell(
                          onTap: _fitRouteBounds,
                          borderRadius: BorderRadius.circular(28),
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28),
                            ),
                            child: const Icon(
                              Icons.route,
                              color: Colors.blue,
                              size: 28,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

            // Share Location Button
            if (_isMapInitialized && !_locationShared)
              Positioned(
                left: 16,
                right: 16,
                bottom: 24,
                child: Material(
                  elevation: 6,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    onTap: _isLoadingLocation ? null : _shareMyLocation,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue.shade400, Colors.blue.shade600],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: _isLoadingLocation
                          ? const Center(
                              child: SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.my_location,
                                  color: Colors.white,
                                  size: 24,
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'Share My Location',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ),

            // Loading Route Overlay
            if (_isCalculatingRoute)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(
                  child: Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 16),
                          Text('Calculating route...'),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}