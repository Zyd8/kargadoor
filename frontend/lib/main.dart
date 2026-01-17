import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'pages/map/map.dart';
// Import other pages here as needed
import 'pages/test/test.dart';
// import 'pages/home/home_page.dart';

void main() async {
  // Load environment variables (handle missing file gracefully)
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Warning: Could not load .env file: $e');
    // Continue anyway - app will show error message if API key is missing
  }
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Get API key from .env file
    final apiKey = dotenv.env['TOMTOM_API_KEY'] ?? '';
    
    if (apiKey.isEmpty) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text(
              'Error: TOMTOM_API_KEY not found in .env file',
              style: TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    return MaterialApp(
      title: 'Flutter TomTom Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      
      // CHANGE THIS LINE to test different pages
      home: Scaffold(
        body: MapPage(
          apiKey: apiKey,
        ),
      ),
      
      // Examples of how to switch pages:
      // home: const TestPage(),
      // home: Scaffold(body: YourNewPage()),
    );
  }
}