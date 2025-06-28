async function handleSubscribe(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'error');
        return;
    }
    
    const performerName = document.getElementById('modalVideoPerformer').textContent;
    const btn = document.getElementById('subscribeBtn');
    const isSubscribed = btn.classList.contains('active');
    
    try {
        if (isSubscribed) {
            // Unsubscribe
            const response = await fetch(`/api/subscriptions/${performerName}?userId=${currentUser.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-bell"></i><span>Subscribe</span>';
                showToast('Unsubscribed successfully', 'success');
            }
        } else {
            // Subscribe
            const response = await fetch(`/api/subscriptions/${performerName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.id })
            });
            
            if (response.ok) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Unsubscribe</span>';
                showToast('Subscribed successfully', 'success');
            }
        }
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Failed to update subscription', 'error');
    }
}

async function handlePerformerSubscribe(e, performerName) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
        showToast('Please login to subscribe', 'error');
        return;
    }
    
    const btn = e.target;
    const isSubscribed = btn.classList.contains('subscribed');
    
    try {
        if (isSubscribed) {
            // Unsubscribe
            const response = await fetch(`/api/subscriptions/${performerName}?userId=${currentUser.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                btn.classList.remove('subscribed');
                btn.innerHTML = '<i class="fas fa-bell"></i> Subscribe';
                showToast('Unsubscribed successfully', 'success');
            }
        } else {
            // Subscribe
            const response = await fetch(`/api/subscriptions/${performerName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.id })
            });
            
            if (response.ok) {
                btn.classList.add('subscribed');
                btn.innerHTML = '<i class="fas fa-bell-slash"></i> Unsubscribe';
                showToast('Subscribed successfully', 'success');
            }
        }
    } catch (error) {
        console.error('Subscription error:', error);
        showToast('Failed to update subscription', 'error');
    }
}