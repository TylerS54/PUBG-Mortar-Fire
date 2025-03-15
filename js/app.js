document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const mapList = document.getElementById('map-list');
    const mapImage = document.getElementById('map-image');
    const mapContent = document.getElementById('map-content');
    const mapContainer = document.getElementById('map-container');
    const markers = document.getElementById('markers');
    const instructions = document.getElementById('instructions');
    const distanceEl = document.getElementById('distance');
    const resetBtn = document.getElementById('reset-btn');
    const mapWrapper = document.getElementById('map-wrapper');
    const mapViewport = document.getElementById('map-viewport');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    // Map data with scale (meters per map)
    const maps = {
        erangel: {
            name: 'Erangel',
            image: 'img/erangel.png',
            scale: 1000 // 8km x 8km = 8000m, image is 8000px, so 1px = 1m
        },
        miramar: {
            name: 'Miramar',
            image: 'img/miramar.png',
            scale: 1000
        },
        sanhok: {
            name: 'Sanhok',
            image: 'img/sanhok.png',
            scale: 400 // 4km x 4km = 4000m, image is 1000px, so 1px = 0.4m
        },
        vikendi: {
            name: 'Vikendi',
            image: 'img/vikendi.png',
            scale: 800
        },
        karakin: {
            name: 'Karakin',
            image: 'img/karakin.png',
            scale: 200
        },
        paramo: {
            name: 'Paramo',
            image: 'img/paramo.png',
            scale: 300
        },
        haven: {
            name: 'Haven',
            image: 'img/haven.png',
            scale: 150
        },
        taego: {
            name: 'Taego',
            image: 'img/taego.png',
            scale: 1000
        },
        deston: {
            name: 'Deston',
            image: 'img/deston.png',
            scale: 1000
        }
    };

    let currentMap = null;
    let playerPosition = null;
    let targetPosition = null;
    let line = null;
    
    // Zoom variables
    let currentZoom = 1;
    const minZoom = 1;
    const maxZoom = 5;
    const zoomIncrement = 0.5;
    let isDragging = false;

    // Initialize app
    function init() {
        // Ensure starting zoom is 1
        currentZoom = 1;
        mapContent.style.transform = 'scale(1)';
        
        setupEventListeners();
        resetUI();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Map selection
        mapList.addEventListener('click', handleMapSelection);
        
        // Map clicking for positions
        mapImage.addEventListener('click', handleMapClick);
        
        // Reset button
        resetBtn.addEventListener('click', resetPositions);
        
        // Zoom controls
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        zoomResetBtn.addEventListener('click', resetZoom);
        
        // Mouse wheel zoom
        mapViewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
            } else if (currentZoom > 1) {
                // Allow normal scrolling when zoomed in without ctrl key
                e.preventDefault();
                mapViewport.scrollLeft += e.deltaX;
                mapViewport.scrollTop += e.deltaY;
            }
        }, { passive: false });
        
        // Drag to pan when zoomed
        let lastX = 0;
        let lastY = 0;
        
        // Use mapViewport for drag detection, but don't interfere with clicks
        mapViewport.addEventListener('mousedown', (e) => {
            // Only enable dragging when zoomed in or when middle-clicking
            if (currentZoom > 1 || e.button === 1) {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                mapViewport.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent image dragging
            }
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            
            mapViewport.scrollLeft -= dx;
            mapViewport.scrollTop -= dy;
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                // Reset to crosshair cursor if at zoom level 1, otherwise keep move cursor
                mapViewport.style.cursor = currentZoom > 1 ? 'move' : 'auto';
                
                // Short delay to prevent click right after drag
                setTimeout(() => {
                    isDragging = false;
                }, 10);
            }
        });
        
        // Enable middle-click panning even at zoom level 1
        mapViewport.addEventListener('auxclick', (e) => {
            if (e.button === 1) { // Middle mouse button
                e.preventDefault(); // Prevent default middle-click behavior
            }
        });
    }
    
    // Zoom in
    function zoomIn() {
        if (currentZoom < maxZoom) {
            // Store scroll position
            const viewportWidth = mapViewport.clientWidth;
            const viewportHeight = mapViewport.clientHeight;
            const scrollXRatio = (mapViewport.scrollLeft + viewportWidth / 2) / (mapContent.offsetWidth * currentZoom);
            const scrollYRatio = (mapViewport.scrollTop + viewportHeight / 2) / (mapContent.offsetHeight * currentZoom);
            
            // Update zoom
            currentZoom += zoomIncrement;
            applyZoom();
            
            // Adjust scroll position to maintain center
            setTimeout(() => {
                mapViewport.scrollLeft = (mapContent.offsetWidth * currentZoom * scrollXRatio) - viewportWidth / 2;
                mapViewport.scrollTop = (mapContent.offsetHeight * currentZoom * scrollYRatio) - viewportHeight / 2;
            }, 10);
        }
    }
    
    // Zoom out
    function zoomOut() {
        if (currentZoom > minZoom) {
            // Store scroll position
            const viewportWidth = mapViewport.clientWidth;
            const viewportHeight = mapViewport.clientHeight;
            const scrollXRatio = (mapViewport.scrollLeft + viewportWidth / 2) / (mapContent.offsetWidth * currentZoom);
            const scrollYRatio = (mapViewport.scrollTop + viewportHeight / 2) / (mapContent.offsetHeight * currentZoom);
            
            // Update zoom
            currentZoom -= zoomIncrement;
            applyZoom();
            
            // Adjust scroll position to maintain center
            setTimeout(() => {
                if (currentZoom > 1) {
                    mapViewport.scrollLeft = (mapContent.offsetWidth * currentZoom * scrollXRatio) - viewportWidth / 2;
                    mapViewport.scrollTop = (mapContent.offsetHeight * currentZoom * scrollYRatio) - viewportHeight / 2;
                } else {
                    mapViewport.scrollLeft = 0;
                    mapViewport.scrollTop = 0;
                }
            }, 10);
        }
    }
    
    // Reset zoom
    function resetZoom() {
        console.log('Resetting zoom');
        currentZoom = 1;
        mapContent.style.transform = 'scale(1)';
        mapViewport.scrollLeft = 0;
        mapViewport.scrollTop = 0;
        
        if (currentZoom === 1) {
            mapViewport.style.overflow = 'hidden';
            mapImage.style.cursor = 'crosshair';
        }
        
        // Make sure the image fits within the viewport
        mapImage.style.maxWidth = '100%';
        mapImage.style.maxHeight = '100%';
    }
    
    // Apply zoom level
    function applyZoom() {
        // Apply zoom to the map content
        mapContent.style.transform = `scale(${currentZoom})`;
        mapContent.style.transformOrigin = 'top left';
        
        // Always keep scrolling enabled
        mapViewport.style.overflow = 'auto';
        
        // Change cursor based on zoom level
        if (currentZoom > 1) {
            mapImage.style.cursor = 'move';
        } else {
            mapImage.style.cursor = 'crosshair';
            // Reset scroll position at zoom level 1
            mapViewport.scrollLeft = 0;
            mapViewport.scrollTop = 0;
        }
        
        console.log('Zoom level set to:', currentZoom);
    }

    // Handle map selection
    function handleMapSelection(e) {
        if (e.target.tagName === 'LI') {
            const mapId = e.target.getAttribute('data-map');
            
            // Remove active class from all
            mapList.querySelectorAll('li').forEach(li => {
                li.classList.remove('active');
            });
            
            // Add active class to selected
            e.target.classList.add('active');
            
            // Load selected map
            loadMap(mapId);
        }
    }

    // Load a map
    function loadMap(mapId) {
        currentMap = maps[mapId];
        
        // Reset zoom and positions
        resetZoom();
        resetPositions();
        
        // Set map image
        mapImage.src = currentMap.image;
        mapImage.alt = currentMap.name + ' Map';
        
        // Wait for the image to load to get dimensions
        mapImage.onload = function() {
            // Store the actual image dimensions
            console.log('Image loaded with dimensions:', mapImage.naturalWidth, 'x', mapImage.naturalHeight);
            
            // Update map info display
            const mapInfo = document.getElementById('map-info');
            if (mapInfo) {
                const mapSizeInMeters = getMapSizeInMeters(currentMap.name);
                const pixelToMeterRatio = mapSizeInMeters / Math.max(mapImage.naturalWidth, mapImage.naturalHeight);
                mapInfo.textContent = `Map: ${mapImage.naturalWidth}×${mapImage.naturalHeight}px (${pixelToMeterRatio.toFixed(2)}m/px)`;
            }
            
            // Reset zoom and scroll position after image loads
            setTimeout(() => {
                resetZoom();
                mapViewport.scrollLeft = 0;
                mapViewport.scrollTop = 0;
            }, 50);
        };
        
        // Update instructions
        instructions.textContent = 'Click on the map to set your position';
    }

    // Handle clicking on the map
    function handleMapClick(e) {
        // Don't handle click if we're in dragging mode
        if (isDragging) {
            return;
        }
        
        // Get image dimensions and position
        const rect = mapImage.getBoundingClientRect();
        
        // Check if the click is within the image boundaries
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            console.log('Click outside image boundaries');
            return;
        }
        
        // Calculate normalized coordinates (0-1) within the image
        // These coordinates work regardless of zoom level
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        console.log('Click details:', {
            client: { x: e.clientX, y: e.clientY },
            image: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            normalized: { x, y },
            zoom: currentZoom
        });
        
        if (!playerPosition) {
            // First click - set player position
            playerPosition = { x, y };
            createMarker(x, y, 'player');
            instructions.textContent = 'Now click where you want to target with mortars';
        } else if (!targetPosition) {
            // Second click - set target position
            targetPosition = { x, y };
            createMarker(x, y, 'target');
            createLine(playerPosition, targetPosition);
            calculateDistance();
            instructions.textContent = 'Distance calculated. Use the reset button to start over.';
        }
    }

    // Create a marker on the map
    function createMarker(x, y, type) {
        // Create marker element
        const marker = document.createElement('div');
        marker.className = `marker ${type}`;
        
        // Use percentage positioning which will work regardless of zoom
        marker.style.position = 'absolute';
        marker.style.left = (x * 100) + '%';
        marker.style.top = (y * 100) + '%';
        marker.style.transform = 'translate(-50%, -50%)';
        
        // For debugging
        console.log(`${type} marker at: ${x * 100}%, ${y * 100}%`);
        
        // Add to markers container
        markers.appendChild(marker);
    }

    // Create a line between two points
    function createLine(from, to) {
        // Remove existing line if any
        if (line) {
            line.remove();
        }
        
        // Create container for the line (will help with positioning)
        const lineContainer = document.createElement('div');
        lineContainer.className = 'line-container';
        lineContainer.style.position = 'absolute';
        lineContainer.style.left = `${from.x * 100}%`;
        lineContainer.style.top = `${from.y * 100}%`;
        lineContainer.style.transformOrigin = 'left center';
        
        // Create the actual line
        line = document.createElement('div');
        line.className = 'line';
        
        // Get image dimensions
        const rect = mapImage.getBoundingClientRect();
        
        // Calculate position in pixels for length
        const fromXPx = from.x * rect.width;
        const fromYPx = from.y * rect.height;
        const toXPx = to.x * rect.width;
        const toYPx = to.y * rect.height;
        
        // Calculate distance and angle
        const dx = toXPx - fromXPx;
        const dy = toYPx - fromYPx;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Set precise line length
        line.style.width = `${length}px`;
        lineContainer.style.transform = `rotate(${angle}deg)`;
        
        // Add endpoint indicator
        const endpoint = document.createElement('div');
        endpoint.className = 'line-endpoint';
        line.appendChild(endpoint);
        
        // Build the line
        lineContainer.appendChild(line);
        markers.appendChild(lineContainer);
        
        // Save reference to the line
        line = lineContainer;
        
        console.log(`Line drawn: ${length.toFixed(1)}px at ${angle.toFixed(1)}° angle`);
    }

    // Calculate the distance between player and target
    function calculateDistance() {
        if (!playerPosition || !targetPosition || !currentMap) {
            return;
        }
        
        // Get actual image dimensions
        const imgWidth = mapImage.naturalWidth;
        const imgHeight = mapImage.naturalHeight;
        
        // Calculate pixel distance in the original image
        const dx = (targetPosition.x - playerPosition.x) * imgWidth;
        const dy = (targetPosition.y - playerPosition.y) * imgHeight;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Get map size in meters
        const mapSizeInMeters = getMapSizeInMeters(currentMap.name);
        
        // Calculate how many meters per pixel
        const pixelToMeterRatio = mapSizeInMeters / Math.max(imgWidth, imgHeight);
        
        // Calculate actual distance in meters
        const gameDistance = Math.round(pixelDistance * pixelToMeterRatio);
        
        // Format distance
        let formattedDistance;
        if (gameDistance >= 1000) {
            formattedDistance = (gameDistance / 1000).toFixed(2) + ' km';
        } else {
            formattedDistance = gameDistance + ' meters';
        }
        
        // Display the distance with improved formatting
        distanceEl.innerHTML = `
            <div class="distance-value">${formattedDistance}</div>
            <div class="distance-label">Mortar Distance</div>
        `;
        
        console.log(`Calculated distance: ${gameDistance} meters (${pixelToMeterRatio.toFixed(4)} meters/pixel)`);
    }
    
    // Helper function to get map size in meters based on map name
    function getMapSizeInMeters(mapName) {
        const mapSizes = {
            'Erangel': 8000,  // 8km
            'Miramar': 8000,  // 8km
            'Sanhok': 4000,   // 4km
            'Vikendi': 6000,  // 6km
            'Karakin': 2000,  // 2km
            'Paramo': 3000,   // 3km
            'Haven': 1500,    // 1.5km
            'Taego': 8000,    // 8km
            'Deston': 8000    // 8km
        };
        
        return mapSizes[mapName] || 8000; // Default to 8km if map is unknown
    }

    // Reset player and target positions
    function resetPositions() {
        playerPosition = null;
        targetPosition = null;
        
        // Clear markers
        markers.innerHTML = '';
        
        // Reset line
        line = null;
        
        // Reset distance display
        distanceEl.textContent = '';
        
        // Update instructions if a map is selected
        if (currentMap) {
            instructions.textContent = 'Click on the map to set your position';
        } else {
            instructions.textContent = 'Select a map to begin';
        }
    }

    // Reset the UI completely
    function resetUI() {
        currentMap = null;
        resetPositions();
        
        // Clear map selection
        mapList.querySelectorAll('li').forEach(li => {
            li.classList.remove('active');
        });
        
        // Clear map image
        mapImage.src = '';
        mapImage.alt = 'PUBG Map';
    }

    // Initialize the app
    init();
});