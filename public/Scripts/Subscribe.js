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


async function loadSubscriptions() {
    if (!isAuthenticated) {
        showNoResults('Login Required', 'Please login to view your subscriptions');
        return;
    }
    
    if (isLoading) return;
    
    isLoading = true;
    showLoadingIndicator();
    
    try {
        // Get user's subscriptions
        const subscriptionsResponse = await fetch(`/api/subscriptions/${currentUser.id}`);
        const subscriptionsData = await subscriptionsResponse.json();
        
        if (subscriptionsData.subscriptions && subscriptionsData.subscriptions.length > 0) {
            // Display only the subscribed performers (not their videos)
            displaySubscribedPerformers(subscriptionsData.subscriptions);
        } else {
            showNoResults('No subscriptions', 'Subscribe to performers to see them here');
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        showToast('Failed to load subscriptions', 'error');
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

async function checkSubscriptionStatus(performerName) {
    try {
        const response = await fetch(`/api/subscriptions/${currentUser.id}`);
        const data = await response.json();
        
        const isSubscribed = data.subscriptions.some(sub => sub.name === performerName);
        const subscribeBtn = document.getElementById('subscribeBtn');
        
        if (isSubscribed) {
            subscribeBtn.classList.add('active');
            subscribeBtn.innerHTML = '<i class="fas fa-bell-slash"></i><span>Unsubscribe</span>';
        } else {
            subscribeBtn.classList.remove('active');
            subscribeBtn.innerHTML = '<i class="fas fa-bell"></i><span>Subscribe</span>';
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }
}