// Canvas and drawing setup
const canvas = document.getElementById('doodleCanvas');
const ctx = canvas?.getContext('2d');
const toggleDoodleBtn = document.getElementById('toggleDoodle');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const doodleColor = document.getElementById('doodleColor');
const brushSize = document.getElementById('brushSize');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const zoomLevel = document.getElementById('zoomLevel');
const videoPlayerContainer = document.querySelector('.video-player-container');

let isDrawing = false;
let doodleEnabled = false;
let currentZoom = 100;
let drawingHistory = [];
let lastX = 0;
let lastY = 0;

// Pan functionality for zoomed video
let isPanning = false;
let panX = 0;
let panY = 0;
let startPanX = 0;
let startPanY = 0;

// Initialize canvas if it exists
if(canvas && ctx) {
  // Check if this is viewer mode (read-only)
  const isViewerMode = document.body.contains(document.querySelector('.viewer-mode'));
  
  function initCanvas() {
    const container = document.querySelector('.video-player-container');
    if(container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      
      // Draw transparent background
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      drawingHistory = [];
      drawingHistory.push(canvas.toDataURL());
    }
  }

  // Initialize on load
  window.addEventListener('load', () => {
    setTimeout(initCanvas, 100);
  });
  window.addEventListener('resize', initCanvas);

  function pauseHostVideoForDrawing() {
    const videoElement = document.querySelector('.video-player video');
    if(videoElement) {
      videoElement.pause();
      return;
    }
    const iframe = document.querySelector('.video-player iframe');
    if(iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'pauseVideo',
        args: []
      }), '*');
    }
  }

  // Toggle doodle mode
  if(toggleDoodleBtn) {
    toggleDoodleBtn.addEventListener('click', () => {
      // Only allow toggle if not in viewer mode
      if(document.querySelector('.viewer-mode')) {
        alert("Viewers cannot draw. This is a read-only session.");
        return;
      }
      
      doodleEnabled = !doodleEnabled;
      canvas.style.display = doodleEnabled ? 'block' : 'none';
      toggleDoodleBtn.textContent = doodleEnabled ? '🎨 Doodle Off' : '🎨 Doodle On';
      
      if(doodleEnabled) {
        pauseHostVideoForDrawing();
        if(canvas.width === 0) {
          setTimeout(initCanvas, 50);
        }
      }
    });
  }

  // Save drawing state
  function saveState() {
    drawingHistory.push(canvas.toDataURL());
    
    // Limit history to 20 states
    if(drawingHistory.length > 20) {
      drawingHistory.shift();
    }
  }

  // Undo last draw
  if(undoBtn) {
    undoBtn.addEventListener('click', () => {
      if(drawingHistory.length > 1) {
        drawingHistory.pop();
        const img = new Image();
        img.src = drawingHistory[drawingHistory.length - 1];
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        
        // Sync undo to viewers
        if(window.currentRoom && window.uploadDoodleStroke) {
          window.uploadDoodleStroke(window.currentRoom, {
            type: 'undo',
            timestamp: Date.now()
          });
        }
      }
    });
  }

  // Clear canvas
  if(clearBtn) {
    clearBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawingHistory = [];
      drawingHistory.push(canvas.toDataURL());
      
      // Sync clear to viewers
      if(window.currentRoom && window.clearDoodles) {
        window.clearDoodles(window.currentRoom);
      }
    });
  }

  // Zoom in
  if(zoomIn) {
    zoomIn.addEventListener('click', () => {
      if(currentZoom < 300) {
        currentZoom += 10;
        applyZoom();
      }
    });
  }

  if(zoomOut) {
    zoomOut.addEventListener('click', () => {
      if(currentZoom > 100) {
        currentZoom -= 10;
        applyZoom();
      }
    });
  }

  function applyZoom() {
    if(zoomLevel) {
      zoomLevel.textContent = currentZoom + '%';
    }
    const videoPlayer = document.querySelector('.video-player');
    if(videoPlayer) {
      const scale = currentZoom / 100;
      videoPlayer.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
      videoPlayer.style.transformOrigin = 'top center';
      videoPlayer.style.cursor = currentZoom > 100 ? 'grab' : 'default';
    }
    
    // Reset pan when zooming back to 100%
    if(currentZoom === 100) {
      panX = 0;
      panY = 0;
    }
  }

  // Pan functionality when zoomed in
  videoPlayerContainer.addEventListener('mousedown', (e) => {
    if(currentZoom > 100 && !doodleEnabled) {
      isPanning = true;
      startPanX = e.clientX - panX;
      startPanY = e.clientY - panY;
      const videoPlayer = document.querySelector('.video-player');
      if(videoPlayer) {
        videoPlayer.style.cursor = 'grabbing';
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if(isPanning && currentZoom > 100) {
      const scale = currentZoom / 100;
      const maxPanX = (videoPlayerContainer.offsetWidth * scale - videoPlayerContainer.offsetWidth) / (2 * scale);
      const maxPanY = (videoPlayerContainer.offsetHeight * scale - videoPlayerContainer.offsetHeight) / (2 * scale);
      
      panX = Math.max(-maxPanX, Math.min(maxPanX, (e.clientX - startPanX) / scale));
      panY = Math.max(-maxPanY, Math.min(maxPanY, (e.clientY - startPanY) / scale));
      
      const videoPlayer = document.querySelector('.video-player');
      if(videoPlayer) {
        videoPlayer.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if(isPanning) {
      isPanning = false;
      const videoPlayer = document.querySelector('.video-player');
      if(videoPlayer) {
        videoPlayer.style.cursor = currentZoom > 100 ? 'grab' : 'default';
      }
    }
  });

  // Mouse drawing
  canvas.addEventListener('mousedown', (e) => {
    // Prevent drawing on viewer mode
    if(document.querySelector('.viewer-mode')) return;
    if (!doodleEnabled) return;
    
    isDrawing = true;
    saveState();
    
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !doodleEnabled) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.strokeStyle = doodleColor?.value || '#FF0000';
    ctx.lineWidth = brushSize?.value || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Send stroke to Firebase for real-time sync
    if(window.currentRoom) {
      const stroke = {
        startX: lastX,
        startY: lastY,
        endX: x,
        endY: y,
        color: doodleColor?.value || '#FF0000',
        size: brushSize?.value || 3,
        timestamp: Date.now()
      };
      window.uploadDoodleStroke(window.currentRoom, stroke);
      lastX = x;
      lastY = y;
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
  });

  // Touch support for mobile
  canvas.addEventListener('touchstart', (e) => {
    if (!doodleEnabled) return;
    
    e.preventDefault();
    isDrawing = true;
    saveState();
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || !doodleEnabled) return;
    
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.strokeStyle = doodleColor?.value || '#FF0000';
    ctx.lineWidth = brushSize?.value || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Send stroke to Firebase for real-time sync
    if(window.currentRoom) {
      const stroke = {
        startX: lastX,
        startY: lastY,
        endX: x,
        endY: y,
        color: doodleColor?.value || '#FF0000',
        size: brushSize?.value || 3,
        timestamp: Date.now()
      };
      window.uploadDoodleStroke(window.currentRoom, stroke);
      lastX = x;
      lastY = y;
    }
  });

  canvas.addEventListener('touchend', () => {
    isDrawing = false;
  });
}

// Export for Firebase sync
window.getDrawingData = () => canvas?.toDataURL() || null;