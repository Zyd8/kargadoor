// Enter Service logic here
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  // Private constructor
  AuthService._internal();

  //The single static instance
  static final AuthService _instance = AuthService._internal();

  // factory constructor that returns the instance
  factory AuthService() {
    return _instance;
  }

  // Auth Logic
  Stream<AuthState> get authStateStream => _supabase.auth.onAuthStateChange;

  // Sign Up with email and password
  Future<String?> signUp({required String email, required String password}) async {
    try {
      await Supabase.instance.client.auth.signUp(
        email: email,
        password: password,
      );
      return null; // Success
    } catch (e) {
      return e.toString(); // Return the error message
    }
  }

  // Sign In with email and password
  Future<AuthResponse> signIn(String email, String password) async {
    return await _supabase.auth.signInWithPassword(email: email, password: password);
  }

  // Sign Out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  // Get current user email (useful for profile pages)
  String? getCurrentUserEmail() => _supabase.auth.currentUser?.email;
}