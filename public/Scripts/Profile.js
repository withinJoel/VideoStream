function showProfileModal() {
    if (!isAuthenticated) {
        showToast('Please login first', 'error');
        return;
    }
    
    // Populate form with current user data
    document.getElementById('profileUsername').value = currentUser.username;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('profileAvatar').src = currentUser.avatar;
    
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const username = document.getElementById('profileUsername').value;
    const email = document.getElementById('profileEmail').value;
    const bio = document.getElementById('profileBio').value;
    
    try {
        const response = await fetch(`/api/user/profile/${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, bio, avatar: currentUser.avatar })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAuthUI();
            hideProfileModal();
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(data.error || 'Profile update failed', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showToast('Profile update failed', 'error');
    }
}

function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image too large. Please choose a file under 5MB.', 'error');
            return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.avatar = e.target.result;
            document.getElementById('profileAvatar').src = e.target.result;
            document.getElementById('userAvatarImg').src = e.target.result;
            document.getElementById('commentUserAvatar').src = e.target.result;
            
            // Save to localStorage immediately
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
    }
}