function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAuthenticated = true;
        updateAuthUI();
        updateFavoritesCount();
    }
}

function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userMenu = document.getElementById('userMenu');
    
    if (isAuthenticated && currentUser) {
        authSection.style.display = 'none';
        userMenu.style.display = 'block';
        
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatarImg').src = currentUser.avatar || '/api/placeholder/32/32';
        
        // Show authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'flex';
        document.getElementById('ratingSection').style.display = 'flex';
        document.getElementById('commentForm').style.display = 'block';
        document.getElementById('modalPlaylistBtn').style.display = 'flex';
        document.getElementById('subscribeBtn').style.display = 'flex';
        
        // Update comment form avatar
        document.getElementById('commentUserAvatar').src = currentUser.avatar || '/api/placeholder/40/40';
    } else {
        authSection.style.display = 'flex';
        userMenu.style.display = 'none';
        
        // Hide authenticated features
        document.getElementById('createPlaylistBtn').style.display = 'none';
        document.getElementById('ratingSection').style.display = 'none';
        document.getElementById('commentForm').style.display = 'none';
        document.getElementById('modalPlaylistBtn').style.display = 'none';
        document.getElementById('subscribeBtn').style.display = 'none';
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthModal('login');
            showToast('Login successful!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideAuthModal('register');
            showToast('Registration successful!', 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    navigateToSection('home');
    showToast('Logged out successfully', 'success');
}

function showAuthModal(type) {
    document.getElementById(`${type}Modal`).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideAuthModal(type) {
    document.getElementById(`${type}Modal`).classList.remove('active');
    document.body.style.overflow = '';
}

function switchAuthModal(type) {
    hideAuthModal(type === 'login' ? 'register' : 'login');
    showAuthModal(type);
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('active');
}