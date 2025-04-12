# Store Details Implementation

## Features Added

1. **Enhanced ProductDetailsScreen**
   - Date formatting in price details modal now uses dd/MMM/yyyy format (e.g., 15/APR/2023)
   - Store names are now clickable in both the modal and the cheapest stores list
   - When clicking on a store name, users are redirected to the StoreDetailsScreen

2. **New StoreDetailsScreen**
   - Displays comprehensive store information (name, address, city)
   - Calculates distance between user and store (when location permissions are granted)
   - Provides action buttons for:
     - Getting directions (opens in Maps app)
     - Calling the store (when phone number is available)
     - Visiting the store's website (when available)
   - Shows opening hours (when available)

## Current Limitations

### MapView Implementation

The current implementation has a temporary placeholder for the map view due to a native module error:

```
(NOBRIDGE) ERROR  Invariant Violation: TurboModuleRegistry.getEnforcing(...):
'RNMapsAirModule' could not be found. Verify that a module by this name is registered in the native binary.
```

To fully enable maps functionality, the following steps are needed:

1. **Proper Installation of react-native-maps**: 
   ```
   expo install react-native-maps
   ```

2. **Config Plugin Setup**:
   Add the following to app.json or app.config.js:
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-location",
           {
             "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
           }
         ],
         [
           "react-native-maps",
           {
             "googleMapsApiKey": "YOUR_API_KEY"
           }
         ]
       ]
     }
   }
   ```

3. **Re-enable Map Component**:
   In StoreDetailsScreen.tsx, uncomment the MapView import and reimplement the MapView component instead of the placeholder.

## Usage

Once the feature is fully implemented with maps support:

1. From the Product Details screen, users can click on any store name (in price details or cheapest stores list)
2. This opens the Store Details screen showing complete store information
3. Users can get directions, call, or visit the store's website with a single tap
4. The map provides a visual representation of the store's location
5. Distance to the store is calculated (when location permissions are granted)

## TypeScript Integration

All components have been fully typed to ensure type safety and better developer experience.

- Route parameters are properly typed
- Navigation is type-safe
- Data structures have interfaces defined 