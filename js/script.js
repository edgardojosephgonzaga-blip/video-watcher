const signupTab = document.getElementById("signupTab")
const loginTab = document.getElementById("loginTab")

const signupForm = document.getElementById("signupForm")
const loginForm = document.getElementById("loginForm")

if(signupTab){

loginForm.style.display="none"

signupTab.onclick=()=>{
signupForm.style.display="block"
loginForm.style.display="none"
signupTab.classList.add("active")
loginTab.classList.remove("active")
}

loginTab.onclick=()=>{
signupForm.style.display="none"
loginForm.style.display="block"
loginTab.classList.add("active")
signupTab.classList.remove("active")
}

}

function goHost(){
window.location.href="host.html"
}

function goViewer(){
window.location.href="viewer.html"
}

function goBack(){
  // Remove participant if in a room
  if(window.currentRoom && window.currentUser) {
    removeParticipant(window.currentRoom, window.currentUser.uid);
  }
  localStorage.removeItem('currentRoom');
  window.currentRoom = null;
  window.location.href="role.html"
}

const youtubeBtn=document.getElementById("youtubeBtn")
const uploadBtn=document.getElementById("uploadBtn")

const youtubeInput=document.getElementById("youtubeInput")
const uploadInput=document.getElementById("uploadInput")

if(youtubeBtn){

youtubeBtn.onclick=()=>{
youtubeInput.style.display="block"
uploadInput.style.display="none"
youtubeBtn.classList.add("active")
uploadBtn.classList.remove("active")
}

uploadBtn.onclick=()=>{
youtubeInput.style.display="none"
uploadInput.style.display="block"
uploadBtn.classList.add("active")
youtubeBtn.classList.remove("active")
}

}

// VIDEO LOADING AND ROOM MANAGEMENT
function loadVideo(){
  const youtubeUrl = document.querySelector('#youtubeInput input')?.value;
  const fileInput = document.querySelector('#uploadInput input');
  
  if(!window.currentUser){
    alert("Please sign in first so the app can create a room code for you.");
    return;
  }
  
  if(youtubeUrl){
    loadYoutubeVideo(youtubeUrl);
  } else if(fileInput?.files?.length > 0){
    loadUploadedVideo(fileInput.files[0]);
  } else {
    alert("Please select a video source");
  }
}

function loadYoutubeVideo(url){
  const videoId = extractYoutubeId(url);
  if(!videoId){
    alert("Invalid YouTube URL. Please try:\n• https://www.youtube.com/watch?v=VIDEO_ID\n• https://youtu.be/VIDEO_ID\n• Just the VIDEO_ID (11 characters)");
    return;
  }
  
  const videoPlayer = document.querySelector('.video-player');
  
  // Add iframe with better parameters for embedding
  videoPlayer.innerHTML = `
    <iframe 
      width="100%" 
      height="100%" 
      src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&fs=1" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen
      style="border:none; background:#000;"
      onload="console.log('YouTube video loaded successfully')"
      onerror="alert('Failed to load YouTube video. The video may be unavailable or not embeddable.')"
    ></iframe>
    <p id="videoStatus" style="text-align:center; color:#888; font-size:14px; margin-top:10px;">Loading video...</p>
  `;
  
  // Get current user and create/update room
  if(window.currentUser){
    const videoData = {
      type: 'youtube',
      url: url,
      videoId: videoId,
      loadedAt: new Date().toISOString()
    };
    window.currentVideoData = videoData;
    
    if(!window.currentRoom){
      window.currentRoom = window.createRoom(window.currentUser.uid, videoData);
      setTranscriptStatus('Ready to transcribe with Gemini.');
      // Start listening to participants
      setTimeout(() => {
        if(window.currentRoom) {
          window.listenToParticipants(window.currentRoom, window.updateParticipantsList);
          window.listenToRoomTranscript(window.currentRoom, window.updateTranscriptPanel);
          
          // Start listening to doodle sync
          window.listenToDoodles(window.currentRoom, window.updateViewerAnnotations);
          
          // Initialize doodle canvas after video loads
          setTimeout(() => {
            const canvas = document.getElementById('doodleCanvas');
            if(canvas) {
              const container = document.querySelector('.video-player-container');
              canvas.width = container.offsetWidth;
              canvas.height = container.offsetHeight;
            }
          }, 500);
        }
      }, 500);
    } else {
      updateRoomVideo(window.currentRoom, videoData);
      window.listenToRoomTranscript(window.currentRoom, window.updateTranscriptPanel);
      updateTranscriptPanel(null);
      setTranscriptStatus('Ready to transcribe with Gemini.');
    }
  }
}

function loadUploadedVideo(file){
  const reader = new FileReader();
  reader.onload = function(e){
    const videoPlayer = document.querySelector('.video-player');
    videoPlayer.innerHTML = `
      <video width="100%" height="100%" controls style="background:#000;">
        <source src="${e.target.result}" type="${file.type}">
        Your browser does not support HTML5 video.
      </video>
      <p id="videoStatus" style="text-align:center; color:#888; font-size:14px; margin-top:10px;">Video loaded: ${file.name}</p>
    `;
    
    if(window.currentUser){
      const videoData = {
        type: 'upload',
        url: e.target.result,
        mimeType: file.type || 'video/mp4',
        fileName: file.name,
        loadedAt: new Date().toISOString()
      };
      window.currentVideoData = videoData;
      
      if(!window.currentRoom){
        window.currentRoom = window.createRoom(window.currentUser.uid, videoData);
        setTranscriptStatus('Ready to transcribe with Gemini.');
        // Start listening to participants
        setTimeout(() => {
          if(window.currentRoom) {
            window.listenToParticipants(window.currentRoom, window.updateParticipantsList);
            window.listenToRoomTranscript(window.currentRoom, window.updateTranscriptPanel);
            
            // Start listening to doodle sync
            window.listenToDoodles(window.currentRoom, window.updateViewerAnnotations);
            
            // Attach playback sync for host video
            attachVideoPlaybackSync(window.currentRoom);
            
            // Initialize doodle canvas after video loads
            setTimeout(() => {
              const canvas = document.getElementById('doodleCanvas');
              if(canvas) {
                const container = document.querySelector('.video-player-container');
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
              }
            }, 500);
          }
        }, 500);
      } else {
        updateRoomVideo(window.currentRoom, videoData);
        window.listenToRoomTranscript(window.currentRoom, window.updateTranscriptPanel);
        updateTranscriptPanel(null);
        setTranscriptStatus('Ready to transcribe with Gemini.');
      }
    }
  };
  reader.readAsDataURL(file);
}

function updateRoomVideo(roomCode, videoData){
  // Will be called from window.updateRoomVideo (defined in firebase.js)
  if(window.updateRoomVideo) {
    window.updateRoomVideo(roomCode, videoData);
  }
}

// Add video playback sync for host
function attachVideoPlaybackSync(roomCode) {
  const videoElement = document.querySelector('.video-player video');
  if(!videoElement) return;
  
  videoElement.addEventListener('play', () => {
    if(window.updatePlaybackState) {
      window.updatePlaybackState(roomCode, {
        status: 'playing',
        currentTime: videoElement.currentTime
      });
    }
  });
  
  videoElement.addEventListener('pause', () => {
    if(window.updatePlaybackState) {
      window.updatePlaybackState(roomCode, {
        status: 'paused',
        currentTime: videoElement.currentTime
      });
    }
  });
  
  videoElement.addEventListener('seeked', () => {
    if(window.updatePlaybackState) {
      window.updatePlaybackState(roomCode, {
        status: videoElement.paused ? 'paused' : 'playing',
        currentTime: videoElement.currentTime
      });
    }
  });
}

// Apply playback state on viewer side
window.applyPlaybackState = function(playbackState) {
  const videoElement = document.querySelector('.video-player video');
  if(!videoElement) return;
  
  // Only sync if the state was updated recently (within 2 seconds)
  const timeSinceUpdate = Date.now() - (playbackState.timestamp || Date.now());
  if(timeSinceUpdate > 2000) return;
  
  // Apply seek if time difference is > 1 second
  if(Math.abs(videoElement.currentTime - playbackState.currentTime) > 1) {
    videoElement.currentTime = playbackState.currentTime;
  }
  
  // Apply play/pause
  if(playbackState.status === 'playing' && videoElement.paused) {
    videoElement.play().catch(err => console.log("Auto-play prevented:", err));
  } else if(playbackState.status === 'paused' && !videoElement.paused) {
    videoElement.pause();
  }
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 480) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

function adjustScreenForDevice() {
  const deviceType = getDeviceType();
  document.documentElement.dataset.deviceType = deviceType;
  document.body.dataset.deviceType = deviceType;
}

function setTranscriptStatus(message){
  const status = document.getElementById('transcriptStatus');
  if(status) {
    status.textContent = message;
  }
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

window.updateTranscriptPanel = function(transcript){
  const notes = document.getElementById('transcriptNotes');
  if(!notes) return;

  if(!transcript || !transcript.text){
    notes.innerHTML = '<p class="empty-transcript">No transcript yet.</p>';
    return;
  }

  const generatedAt = transcript.generatedAt
    ? new Date(transcript.generatedAt).toLocaleString()
    : 'Just now';
  notes.innerHTML = `
    <span class="transcript-meta">Generated ${escapeHtml(generatedAt)}</span>
    ${escapeHtml(transcript.text)}
  `;
  setTranscriptStatus('Gemini notes are ready.');
}

function getTranscriptionEndpoint(){
  return window.TRANSCRIBE_API_URL || '/api/transcribe-video';
}

async function readApiResponse(response){
  const contentType = response.headers.get('content-type') || '';
  if(contentType.includes('application/json')){
    return response.json();
  }

  const body = await response.text();
  const preview = body.trim().slice(0, 80);
  throw new Error(
    `Transcription backend is not connected. Expected JSON from ${getTranscriptionEndpoint()}, but received: ${preview || response.statusText}`
  );
}

window.transcribeCurrentVideo = async function(){
  const button = document.getElementById('transcribeBtn');
  const videoData = window.currentVideoData;

  if(!window.currentRoom || !videoData){
    alert('Load a video first so Gemini has something to transcribe.');
    return;
  }

  try {
    if(button) {
      button.disabled = true;
      button.textContent = 'Working...';
    }
    setTranscriptStatus('Gemini is transcribing the video...');

    const response = await fetch(getTranscriptionEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoData })
    });
    const result = await readApiResponse(response);

    if(!response.ok){
      throw new Error(result.error || 'Unable to transcribe this video.');
    }

    const transcript = {
      text: result.transcript,
      generatedAt: new Date().toISOString(),
      source: videoData.type,
      model: result.model || 'gemini'
    };

    await updateRoomTranscript(window.currentRoom, transcript);
    updateTranscriptPanel(transcript);
  } catch(error) {
    console.error('Transcription failed:', error);
    setTranscriptStatus(error.message);
    alert(error.message);
  } finally {
    if(button) {
      button.disabled = false;
      button.textContent = 'Transcribe';
    }
  }
}

window.addEventListener('load', adjustScreenForDevice);
window.addEventListener('resize', adjustScreenForDevice);
window.addEventListener('orientationchange', adjustScreenForDevice);

function extractYoutubeId(url){
  // Handle various YouTube URL formats
  let videoId = '';
  
  // youtu.be format
  if(url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
  }
  // youtube.com/watch format
  else if(url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
  }
  // youtube.com/embed format
  else if(url.includes('/embed/')) {
    videoId = url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
  }
  // Direct video ID
  else if(url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    videoId = url;
  }
  
  return videoId.trim();
}

// Make functions globally accessible
window.loadVideo = loadVideo;

// PARTICIPANTS MANAGEMENT
window.toggleParticipants = function(){
  const panel = document.getElementById('participantsPanel');
  if(panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

window.showRoomCode = function(){
  if(!window.currentRoom && localStorage.getItem('currentRoom')){
    window.currentRoom = localStorage.getItem('currentRoom');
  }

  if(window.currentRoom) {
    navigator.clipboard?.writeText(window.currentRoom).catch(() => {});
    alert(`Your Room Code: ${window.currentRoom}\n\nShare this code with viewers to join!\n\n(The code has been copied to your clipboard.)`);
  } else {
    alert("Load a video first to create a room code!");
  }
}

window.updateParticipantsList = function(participants){
  const listContainer = document.getElementById('participantsList');
  if(!listContainer) return;
  
  listContainer.innerHTML = '';
  
  if(!participants || Object.keys(participants).length === 0) {
    listContainer.innerHTML = '<p style="color:#777;">No participants yet</p>';
    return;
  }
  
  Object.values(participants).forEach(participant => {
    const participantEl = document.createElement('div');
    participantEl.className = 'participant-item';
    
    participantEl.innerHTML = `
      <div>
        <div class="participant-name">${participant.fullName}</div>
        <div class="participant-role">${participant.role}</div>
      </div>
    `;
    
    listContainer.appendChild(participantEl);
  });
}

// Clean up participant when page is unloaded
window.addEventListener('beforeunload', () => {
  if(window.currentRoom && window.currentUser) {
    removeParticipant(window.currentRoom, window.currentUser.uid);
  }
});
