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
  Future<String?> signUp({
    required String email,
    required String password,
    //required String firstName,
    //required String lastName,
    required String phone,
    required String fullName,
  
  }) async {
    try {
      await Supabase.instance.client.auth.signUp(
        email: email,
        password: password,
        data:{
          'phone_number': phone,
          'name':fullName
        }

      );
      return null; // Success
    } catch (e) {
      return e.toString(); // Return the error message
    }
  }

  // Sign In with email or phone and password
  Future<AuthResponse> signIn(String identifier, String password) async {
    String email = identifier;

    if (!identifier.contains('@')) {
      String formattedPhone = identifier;

      // convert 09 to +63 to match db
      if (identifier.startsWith('09')) {
        formattedPhone = '+63${identifier.substring(1)}';
      }
      // checks the email in profile table
      final response = await _supabase
          .from('PROFILE')
          .select('EMAIL') 
          .eq('PHONE_NUMBER', formattedPhone)
          .maybeSingle();

      if (response != null && response['EMAIL'] != null) {
            email = response['EMAIL'];
          } else {
            throw "No account found with that phone number.";
          }
        }

    return await _supabase.auth.signInWithPassword(
      email: email, 
      password: password
      );
  }

  // Sign Out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  // Get current user email (useful for profile pages)
  String? getCurrentUserEmail() => _supabase.auth.currentUser?.email;
}