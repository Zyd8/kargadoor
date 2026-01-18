import 'dart:convert' as convert;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// Conditional imports for web-only libraries
// On web: imports real dart:html, dart:js, dart:ui_web
// On mobile: imports stub file for type checking
import 'dart:html' if (dart.library.io) 'map_web_stub.dart' as html;
import 'dart:js' if (dart.library.io) 'map_web_stub.dart' as js;
import 'dart:ui_web' if (dart.library.io) 'map_web_stub.dart' as ui;

class MapPage extends StatefulWidget {
  final String apiKey;
  const MapPage({super.key, required this.apiKey});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  final String _viewType = 'tomtom-map-${DateTime.now().millisecondsSinceEpoch}';
  bool _isMapInitialized = false;
  bool _isLoadingLocation = false;
  bool _locationShared = false;
  String? _currentAddress;

  @override
  void initState() {
    super.initState();

    if (kIsWeb) {
      ui.platformViewRegistry.registerViewFactory(
        _viewType,
        (int viewId) {
          final divElement = html.DivElement()
            ..id = 'tomtom-map'
            ..style.width = '100%'
            ..style.height = '100%';
          
          Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) {
              _initializeMap();
            }
          });
          
          return divElement;
        },
      );
    } else {
      // On mobile, mark as initialized so we can show the message
      _isMapInitialized = true;
    }
  }

  void _initializeMap() {
    if (!kIsWeb) return;
    
    try {
      js.context.callMethod('initTomTomMap', [widget.apiKey]);
      if (mounted) {
        setState(() {
          _isMapInitialized = true;
        });
      }
    } catch (e) {
      debugPrint('Error initializing TomTom map: $e');
    }
  }

  Future<void> _shareMyLocation() async {
    if (!kIsWeb) return;
    
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      // Request geolocation permission and get current position
      final position = await html.window.navigator.geolocation.getCurrentPosition(
        enableHighAccuracy: true,
        timeout: const Duration(seconds: 10),
        maximumAge: const Duration(seconds: 0),
      );
      
      final lat = position.coords?.latitude?.toDouble();
      final lng = position.coords?.longitude?.toDouble();

      if (lat != null && lng != null) {
        debugPrint('Location obtained: $lat, $lng');
        
        // Add marker and center map on user's location
        js.context.callMethod('addUserLocationMarker', [lat, lng]);
        
        // Reverse geocode to get address
        final address = await _reverseGeocode(lat, lng);
        
        setState(() {
          _locationShared = true;
          _isLoadingLocation = false;
          _currentAddress = address;
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
                const Expanded(
                  child: Text('Unable to get your location. Please enable location services.'),
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
    if (!kIsWeb) {
      return null; // Not available on mobile
    }
    
    try {
      final response = await html.HttpRequest.request(
        'https://api.tomtom.com/search/2/reverseGeocode/$lat,$lng.json?key=${widget.apiKey}',
        method: 'GET',
      );
      
      if (response.status == 200 && response.responseText != null) {
        final data = convert.jsonDecode(response.responseText!);
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
    } catch (e) {
      debugPrint('Reverse geocode error: $e');
    }
    return null;
  }

  void _recenterMap() {
    if (!kIsWeb || !_locationShared) return;
    
    try {
      js.context.callMethod('recenterToUserLocation');
    } catch (e) {
      debugPrint('Error recentering map: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show message on mobile - don't try to use any web APIs
    if (!kIsWeb) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.map_outlined,
                size: 64,
                color: Colors.grey,
              ),
              const SizedBox(height: 16),
              const Text(
                'TomTom Map',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Maps are only available on Flutter Web',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    return SizedBox.expand(
      child: Stack(
        children: [
          // Map View - Full Screen
          Positioned.fill(
            child: HtmlElementView(viewType: _viewType),
          ),
        
          // Loading Indicator
          if (!_isMapInitialized)
            Container(
              color: Colors.white,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
        
          // Top Search Bar (like Lalamove/Google Maps)
          if (_isMapInitialized)
            Positioned(
              top: 16,
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