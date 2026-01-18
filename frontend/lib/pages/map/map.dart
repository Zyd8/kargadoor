import 'dart:convert' as convert;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class MapPage extends StatefulWidget {
  final String apiKey;
  const MapPage({super.key, required this.apiKey});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  final MapController _mapController = MapController();
  bool _isMapInitialized = false;
  bool _isLoadingLocation = false;
  bool _locationShared = false;
  String? _currentAddress;
  latlong.LatLng? _userLocation;

  @override
  void initState() {
    super.initState();
    // Mobile: Initialize flutter_map immediately
    _isMapInitialized = true;
  }

  Future<void> _shareMyLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      // Mobile: Use geolocator package
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

      // Update map center on mobile
      _userLocation = latlong.LatLng(lat, lng);
      _mapController.move(_userLocation!, 16.0);

      // Reverse geocode to get address
      final address = await _reverseGeocode(lat, lng);

      setState(() {
        _locationShared = true;
        _isLoadingLocation = false;
        _currentAddress = address;
        _userLocation = latlong.LatLng(lat, lng);
      });

      // Show success message
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
        // Try to get freeformAddress first, then construct from parts
        final freeformAddress = address['freeformAddress'] as String?;
        if (freeformAddress != null && freeformAddress.isNotEmpty) {
          return freeformAddress;
        }

        // Fallback: construct address from parts
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

    // Mobile: Use flutter_map controller
    _mapController.move(_userLocation!, 16.0);
  }

  Widget _buildMapView() {
    // Mobile: Use flutter_map with TomTom raster tiles
    final center = _userLocation ?? const latlong.LatLng(14.6760, 121.0437); // Manila default

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: center,
        initialZoom: _userLocation != null ? 16.0 : 13.0,
        minZoom: 3.0,
        maxZoom: 19.0,
      ),
      children: [
        // TomTom raster tiles layer
        TileLayer(
          urlTemplate: 'https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${widget.apiKey}',
          userAgentPackageName: 'com.project.logistics',
          tileSize: 256,
          maxZoom: 19,
          subdomains: const ['a', 'b', 'c', 'd'],
        ),
        // User location marker
        if (_userLocation != null)
          MarkerLayer(
            markers: [
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
    return SizedBox.expand(
      child: Stack(
        children: [
          // Map View - Full Screen
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
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: Colors.grey),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _currentAddress ?? 'Search for places',
                          style: TextStyle(
                            color: _currentAddress != null ? Colors.black87 : Colors.grey,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Recenter Button (only show if location is shared)
          if (_isMapInitialized && _locationShared)
            Positioned(
              right: 16,
              bottom: 180,
              child: Material(
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
            ),

          // Share Location Button
          if (_isMapInitialized)
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
                        colors: _locationShared
                            ? [Colors.green.shade400, Colors.green.shade600]
                            : [Colors.blue.shade400, Colors.blue.shade600],
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
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                _locationShared ? Icons.check_circle : Icons.my_location,
                                color: Colors.white,
                                size: 24,
                              ),
                              const SizedBox(width: 12),
                              Text(
                                _locationShared ? 'Location Shared' : 'Share My Location',
                                style: const TextStyle(
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

          // Location Info Card (when location is shared)
          if (_isMapInitialized && _locationShared && _currentAddress != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 100,
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.location_on,
                          color: Colors.green.shade600,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Your Location',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _currentAddress!,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Colors.black87,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
