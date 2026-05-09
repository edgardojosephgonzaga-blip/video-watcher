import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const loginPage = document.getElementById('loginPage');
const rolePage = document.getElementById('rolePage');
const signupTab = document.getElementById('signupTab');
const loginTab = document.getElementById('loginTab');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const hostBtn = document.getElementById('hostBtn');
const viewerBtn = document.querySelector('.roleCard:not(#hostBtn)');

// Tab switching
signupTab.addEventListener('click', () => {
    signupTab.classList.add('activeTab');
    loginTab.classList.remove('activeTab');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
});

loginTab.addEventListener('click', () => {
    loginTab.classList.add('activeTab');
    signupTab.classList.remove('activeTab');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
});

// Signup
signupBtn.addEventListener('click', async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!email.toLowerCase().endsWith('@gordoncollege.edu.ph')) {
        alert('Please use your @gordoncollege.edu.ph email');
        return;
    }

    if (password !== confirm) {
        alert('Passwords do not match');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name,
            email
        }, { merge: true });
        alert('Account created successfully!');
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
});

// Login
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
});

// Role selection
hostBtn.addEventListener('click', () => {
    window.location.href = '/?role=host';
});

viewerBtn.addEventListener('click', () => {
    window.location.href = '/?role=viewer';
});

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginPage.style.display = 'none';
        rolePage.style.display = 'block';
    } else {
        loginPage.style.display = 'block';
        rolePage.style.display = 'none';
    }
});
