// This file is compiled for mobile builds (Android/iOS)
import 'package:flutter/material.dart';

class MapPagePlatform extends StatelessWidget {
  final String apiKey;
  const MapPagePlatform({super.key, required this.apiKey});

  @override
  Widget build(BuildContext context) {
    // Placeholder for mobile - you can implement a mobile map solution here
    // For example, use google_maps_flutter or another mobile map package
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.map,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            const Text(
              'Map View',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'TomTom Map is currently only available on Flutter Web',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                // TODO: Implement mobile map solution
                // You can use google_maps_flutter, tomtom_map_flutter, or similar packages
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Mobile map implementation coming soon'),
                  ),
                );
              },
              icon: const Icon(Icons.place),
              label: const Text('Open Map'),
            ),
          ],
        ),
      ),
    );
  }
}
