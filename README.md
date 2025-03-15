# PUBG Mortar Calculator

A web application to calculate mortar distances in PUBG (PlayerUnknown's Battlegrounds).

## Features

- Full-screen map display
- Selection of all PUBG maps
- Accurate distance calculation using correct map scales
- Visual indication of player position and target
- Line drawing between positions
- Simple and intuitive UI

## How to Use

1. Open the application in a web browser
2. Select a map from the left sidebar
3. Click on the map to set your position (green marker)
4. Click again to set your target position (red marker)
5. View the calculated distance at the bottom of the screen
6. Use the Reset button to start over

## Map Scales

The application uses the following scales for each map to ensure accurate distance calculation:

- Erangel: 8km x 8km (scale: 1000)
- Miramar: 8km x 8km (scale: 1000)
- Sanhok: 4km x 4km (scale: 400)
- Vikendi: 6km x 6km (scale: 800)
- Karakin: 2km x 2km (scale: 200)
- Paramo: 3km x 3km (scale: 300)
- Haven: 1.5km x 1.5km (scale: 150)
- Taego: 8km x 8km (scale: 1000)
- Deston: 8km x 8km (scale: 1000)

## Setup Instructions

1. Download map images for each PUBG map and place them in the `img` folder:
   - erangel.png
   - miramar.png
   - sanhok.png
   - vikendi.png
   - karakin.png
   - paramo.png
   - haven.png
   - taego.png
   - deston.png

2. Open `index.html` in a web browser to use the application

## Notes

- For best results, use high-resolution map images
- The application works offline once the images are added
- For the most accurate distance calculation, use map images that match the aspect ratio of the in-game maps