import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

// Conditional imports - only import web libraries on web
import 'map_web.dart' if (dart.library.io) 'map_mobile.dart' as platform;

class MapPage extends StatefulWidget {
  final String apiKey;
  const MapPage({super.key, required this.apiKey});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  @override
  Widget build(BuildContext context) {
    // Use platform-specific implementation
    return platform.MapPagePlatform(
      apiKey: widget.apiKey,
    );
  }
}
