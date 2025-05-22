// Core logic for the interactive PUBG mortar calculator
// Handles map selection, zooming and distance calculations

document.addEventListener('DOMContentLoaded', () => {
    const mapList = document.getElementById('map-list');
    const mapImage = document.getElementById('map-image');
    const mapContent = document.getElementById('map-content');
    const markers = document.getElementById('markers');
    const instructions = document.getElementById('instructions');
    const distanceEl = document.getElementById('distance');
    const resetBtn = document.getElementById('reset-btn');
    const mapViewport = document.getElementById('map-viewport');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const loadingSpinner = document.getElementById('loading-spinner');

    const maps = {
        erangel: { name: 'Erangel', image: 'img/erangel.png', scale: 1000 },
        miramar: { name: 'Miramar', image: 'img/miramar.png', scale: 1000 },
        sanhok: { name: 'Sanhok', image: 'img/sanhok.png', scale: 400 },
        vikendi: { name: 'Vikendi', image: 'img/vikendi.png', scale: 800 },
        karakin: { name: 'Karakin', image: 'img/karakin.png', scale: 200 },
        paramo: { name: 'Paramo', image: 'img/paramo.png', scale: 300 },
        haven:  { name: 'Haven',  image: 'img/haven.png',  scale: 150 },
        taego:  { name: 'Taego',  image: 'img/taego.png',  scale: 1000 },
        deston: { name: 'Deston', image: 'img/deston.png', scale: 1000 }
    };

    let currentMap = null;
    let playerPosition = null;
    let targetPosition = null;
    let line = null;

    let currentZoom = 1;
    const minZoom = 1;
    const maxZoom = 5;
    const zoomIncrement = 0.5;
    let isDragging = false;
    // Initialize the app and bind events

    function init() {
        currentZoom = 1;
        mapContent.style.transform = 'scale(1)';
        setupEventListeners();
        resetUI();
    }
    // Set up mouse, keyboard and UI listeners

    function setupEventListeners() {
        mapList.addEventListener('click', handleMapSelection);
        mapImage.addEventListener('click', handleMapClick);
        resetBtn.addEventListener('click', resetPositions);
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        zoomResetBtn.addEventListener('click', resetZoom);

        mapViewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.deltaY < 0 ? zoomIn() : zoomOut();
            } else if (currentZoom > 1) {
                e.preventDefault();
                mapViewport.scrollLeft += e.deltaX;
                mapViewport.scrollTop += e.deltaY;
            }
        }, { passive: false });

        let lastX = 0;
        let lastY = 0;
        mapViewport.addEventListener('mousedown', (e) => {
            if (currentZoom > 1 || e.button === 1) {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                mapViewport.style.cursor = 'grabbing';
                e.preventDefault();
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
                mapViewport.style.cursor = currentZoom > 1 ? 'move' : 'auto';
                setTimeout(() => { isDragging = false; }, 10);
            }
        });
        mapViewport.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault();
        });
    }
    // Increase zoom level while keeping the center in view

    function zoomIn() {
        if (currentZoom < maxZoom) {
            const vw = mapViewport.clientWidth;
            const vh = mapViewport.clientHeight;
            const sx = (mapViewport.scrollLeft + vw / 2) / (mapContent.offsetWidth * currentZoom);
            const sy = (mapViewport.scrollTop + vh / 2) / (mapContent.offsetHeight * currentZoom);
            currentZoom += zoomIncrement;
            applyZoom();
            setTimeout(() => {
                mapViewport.scrollLeft = (mapContent.offsetWidth * currentZoom * sx) - vw / 2;
                mapViewport.scrollTop = (mapContent.offsetHeight * currentZoom * sy) - vh / 2;
            }, 10);
        }
    }
    // Decrease zoom and reset position when necessary

    function zoomOut() {
        if (currentZoom > minZoom) {
            const vw = mapViewport.clientWidth;
            const vh = mapViewport.clientHeight;
            const sx = (mapViewport.scrollLeft + vw / 2) / (mapContent.offsetWidth * currentZoom);
            const sy = (mapViewport.scrollTop + vh / 2) / (mapContent.offsetHeight * currentZoom);
            currentZoom -= zoomIncrement;
            applyZoom();
            setTimeout(() => {
                if (currentZoom > 1) {
                    mapViewport.scrollLeft = (mapContent.offsetWidth * currentZoom * sx) - vw / 2;
                    mapViewport.scrollTop = (mapContent.offsetHeight * currentZoom * sy) - vh / 2;
                } else {
                    mapViewport.scrollLeft = 0;
                    mapViewport.scrollTop = 0;
                }
            }, 10);
        }
    }
    // Restore default zoom state

    function resetZoom() {
        currentZoom = 1;
        mapContent.style.transform = 'scale(1)';
        mapViewport.scrollLeft = 0;
        mapViewport.scrollTop = 0;
        mapViewport.style.overflow = 'hidden';
        mapImage.style.cursor = 'crosshair';
        mapImage.style.maxWidth = '100%';
        mapImage.style.maxHeight = '100%';
        updateOverlay();
    }
    // Apply the current zoom factor to the map

    function applyZoom() {
        mapContent.style.transform = `scale(${currentZoom})`;
        mapContent.style.transformOrigin = 'top left';
        mapViewport.style.overflow = 'auto';
        mapImage.style.cursor = currentZoom > 1 ? 'move' : 'crosshair';
        if (currentZoom === 1) {
            mapViewport.scrollLeft = 0;
            mapViewport.scrollTop = 0;
        }
        updateOverlay();
    }
    // Change the displayed map when the user selects a new one

    function handleMapSelection(e) {
        if (e.target.tagName === 'LI') {
            const mapId = e.target.getAttribute('data-map');
            mapList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');
            loadMap(mapId);
        }
    }
    // Load the chosen map image and reset UI elements

    function loadMap(mapId) {
        currentMap = maps[mapId];
        resetZoom();
        resetPositions();
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        mapImage.src = currentMap.image;
        mapImage.alt = `${currentMap.name} Map`;
        mapImage.onload = () => {
            const mapInfo = document.getElementById('map-info');
            if (mapInfo) {
                const mapSize = getMapSizeInMeters(currentMap.name);
                const ratio = mapSize / Math.max(mapImage.naturalWidth, mapImage.naturalHeight);
                mapInfo.textContent = `Map: ${mapImage.naturalWidth}×${mapImage.naturalHeight}px (${ratio.toFixed(2)}m/px)`;
            }
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            setTimeout(resetZoom, 50);
        };
        mapImage.onerror = () => {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        };
        instructions.textContent = 'Click on the map to set your position';
        distanceEl.style.display = 'flex';
    }
    // Record player and target positions on map clicks

    function handleMapClick(e) {
        if (isDragging || !currentMap) return;
        const rect = mapImage.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top || e.clientY > rect.bottom) {
            return;
        }
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        if (!playerPosition) {
            playerPosition = { x, y };
            createMarker(x, y, 'player');
            instructions.textContent = 'Now click where you want to target with mortars';
        } else if (!targetPosition) {
            targetPosition = { x, y };
            createMarker(x, y, 'target');
            createLine(playerPosition, targetPosition);
            calculateDistance();
            instructions.textContent = 'Distance calculated. Use the reset button to start over.';
        }
    }
    // Add a marker element to visualize positions

    function createMarker(x, y, type) {
        const marker = document.createElement('div');
        marker.className = `marker ${type}`;
        marker.style.position = 'absolute';
        marker.style.left = `${x * 100}%`;
        marker.style.top = `${y * 100}%`;
        marker.style.transform = `translate(-50%, -50%) scale(${1 / currentZoom})`;
        markers.appendChild(marker);
    }
    // Draw a line between player and target markers

    function createLine(from, to) {
        if (line) line.remove();
        const lineContainer = document.createElement('div');
        lineContainer.className = 'line-container';
        lineContainer.style.position = 'absolute';
        lineContainer.style.left = `${from.x * 100}%`;
        lineContainer.style.top = `${from.y * 100}%`;
        lineContainer.style.transformOrigin = 'left center';
        const lineEl = document.createElement('div');
        lineEl.className = 'line';
        const rect = mapImage.getBoundingClientRect();
        const fromXPx = from.x * rect.width;
        const fromYPx = from.y * rect.height;
        const toXPx = to.x * rect.width;
        const toYPx = to.y * rect.height;
        const dx = toXPx - fromXPx;
        const dy = toYPx - fromYPx;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        lineEl.style.width = `${length / currentZoom}px`;
        lineEl.style.transform = `scaleY(${1 / currentZoom})`;
        lineContainer.style.transform = `rotate(${angle}deg)`;
        const endpoint = document.createElement('div');
        endpoint.className = 'line-endpoint';
        endpoint.style.transform = `translate(50%, -50%) scale(${1 / currentZoom})`;
        lineEl.appendChild(endpoint);
        lineContainer.appendChild(lineEl);
        markers.appendChild(lineContainer);
        line = lineContainer;
    }

    // Update markers and lines to keep a consistent size when zooming
    function updateOverlay() {
        document.querySelectorAll('.marker').forEach(marker => {
            marker.style.transform = `translate(-50%, -50%) scale(${1 / currentZoom})`;
        });
        if (playerPosition && targetPosition) {
            createLine(playerPosition, targetPosition);
        }
    }
    // Convert pixel distance to in-game meters

    function calculateDistance() {
        if (!playerPosition || !targetPosition || !currentMap) return;
        const imgWidth = mapImage.naturalWidth;
        const imgHeight = mapImage.naturalHeight;
        const dx = (targetPosition.x - playerPosition.x) * imgWidth;
        const dy = (targetPosition.y - playerPosition.y) * imgHeight;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);
        const mapSize = getMapSizeInMeters(currentMap.name);
        const ratio = mapSize / Math.max(imgWidth, imgHeight);
        const gameDistance = Math.round(pixelDistance * ratio);
        const formatted = gameDistance >= 1000 ? `${(gameDistance/1000).toFixed(2)} km` : `${gameDistance} meters`;
        distanceEl.innerHTML = `<div class="distance-value">${formatted}</div><div class="distance-label">Mortar Distance</div>`;
    }
    // Return the size of each map in meters

    function getMapSizeInMeters(name) {
        const mapSizes = {
            'Erangel': 8000,
            'Miramar': 8000,
            'Sanhok': 4000,
            'Vikendi': 6000,
            'Karakin': 2000,
            'Paramo': 3000,
            'Haven': 1500,
            'Taego': 8000,
            'Deston': 8000
        };
        return mapSizes[name] || 8000;
    }
    // Clear markers and distance information

    function resetPositions() {
        playerPosition = null;
        targetPosition = null;
        markers.innerHTML = '';
        line = null;
        distanceEl.textContent = '';
        if (currentMap) {
            instructions.textContent = 'Click on the map to set your position';
        } else {
            instructions.textContent = 'Select a map to begin';
        }
    }
    // Reset the entire interface to its initial state

    function resetUI() {
        currentMap = null;
        resetPositions();
        mapList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
        mapImage.src = '';
        mapImage.alt = 'PUBG Map';
    }

    init();
});
