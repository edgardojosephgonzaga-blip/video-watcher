// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1kMohW-RLw0EpfjgL-twy02f9t7Kfgrg",
  authDomain: "collaborative-video-viewer.firebaseapp.com",
  projectId: "collaborative-video-viewer",
  databaseURL: "https://collaborative-video-viewer-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "collaborative-video-viewer.firebasestorage.app",
  messagingSenderId: "118746109883",
  appId: "1:118746109883:web:1350a9841548bb1134169e",
  measurementId: "G-8DNNW5T2XL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Restore current room if the page refreshes or reloads after room creation
const savedRoom = localStorage.getItem('currentRoom');
if(savedRoom){
  window.currentRoom = savedRoom;
}

onAuthStateChanged(auth, (user) => {
  if(user){
    const userRef = ref(database, `users/${user.uid}`);
    get(userRef).then((snapshot) => {
      if(snapshot.exists()){
        window.currentUser = snapshot.val();
      } else {
        window.currentUser = { uid: user.uid, email: user.email };
      }
    }).catch(error => {
      console.error("Error restoring user profile:", error.message);
      window.currentUser = { uid: user.uid, email: user.email };
    });
  } else {
    window.currentUser = null;
  }
});

// SIGN UP
window.signUp = function(fullName, email, password){

createUserWithEmailAndPassword(auth, email, password)
.then((userCredential)=>{
  const user = userCredential.user;
  
  window.currentUser = { uid: user.uid, fullName: fullName, email: email };
  alert("Account created successfully!")
  window.location.href="role.html"
  
  // Save user info to database (non-blocking)
  const userRef = ref(database, `users/${user.uid}`);
  set(userRef, {
    uid: user.uid,
    fullName: fullName,
    email: email,
    createdAt: new Date().toISOString()
  }).catch(error => {
    console.error("Error saving profile: " + error.message);
  });

})
.catch((error)=>{

alert(error.message)

});

}


// LOGIN
window.login = function(email,password){

signInWithEmailAndPassword(auth,email,password)
.then((userCredential)=>{
  const user = userCredential.user;
  
  window.currentUser = { uid: user.uid, email: email };
  window.location.href="role.html"
  
  // Load full user info from database (non-blocking)
  const userRef = ref(database, `users/${user.uid}`);
  get(userRef).then((snapshot) => {
    if(snapshot.exists()) {
      const userData = snapshot.val();
      window.currentUser = userData;
    }
  }).catch(error => {
    console.error("Error loading user profile: " + error.message);
  });

})
.catch((error)=>{

alert(error.message)

});

}


// LOGOUT
window.logout = function(){

signOut(auth).then(()=>{

window.location.href="index.html"

})

}

window.generateRoomCode = function(){
  return Math.floor(1000 + Math.random() * 9000).toString();
}

window.createRoom = function(userId, videoData){
  const roomCode = window.generateRoomCode();
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  set(roomRef, {
    hostId: userId,
    hostName: window.currentUser?.fullName || "Host",
    videoData: videoData,
    createdAt: new Date().toISOString(),
    annotations: [],
    participants: {
      [userId]: {
        uid: userId,
        fullName: window.currentUser?.fullName || "Host",
        joinedAt: new Date().toISOString(),
        role: "host"
      }
    }
  }).then(() => {
    window.currentRoom = roomCode;
    localStorage.setItem('currentRoom', roomCode);
    const roomButton = document.querySelector('.room');
    if(roomButton) {
      roomButton.textContent = `Room Code: ${roomCode}`;
      roomButton.title = `Click to copy room code ${roomCode}`;
    }
  }).catch(error => {
    alert("Error creating room: " + error.message);
  });
  
  return roomCode;
}

window.updateRoomVideo = function(roomCode, videoData){
  const roomRef = ref(database, `rooms/${roomCode}`);
  update(roomRef, { videoData: videoData }).catch(error => {
    console.error("Error updating room video: " + error.message);
  });
}

window.addParticipant = function(roomCode, userId, fullName){
  const participantRef = ref(database, `rooms/${roomCode}/participants/${userId}`);
  
  set(participantRef, {
    uid: userId,
    fullName: fullName,
    joinedAt: new Date().toISOString(),
    role: "viewer"
  }).catch(error => {
    alert("Error adding participant: " + error.message);
  });
}

window.removeParticipant = function(roomCode, userId){
  const participantRef = ref(database, `rooms/${roomCode}/participants/${userId}`);
  
  set(participantRef, null).catch(error => {
    console.error("Error removing participant: " + error.message);
  });
}

window.listenToParticipants = function(roomCode, callback){
  const participantsRef = ref(database, `rooms/${roomCode}/participants`);
  
  onValue(participantsRef, (snapshot) => {
    if(snapshot.exists()) {
      const participants = snapshot.val();
      callback(participants);
    } else {
      callback({});
    }
  });
}

window.joinRoom = function(){
  const roomCode = document.getElementById('roomCode').value;
  if(roomCode.length !== 4){
    alert("Please enter a valid 4-digit room code");
    return;
  }
  
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  get(roomRef).then((snapshot) => {
    if(snapshot.exists()){
      window.currentRoom = roomCode;
      localStorage.setItem('currentRoom', roomCode);
      
      // Add this viewer to participants
      if(window.currentUser) {
        addParticipant(roomCode, window.currentUser.uid, window.currentUser.fullName);
      }
      
      // Start listening to participants
      listenToParticipants(roomCode, updateParticipantsList);
      
      // Start listening to doodles
      listenToDoodles(roomCode, updateViewerAnnotations);
      
      startListeningToRoom(roomCode);
      const viewerContainer = document.getElementById('viewerContainer');
      viewerContainer.style.display = 'block';
      viewerContainer.classList.add('viewer-mode');
      document.querySelector('.join-room').style.display = 'none';
      document.getElementById('roomCodeDisplay').textContent = `Room: ${roomCode}`;
      
      // Disable doodle canvas interactivity for viewers
      const canvas = document.getElementById('doodleCanvas');
      if(canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
      }
    } else {
      alert("Room not found. Please check the code.");
    }
  }).catch(error => {
    alert("Error: " + error.message);
  });
}

function startListeningToRoom(roomCode){
  const roomRef = ref(database, `rooms/${roomCode}`);
  
  onValue(roomRef, (snapshot) => {
    if(snapshot.exists()){
      const roomData = snapshot.val();
      // Update video if host changed it
      if(roomData.videoData){
        updateViewerVideo(roomData.videoData);
      }
      // Update annotations
      if(roomData.annotations){
        updateViewerAnnotations(roomData.annotations);
      }
      // Apply playback state sync
      if(roomData.playbackState && window.applyPlaybackState){
        window.applyPlaybackState(roomData.playbackState);
      }
    }
  });
}

function updateViewerVideo(videoData){
  const videoPlayer = document.getElementById('videoPlayer');
  if(videoData.type === 'youtube'){
    const videoId = extractYoutubeId(videoData.url);
    videoPlayer.innerHTML = `
      <div style="position:relative; width:100%; height:100%;">
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0&fs=0" 
        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="background:#000;"></iframe>
        <p style="text-align:center; color:#888; font-size:12px; margin-top:10px;">Watching host's YouTube video</p>
      </div>
    `;
  } else if(videoData.type === 'upload'){
    videoPlayer.innerHTML = `
      <div style="position:relative; width:100%; height:100%;">
        <video width="100%" height="100%" style="background:#000;">
          <source src="${videoData.url}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
        <p style="text-align:center; color:#888; font-size:12px; margin-top:10px;">Watching: ${videoData.fileName}</p>
      </div>
    `;
    
    // Auto-sync playback for uploaded videos
    setTimeout(() => {
      const videoElement = videoPlayer.querySelector('video');
      if(videoElement) {
        videoElement.controls = false;
      }
    }, 100);
  }
  
  // Show doodle canvas on viewers side
  const canvas = document.getElementById('doodleCanvas');
  if(canvas) {
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none'; // Make canvas non-interactive
    setTimeout(() => {
      const container = document.querySelector('.video-player-container');
      if(container && canvas.width === 0) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
    }, 300);
  }
}

function updateViewerAnnotations(annotations){
  // Redraw annotations on canvas
  const canvas = document.getElementById('doodleCanvas');
  if(canvas){
    const ctx = canvas.getContext('2d');
    
    // Make sure canvas is visible
    canvas.style.display = 'block';
    
    // Clear before redrawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if(annotations && annotations.length > 0){
      annotations.forEach(annotation => {
        if(annotation.type === 'undo' || annotation.type === 'clear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(annotation.startX, annotation.startY);
        ctx.lineTo(annotation.endX, annotation.endY);
        ctx.stroke();
      });
    }
  }
}

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

window.updateRoomVideo = function(roomCode, videoData){
  const roomRef = ref(database, `rooms/${roomCode}`);
  update(roomRef, {
    videoData: videoData
  }).catch(error => {
    console.error("Error updating video: " + error.message);
  });
}

// Export for use in other files
window.updateViewerVideo = updateViewerVideo;
window.updateViewerAnnotations = updateViewerAnnotations;
window.extractYoutubeId = extractYoutubeId;

// VIDEO PLAYBACK SYNCHRONIZATION
window.updatePlaybackState = function(roomCode, state){
  const playbackRef = ref(database, `rooms/${roomCode}/playbackState`);
  update(playbackRef, {
    status: state.status, // 'playing' or 'paused'
    currentTime: state.currentTime,
    timestamp: new Date().getTime()
  }).catch(error => {
    console.error("Error updating playback state: " + error.message);
  });
}

window.listenToPlaybackState = function(roomCode, callback){
  const playbackRef = ref(database, `rooms/${roomCode}/playbackState`);
  onValue(playbackRef, (snapshot) => {
    if(snapshot.exists()) {
      const state = snapshot.val();
      callback(state);
    }
  });
}

// DOODLE SYNCHRONIZATION
window.uploadDoodleStroke = function(roomCode, stroke){
  const doodlesRef = ref(database, `rooms/${roomCode}/doodles`);
  get(doodlesRef).then((snapshot) => {
    let doodles = snapshot.exists() ? snapshot.val() : [];
    doodles.push(stroke);
    set(doodlesRef, doodles).catch(error => {
      console.error("Error uploading doodle: " + error.message);
    });
  });
}

window.listenToDoodles = function(roomCode, callback){
  const doodlesRef = ref(database, `rooms/${roomCode}/doodles`);
  onValue(doodlesRef, (snapshot) => {
    if(snapshot.exists()) {
      const doodles = snapshot.val();
      callback(doodles);
    } else {
      callback([]);
    }
  });
}

window.clearDoodles = function(roomCode){
  const doodlesRef = ref(database, `rooms/${roomCode}/doodles`);
  set(doodlesRef, []).catch(error => {
    console.error("Error clearing doodles: " + error.message);
  });
}
