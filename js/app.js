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
    const mortarModeBtn = document.getElementById('mortar-mode');
    const planeModeBtn = document.getElementById('plane-mode');
    const modeInstructions = document.getElementById('mode-instructions');
    const planePath = document.getElementById('plane-path');
    const jumpDistanceValue = document.getElementById('jump-distance-value');
    const jumpHeightValue = document.getElementById('jump-height-value');
    const jumpExitValue = document.getElementById('jump-exit-value');
    const jumpDetails = document.getElementById('jump-details');
    const fallStrategySelect = document.getElementById('fall-strategy');

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
    
    // App mode
    let appMode = 'mortar'; // 'mortar' or 'plane'
    
    // Plane path variables
    let planeStartPosition = null;
    let planeEndPosition = null;
    let planeLine = null;
    let planeIcon = null;
    let parachuteGradient = null;
    let jumpMarker = null;
    let jumpPosition = null;
    let exitMarker = null;
    let exitPoint = null;
    
    // Parachute constants
    const PLANE_ALTITUDE = 800; // meters, altitude of the plane
    const IDEAL_CHUTE_HEIGHT = 200; // meters, ideal height to pull chute for maximum distance
    
    // Fall speed constants
    const VERTICAL_SPEED_DIVE = 70; // m/s, vertical speed when diving (W + looking down)
    const HORIZONTAL_SPEED_DIVE = 35; // m/s, horizontal speed when diving (W + looking down)
    
    const VERTICAL_SPEED_NEUTRAL = 55; // m/s, vertical speed when pressing W only
    const HORIZONTAL_SPEED_NEUTRAL = 40; // m/s, horizontal speed when pressing W only
    
    const VERTICAL_SPEED_GLIDE = 40; // m/s, vertical speed when gliding at 45° angle
    const HORIZONTAL_SPEED_GLIDE = 45; // m/s, horizontal speed when gliding at 45° angle
    
    // Parachute distances
    const MAX_PARACHUTE_DISTANCE_DIVE = 600; // m, max distance when diving forward
    const MAX_PARACHUTE_DISTANCE_NEUTRAL = 800; // m, max distance in neutral fall
    const MAX_PARACHUTE_DISTANCE_GLIDE = 1000; // m, max distance when gliding for max distance
    
    // Fall strategy - default to glide for max distance
    let fallStrategy = 'glide'; // 'dive', 'neutral', or 'glide'
    
    // Hide jump details by default
    jumpDetails.style.display = 'none';
    
    // Reset jump info values
    jumpDistanceValue.textContent = '-';
    jumpHeightValue.textContent = '-';

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
        resetBtn.addEventListener('click', () => {
            // Reset appropriate elements based on current mode
            if (appMode === 'mortar') {
                resetPositions();
            } else {
                resetPlanePath();
            }
        });
        
        // Zoom controls
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        zoomResetBtn.addEventListener('click', resetZoom);
        
        // Mode switching
        mortarModeBtn.addEventListener('click', () => setAppMode('mortar'));
        planeModeBtn.addEventListener('click', () => setAppMode('plane'));
        
        // Fall strategy selection
        fallStrategySelect.addEventListener('change', () => {
            fallStrategy = fallStrategySelect.value;
            
            // If we already have landing point selected, recalculate
            if (planeStartPosition && planeEndPosition && jumpPosition) {
                calculateJumpParameters();
            }
        });
        
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
        resetPlanePath();
        
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
        
        // Update instructions based on current mode
        if (appMode === 'mortar') {
            instructions.textContent = 'Click on the map to set your position';
        } else {
            instructions.textContent = 'Click to set the start of the plane path';
        }
        
        // Show/hide elements based on current mode
        if (appMode === 'mortar') {
            distanceEl.style.display = 'flex';
            jumpDetails.style.display = 'none';
        } else {
            distanceEl.style.display = 'none';
            // Only show jump details when a landing spot has been selected
            jumpDetails.style.display = 'none';
        }
    }

    // Set application mode (mortar or plane)
    function setAppMode(mode) {
        appMode = mode;
        
        // Update UI based on mode
        if (mode === 'mortar') {
            mortarModeBtn.classList.add('active');
            planeModeBtn.classList.remove('active');
            modeInstructions.innerHTML = 'Click on the map to mark your position,<br>then click again to mark your target.';
            
            // Show/hide elements
            distanceEl.style.display = 'flex';
            jumpDetails.style.display = 'none';
            
            // Clear plane path elements
            resetPlanePath();
        } else {
            planeModeBtn.classList.add('active');
            mortarModeBtn.classList.remove('active');
            modeInstructions.innerHTML = 'Click to set the plane path start,<br>click again for the end, then click where you want to land.';
            
            // Show/hide elements
            distanceEl.style.display = 'none';
            // Only show jump details when a landing point has been selected
            jumpDetails.style.display = 'none';
            
            // Clear mortar elements
            resetPositions();
        }
        
        // Reset and update instructions
        if (currentMap) {
            if (mode === 'mortar') {
                instructions.textContent = 'Click on the map to set your position';
            } else {
                instructions.textContent = 'Click and drag to draw the plane path';
            }
        } else {
            instructions.textContent = 'Select a map to begin';
        }
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
        
        if (appMode === 'mortar') {
            // Mortar calculator mode
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
        } else {
            // Plane path mode
            console.log('Plane path click with states:', {
                planeStartPosition: !!planeStartPosition,
                planeEndPosition: !!planeEndPosition,
                jumpPosition: !!jumpPosition
            });
            
            // If plane path is already completed (both start and end positions exist)
            // AND we haven't set a jump position yet, then this click is for the landing spot
            if (planeStartPosition && planeEndPosition && !jumpPosition) {
                console.log('Setting jump position at', x, y);
                jumpPosition = { x, y };
                createJumpMarker(x, y);
                calculateJumpParameters();
                instructions.textContent = 'Jump parameters calculated. Use the reset button to start over.';
                
                // Now show the jump details
                jumpDetails.style.display = 'block';
                return;
            }
            
            // If we have a start position but no end position yet, this is the second click to complete the path
            if (planeStartPosition && !planeEndPosition) {
                console.log('Setting plane end position at', x, y);
                planeEndPosition = { x, y };
                
                // Draw final path between start and end
                drawPlanePath(planeStartPosition, planeEndPosition);
                
                // Draw parachute distance gradient
                drawParachuteGradient();
                
                // Update instructions for the next step
                instructions.textContent = 'Click where you want to land';
                return;
            }
            
            // First click - set the start position of the plane path
            console.log('Setting plane start position at', x, y);
            
            // Reset any existing path and positions
            resetPlanePath();
            
            // Set the start position
            planeStartPosition = { x, y };
            
            // Create marker for the start position
            const startMarker = document.createElement('div');
            startMarker.className = 'plane-icon';
            startMarker.style.position = 'absolute';
            startMarker.style.left = `${x * 100}%`;
            startMarker.style.top = `${y * 100}%`;
            planePath.appendChild(startMarker);
            
            // Update instructions for the next step
            instructions.textContent = 'Click to set the end of the plane path';
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

    // Draw the plane path
    function drawPlanePath(start, end) {
        // Remove existing plane path elements
        if (planeLine) {
            planeLine.remove();
            planeLine = null;
        }
        
        if (planeIcon) {
            planeIcon.remove();
            planeIcon = null;
        }
        
        // Create plane line element
        const lineContainer = document.createElement('div');
        lineContainer.className = 'plane-line';
        
        // Calculate position and dimensions
        const rect = mapImage.getBoundingClientRect();
        
        // Calculate position in pixels
        const startXPx = start.x * rect.width;
        const startYPx = start.y * rect.height;
        const endXPx = end.x * rect.width;
        const endYPx = end.y * rect.height;
        
        // Calculate distance and angle
        const dx = endXPx - startXPx;
        const dy = endYPx - startYPx;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Set line style
        lineContainer.style.position = 'absolute';
        lineContainer.style.left = `${start.x * 100}%`;
        lineContainer.style.top = `${start.y * 100}%`;
        lineContainer.style.width = `${length}px`;
        lineContainer.style.transformOrigin = 'left center';
        lineContainer.style.transform = `rotate(${angle}deg)`;
        
        // Create plane icon
        const planeIconElement = document.createElement('div');
        planeIconElement.className = 'plane-icon';
        planeIconElement.style.left = `${start.x * 100}%`;
        planeIconElement.style.top = `${start.y * 100}%`;
        
        // Add to container
        planePath.appendChild(lineContainer);
        planePath.appendChild(planeIconElement);
        
        // Store references
        planeLine = lineContainer;
        planeIcon = planeIconElement;
    }
    
    // Draw parachute distance gradient
    function drawParachuteGradient() {
        // Remove existing gradient
        if (parachuteGradient) {
            parachuteGradient.remove();
            parachuteGradient = null;
        }
        
        // Calculate the maximum distance in pixels based on map scale
        const pixelToMeterRatio = getPixelToMeterRatio();
        const maxPixelDistance = MAX_PARACHUTE_DISTANCE / pixelToMeterRatio;
        
        // Calculate plane path vector
        const planeVector = {
            x: planeEndPosition.x - planeStartPosition.x,
            y: planeEndPosition.y - planeStartPosition.y
        };
        
        // Normalize the vector
        const magnitude = Math.sqrt(planeVector.x * planeVector.x + planeVector.y * planeVector.y);
        const normalizedVector = {
            x: planeVector.x / magnitude,
            y: planeVector.y / magnitude
        };
        
        // Calculate the perpendicular vector
        const perpVector = {
            x: -normalizedVector.y,
            y: normalizedVector.x
        };
        
        // Create multiple gradient sections along the plane path - but fewer and more spaced out
        const numSections = 5; // Reduced from 10
        const pathLength = Math.sqrt(
            Math.pow((planeEndPosition.x - planeStartPosition.x) * mapImage.width, 2) +
            Math.pow((planeEndPosition.y - planeStartPosition.y) * mapImage.height, 2)
        );
        
        // Create a path segment container
        const pathSegmentsContainer = document.createElement('div');
        pathSegmentsContainer.className = 'path-segments';
        planePath.appendChild(pathSegmentsContainer);
        
        for (let i = 0; i <= numSections; i++) {
            // Calculate position along the plane path
            const t = i / numSections;
            const pointX = planeStartPosition.x + t * (planeEndPosition.x - planeStartPosition.x);
            const pointY = planeStartPosition.y + t * (planeEndPosition.y - planeStartPosition.y);
            
            // Create gradient container
            const gradient = document.createElement('div');
            gradient.className = 'parachute-gradient';
            
            // Set position and size - make it more proportional to the map scale
            // For large maps like Erangel, the distance might seem small, for small maps like Haven, it would be proportionally larger
            const gradientSize = maxPixelDistance * 1.5; // Reduced from 2.0
            
            gradient.style.width = `${gradientSize}px`;
            gradient.style.height = `${gradientSize}px`;
            gradient.style.left = `${pointX * 100}%`;
            gradient.style.top = `${pointY * 100}%`;
            gradient.style.borderRadius = '50%';
            gradient.style.transform = 'translate(-50%, -50%)';
            
            // Set gradient style
            gradient.style.background = 'radial-gradient(circle, rgba(52, 152, 219, 0.7) 0%, rgba(52, 152, 219, 0.4) 50%, rgba(52, 152, 219, 0) 100%)';
            gradient.style.opacity = '0.25'; // Slightly less opaque
            
            // Add to the container
            planePath.appendChild(gradient);
            
            // Store reference to the middle one
            if (i === Math.floor(numSections / 2)) {
                parachuteGradient = gradient;
            }
        }
    }
    
    // Create a jump marker
    function createJumpMarker(x, y) {
        // Remove existing marker
        if (jumpMarker) {
            jumpMarker.remove();
            jumpMarker = null;
        }
        
        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'jump-marker';
        
        // Position it
        marker.style.position = 'absolute';
        marker.style.left = `${x * 100}%`;
        marker.style.top = `${y * 100}%`;
        
        // Add to container
        planePath.appendChild(marker);
        
        // Store reference
        jumpMarker = marker;
    }
    
    // Create an exit marker showing where to jump from the plane
    function createExitMarker(x, y) {
        // Remove existing marker
        if (exitMarker) {
            exitMarker.remove();
            exitMarker = null;
        }
        
        // Create marker element
        const marker = document.createElement('div');
        marker.className = 'exit-marker';
        
        // Position it
        marker.style.position = 'absolute';
        marker.style.left = `${x * 100}%`;
        marker.style.top = `${y * 100}%`;
        
        // Add to container
        planePath.appendChild(marker);
        
        // Store reference
        exitMarker = marker;
        exitPoint = { x, y };
    }
    
    // Calculate jump parameters based on plane path and jump position
    function calculateJumpParameters() {
        if (!planeStartPosition || !planeEndPosition || !jumpPosition || !currentMap) {
            return;
        }
        
        // Get image dimensions
        const imgWidth = mapImage.naturalWidth;
        const imgHeight = mapImage.naturalHeight;
        
        // Calculate pixel distances
        // 1. Distance from plane start to plane end
        const planePathDx = (planeEndPosition.x - planeStartPosition.x) * imgWidth;
        const planePathDy = (planeEndPosition.y - planeStartPosition.y) * imgHeight;
        const planePathLength = Math.sqrt(planePathDx * planePathDx + planePathDy * planePathDy);
        
        // 2. Get plane path direction vector (normalized)
        const planeDirection = {
            x: planePathDx / planePathLength,
            y: planePathDy / planePathLength
        };
        
        // 3. Jump target position relative to plane path
        const jumpDx = (jumpPosition.x - planeStartPosition.x) * imgWidth;
        const jumpDy = (jumpPosition.y - planeStartPosition.y) * imgHeight;
        
        // 4. Calculate the projection of jump position onto the plane path
        const dotProduct = jumpDx * planeDirection.x + jumpDy * planeDirection.y;
        const projectionX = dotProduct * planeDirection.x;
        const projectionY = dotProduct * planeDirection.y;
        
        // 5. Find the nearest point on the plane path to the jump position
        const nearestPointOnPath = {
            x: planeStartPosition.x + (projectionX / imgWidth),
            y: planeStartPosition.y + (projectionY / imgHeight)
        };
        
        // 6. Calculate the perpendicular distance from the plane path
        const perpendicularDx = jumpDx - projectionX;
        const perpendicularDy = jumpDy - projectionY;
        const perpendicularDistance = Math.sqrt(perpendicularDx * perpendicularDx + perpendicularDy * perpendicularDy);
        
        // Get the map size and calculate distances in meters
        const pixelToMeterRatio = getPixelToMeterRatio();
        const distanceInMeters = Math.round(perpendicularDistance * pixelToMeterRatio);
        
        // Get the current fall strategy values
        let maxDistance, horizontalSpeed, verticalSpeed;
        
        switch (fallStrategy) {
            case 'dive':
                maxDistance = MAX_PARACHUTE_DISTANCE_DIVE;
                horizontalSpeed = HORIZONTAL_SPEED_DIVE;
                verticalSpeed = VERTICAL_SPEED_DIVE;
                break;
            case 'neutral':
                maxDistance = MAX_PARACHUTE_DISTANCE_NEUTRAL;
                horizontalSpeed = HORIZONTAL_SPEED_NEUTRAL;
                verticalSpeed = VERTICAL_SPEED_NEUTRAL;
                break;
            case 'glide':
            default:
                maxDistance = MAX_PARACHUTE_DISTANCE_GLIDE;
                horizontalSpeed = HORIZONTAL_SPEED_GLIDE;
                verticalSpeed = VERTICAL_SPEED_GLIDE;
                break;
        }
        
        // Determine if the jump is possible
        if (distanceInMeters > maxDistance) {
            jumpDistanceValue.textContent = `${distanceInMeters}m (too far)`;
            jumpDistanceValue.style.color = 'red';
            jumpHeightValue.textContent = 'Not possible';
            jumpHeightValue.style.color = 'red';
            jumpExitValue.textContent = 'Not possible';
            jumpExitValue.style.color = 'red';
            return;
        }
        
        // Calculate the actual free-fall time and the time needed to open parachute
        const freefall_time = distanceInMeters / horizontalSpeed;
        const vertical_distance = freefall_time * verticalSpeed;
        let pull_height = PLANE_ALTITUDE - vertical_distance;
        
        // For the exit point, we need to find where on the plane path to jump from
        
        // 7. Calculate the jump exit point - need to jump earlier on the path considering horizontal speed
        // The dot product gives us the projection length along the plane path
        // We need to move back a bit on the path to account for the travel time
        
        // For very close landing spots, adjust the calculation
        let jumpTimeInSeconds, jumpDistanceEarly, exitRatio, exitScaleFactor;
        
        // For very close landing spots (less than 100m), use a different approach
        if (distanceInMeters < 100) {
            // For spots very close to the plane path, we can just jump directly above
            // and pull the chute immediately for maximum precision
            jumpTimeInSeconds = 0;
            jumpDistanceEarly = 0;
            exitRatio = 0;
            exitScaleFactor = 0;
            
            // For very close spots, recommend pulling chute immediately
            pull_height = PLANE_ALTITUDE - 50; // Just give a small freefall time
        } else {
            // Normal calculation for spots at regular distances
            jumpTimeInSeconds = PLANE_ALTITUDE / verticalSpeed; // Approximate time to reach the ground from plane
            
            // Scale the jumpDistanceEarly based on the target distance
            // For closer targets, we need less horizontal travel
            const distanceRatio = Math.min(1, distanceInMeters / maxDistance);
            jumpDistanceEarly = jumpTimeInSeconds * horizontalSpeed * distanceRatio; 
            
            // Calculate the position of the exit point, which is the nearest point - jumpDistanceEarly
            // in the direction opposite to the plane's flight
            exitRatio = jumpDistanceEarly / (pixelToMeterRatio * planePathLength);
            exitScaleFactor = Math.min(exitRatio, 0.95); // Cap at 95% to stay on path
        }
        
        const exitX = nearestPointOnPath.x - (planeDirection.x * exitScaleFactor);
        const exitY = nearestPointOnPath.y - (planeDirection.y * exitScaleFactor);
        
        // Verify exit point is on the plane path
        // If the exit point would be before the start of the path, use the start point
        // If the exit point would be after the end of the path, use the end point
        let finalExitX = exitX;
        let finalExitY = exitY;
        
        // Check if exit point is before start or after end
        const startToExit = Math.sqrt(
            Math.pow((exitX - planeStartPosition.x) * imgWidth, 2) +
            Math.pow((exitY - planeStartPosition.y) * imgHeight, 2)
        );
        
        const startToEnd = Math.sqrt(
            Math.pow((planeEndPosition.x - planeStartPosition.x) * imgWidth, 2) +
            Math.pow((planeEndPosition.y - planeStartPosition.y) * imgHeight, 2)
        );
        
        // Calculate distance along plane path as percentage
        const percentAlongPath = startToExit / startToEnd;
        
        // Direction from start to end
        const toEndX = planeEndPosition.x - planeStartPosition.x;
        const toEndY = planeEndPosition.y - planeStartPosition.y;
        
        if (percentAlongPath < 0) {
            // Before the start of the path, use start point
            finalExitX = planeStartPosition.x;
            finalExitY = planeStartPosition.y;
            
            // Update text to indicate this
            jumpExitValue.textContent = 'At start of path';
        } else if (percentAlongPath > 1) {
            // After the end of the path, use end point
            finalExitX = planeEndPosition.x;
            finalExitY = planeEndPosition.y;
            
            // Update text to indicate this
            jumpExitValue.textContent = 'At end of path';
        } else {
            // On the path, use calculated point
            finalExitX = planeStartPosition.x + (toEndX * percentAlongPath);
            finalExitY = planeStartPosition.y + (toEndY * percentAlongPath);
            
            // Format as percentage along plane path (e.g., "37% along path")
            const percentText = Math.round(percentAlongPath * 100);
            
            // Include the fall strategy in the text
            let strategyName;
            if (fallStrategy === 'dive') {
                strategyName = 'diving down';
            } else if (fallStrategy === 'neutral') {
                strategyName = 'W key only';
            } else {
                strategyName = '45° glide';
            }
            jumpExitValue.textContent = `${percentText}% along path (${strategyName})`;
        }
        
        // Create the exit marker
        createExitMarker(finalExitX, finalExitY);
        
        // Format distances for UI display
        jumpDistanceValue.textContent = `${distanceInMeters}m`;
        jumpDistanceValue.style.color = '#3498db';
        
        // Calculate and display height to pull chute
        // PUBG parachute logic: The farther your target, the higher you need to deploy
        // For close targets: You can free-fall longer
        // For distant targets: You need to deploy high to maximize glide distance
        
        const safetyMargin = 20; // meters
        const autoDeployHeight = 200; // PUBG auto-deploys chute at ~200m
        let recommendedHeight;
        
        // The formula needs to be inverted - longer distances need higher deployment
        // Closer distances can use lower deployment
        
        if (distanceInMeters < 100) {
            // For very close spots, just free fall until auto deploy
            recommendedHeight = autoDeployHeight;
            jumpHeightValue.textContent = `${autoDeployHeight}m (auto)`;
        } else {
            // The farther the distance, the higher we deploy
            // Scale deploy height based on how close we are to max distance
            const distanceRatio = distanceInMeters / maxDistance;
            
            // For max distance, deploy near the maximum effective height
            // For shorter distances, deploy lower
            const maxDeployHeight = 400; // Maximum effective deploy height
            
            // Calculate deploy height based on distance (higher percentage = higher deploy)
            recommendedHeight = autoDeployHeight + ((maxDeployHeight - autoDeployHeight) * distanceRatio);
            
            // Apply safety margin
            recommendedHeight += safetyMargin;
            
            // Cap at reasonable bounds
            recommendedHeight = Math.min(recommendedHeight, PLANE_ALTITUDE - 50);
            recommendedHeight = Math.max(recommendedHeight, autoDeployHeight);
            
            // Format the output
            if (distanceRatio > 0.9) { // Very far distances
                jumpHeightValue.textContent = `${Math.round(recommendedHeight)}m (early)`;
            } else if (distanceRatio < 0.3) { // Short distances
                jumpHeightValue.textContent = `${Math.round(recommendedHeight)}m (late)`;
            } else {
                jumpHeightValue.textContent = `${Math.round(recommendedHeight)}m`;
            }
        }
        
        jumpHeightValue.style.color = '#3498db';
        jumpExitValue.style.color = '#e74c3c'; // Red to match the exit marker
    }
    
    // Reset plane path elements
    function resetPlanePath() {
        // Reset variables
        planeStartPosition = null;
        planeEndPosition = null;
        jumpPosition = null;
        exitPoint = null;
        
        // Clear plane path container (removes all children)
        planePath.innerHTML = '';
        
        // Reset references
        planeLine = null;
        planeIcon = null;
        parachuteGradient = null;
        jumpMarker = null;
        exitMarker = null;
        
        // Reset jump info
        jumpDistanceValue.textContent = '-';
        jumpHeightValue.textContent = '-';
        jumpExitValue.textContent = '-';
        jumpDistanceValue.style.color = '#3498db';
        jumpHeightValue.style.color = '#3498db';
        jumpExitValue.style.color = '#3498db';
        
        // Update instructions if a map is selected
        if (currentMap && appMode === 'plane') {
            instructions.textContent = 'Click to set the start of the plane path';
        }
    }
    
    // Helper function to get pixel to meter ratio
    function getPixelToMeterRatio() {
        const imgWidth = mapImage.naturalWidth;
        const imgHeight = mapImage.naturalHeight;
        const mapSizeInMeters = getMapSizeInMeters(currentMap.name);
        return mapSizeInMeters / Math.max(imgWidth, imgHeight);
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
            if (appMode === 'mortar') {
                instructions.textContent = 'Click on the map to set your position';
            } else {
                instructions.textContent = 'Click and drag to draw the plane path';
            }
        } else {
            instructions.textContent = 'Select a map to begin';
        }
    }

    // Reset the UI completely
    function resetUI() {
        currentMap = null;
        resetPositions();
        resetPlanePath();
        
        // Clear map selection
        mapList.querySelectorAll('li').forEach(li => {
            li.classList.remove('active');
        });
        
        // Clear map image
        mapImage.src = '';
        mapImage.alt = 'PUBG Map';
        
        // Set default mode
        setAppMode('mortar');
    }

    // Initialize the app
    init();
});