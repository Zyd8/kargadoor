// Minimal stub file required for Dart's conditional imports
// Provides stub implementations for web-only APIs when compiling for mobile

// Stub for html.DivElement
class DivElement {
  String? id;
  dynamic style = _StyleStub();
  DivElement();
}

class _StyleStub {
  String width = '';
  String height = '';
}

// Stub for Window
class Window {
  Navigator? navigator = Navigator();
}

// Stub for Navigator
class Navigator {
  Geolocation? geolocation = Geolocation();
}

// Stub for Geolocation
class Geolocation {
  Future<Position> getCurrentPosition({
    bool? enableHighAccuracy,
    Duration? timeout,
    Duration? maximumAge,
  }) async {
    throw UnimplementedError('Geolocation not available on mobile');
  }
}

// Stub for Position
class Position {
  Coordinates? coords = Coordinates();
}

// Stub for Coordinates
class Coordinates {
  double? latitude;
  double? longitude;
}

// Stub for HttpRequest - wrapper to match dart:html API
class HttpRequestWrapper {
  Future<HttpResponse> request(String url, {String? method}) async {
    throw UnimplementedError('HttpRequest not available on mobile');
  }
}

// Stub for HttpResponse
class HttpResponse {
  int status = 0;
  String responseText = '';
}

// Type alias to avoid naming conflict in html class
typedef _DivElementType = DivElement;

// Export as html namespace to match dart:html structure
class html {
  // Use type alias to avoid naming conflict
  static _DivElementType DivElement() {
    return DivElement();
  }
  static Window? get window => Window();
  // HttpRequest wrapper to allow .request() calls
  static HttpRequestWrapper get HttpRequest => HttpRequestWrapper();
}

// Stub for js.context
class js {
  static dynamic get context => _JsContext();
}

class _JsContext {
  dynamic callMethod(String method, [List? args]) {
    throw UnimplementedError('JavaScript interop not available on mobile');
  }
}

// Stub for ui.platformViewRegistry
class ui {
  static PlatformViewRegistry get platformViewRegistry => PlatformViewRegistry();
}

class PlatformViewRegistry {
  static void registerViewFactory(String viewType, dynamic factory) {}
}
