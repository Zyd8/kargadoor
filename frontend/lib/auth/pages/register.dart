// Enter Register Page logic here
import 'package:flutter/material.dart';
import 'package:frontend/auth/services/auth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  void _register() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    if (password != confirm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Passwords do not match!"), backgroundColor: Colors.red),
      );
      return;
    }

    final error = await AuthService().signUp(email: email, password: password);

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Create Account")),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: "Email")),
            TextField(controller: _passwordController, decoration: const InputDecoration(labelText: "Password"), obscureText: true),
            TextField(controller: _confirmPasswordController, decoration: const InputDecoration(labelText: "Confirm Password"), obscureText: true),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _register,
              style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
              child: const Text("Register"),
            ),
          ],
        ),
      ),
    );
  }
}