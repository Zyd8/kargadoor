// Enter Register Page logic here
import 'package:flutter/material.dart';
import 'package:frontend/auth/services/auth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  //final _firstNameController = TextEditingController();
  //final _lastNameController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();

  String capitalize(String s) {
    if (s.isEmpty) return "";
    return s[0].toUpperCase() + s.substring(1).toLowerCase();
  }
  

  void _register() async {
    if (_formKey.currentState!.validate()){
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    //final firstName = capitalize(_firstNameController.text.trim());
    //final lastName = capitalize(_lastNameController.text.trim());
    final rawPhone = _phoneController.text.trim().replaceAll(RegExp(r'[\s-]'), '');
    final fullName = capitalize(_fullNameController.text.trim());
    
    // validation logic
    //mobile phone it starts with +63 for international standard in supabsae
    String formattedPhone = rawPhone;
    if (rawPhone.startsWith('09')) {
      formattedPhone = '+63${rawPhone.substring(1)}';
    }
    //match pass
    if (password != confirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Passwords do not match!"), backgroundColor: Colors.red),
      );
      return;
    }

    final error = await AuthService().signUp(
      email: email, 
      password: password,
      //firstName: firstName,
      //lastName: lastName,
      fullName: fullName,
      phone: formattedPhone,
      );
      
      if (error == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Account created! Please login."), backgroundColor: Colors.green),
          );
          Navigator.pop(context); // Go back to Login Page
        }
      } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error), backgroundColor: Colors.red),
        );
      }
    } 
  }
}
  @override
    Widget build(BuildContext context) {
      return Scaffold(
        appBar: AppBar(title: const Text("Create Account")),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey, // form key wrap
            child: Column(
              children: [
                TextFormField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(labelText: "Name"),
                  validator: (value) => (value == null || value.isEmpty) ? "Enter your name" : null,
                ),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: "Email"),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) return "Enter an email";
                    if (!value.contains('@')) return "Enter a valid email";
                    return null;
                  },
                ),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: "Phone Number",
                    hintText: "09123456789",
                    ),
                  keyboardType: TextInputType.phone,
                 validator: (value) {
                  if (value == null || value.isEmpty) {
                    return "Enter your phone number";
                  }                  
                  // Regular Expression for PH numbers:
                  // Supports 09... (11 digits) or +639... (13 characters)
                  String pattern = r'^(09|\+639)\d{9}$';
                  RegExp regExp = RegExp(pattern);

                  if (!regExp.hasMatch(value)) {
                    return "Enter a valid PH mobile number (e.g., 09123456789)";
                  }
                  return null;
                },
              ),
                TextFormField(
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: "Password"),
                  obscureText: true,
                  validator: (value) => (value != null && value.length < 6) ? "Minimum 6 characters" : null,
                ),
                TextFormField(
                  controller: _confirmPasswordController,
                  decoration: const InputDecoration(labelText: "Confirm Password"),
                  obscureText: true,
                  validator: (value) => (value == null || value.isEmpty) ? "Please confirm your password" : null,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _register,
                  style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                  child: const Text("Register"),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }