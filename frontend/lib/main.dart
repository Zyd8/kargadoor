import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'pages/map/map.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth/pages/login.dart';
import 'auth/services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Load environment variables (handle missing file gracefully)
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Warning: Could not load .env file: $e');
    // Continue anyway - app will show error message if API key is missing
  }
  //supabase initialization
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL'] ?? '',
    anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  
  @override
  Widget build(BuildContext context) {
    // Get API key from .env file
    final apiKey = dotenv.env['TOMTOM_API_KEY'] ?? '';
    final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
    
    if (apiKey.isEmpty || supabaseUrl.isEmpty) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text(
              'Error: Config keys are not found in .env file',
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
      /*home: Scaffold(
        body: MapPage(
          apiKey: apiKey,
        ),
      ),
      */
      //Streambuilder listener
      home: StreamBuilder<AuthState>(
        stream: AuthService().authStateStream, // Uses the stream from your AuthService
        builder: (context, snapshot) {
          // While checking for the initial session, show a loading spinner
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          // Check if we have a valid session (user is logged in)
          final session = snapshot.data?.session;

          if (session != null) {
            // User is logged in
            return MapPage(apiKey: dotenv.env['TOMTOM_API_KEY'] ?? '');
          } else {
            // User is NOT logged 
            return LoginPage();
          }
        },
      ),

    );
  }
}