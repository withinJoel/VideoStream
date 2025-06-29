// Component Loader - Handles loading HTML components dynamically
class ComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.componentCache = new Map();
    }

    async loadComponent(componentName, containerId) {
        try {
            // Check if component is already loaded
            if (this.loadedComponents.has(componentName)) {
                return true;
            }

            // Check cache first
            let html;
            if (this.componentCache.has(componentName)) {
                html = this.componentCache.get(componentName);
            } else {
                // Fetch component HTML
                const response = await fetch(`/components/${componentName}.html`);
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${componentName}`);
                }
                html = await response.text();
                this.componentCache.set(componentName, html);
            }

            // Insert into container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
                this.loadedComponents.add(componentName);
                
                // Dispatch event for component loaded
                window.dispatchEvent(new CustomEvent('componentLoaded', {
                    detail: { componentName, containerId }
                }));
                
                return true;
            } else {
                console.error(`Container not found: ${containerId}`);
                return false;
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return false;
        }
    }

    async loadMultipleComponents(components) {
        const promises = components.map(({ name, container }) => 
            this.loadComponent(name, container)
        );
        
        try {
            const results = await Promise.all(promises);
            return results.every(result => result === true);
        } catch (error) {
            console.error('Error loading multiple components:', error);
            return false;
        }
    }

    isComponentLoaded(componentName) {
        return this.loadedComponents.has(componentName);
    }

    clearCache() {
        this.componentCache.clear();
    }

    unloadComponent(componentName, containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
            this.loadedComponents.delete(componentName);
            
            // Dispatch event for component unloaded
            window.dispatchEvent(new CustomEvent('componentUnloaded', {
                detail: { componentName, containerId }
            }));
        }
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

// Auto-load essential components when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    const essentialComponents = [
        { name: 'header', container: 'header-container' },
        { name: 'mobile-nav', container: 'mobile-nav-container' },
        { name: 'filter-bar', container: 'filter-bar-container' },
        { name: 'video-modal', container: 'video-modal-container' },
        { name: 'auth-modals', container: 'auth-modals-container' },
        { name: 'playlist-modal', container: 'playlist-modal-container' },
        { name: 'profile-modal', container: 'profile-modal-container' },
        { name: 'share-modal', container: 'share-modal-container' },
        { name: 'advanced-search-modal', container: 'advanced-search-modal-container' },
        { name: 'bolt-image', container: 'bolt-image-container' }
    ];

    console.log('Loading essential components...');
    const success = await window.componentLoader.loadMultipleComponents(essentialComponents);
    
    if (success) {
        console.log('All essential components loaded successfully');
        // Dispatch event that all components are ready
        window.dispatchEvent(new CustomEvent('allComponentsLoaded'));
    } else {
        console.error('Some components failed to load');
    }
});

// Lazy loading for non-essential components
window.loadComponentOnDemand = async function(componentName, containerId) {
    if (!window.componentLoader.isComponentLoaded(componentName)) {
        console.log(`Loading component on demand: ${componentName}`);
        return await window.componentLoader.loadComponent(componentName, containerId);
    }
    return true;
};

// Export for use in other scripts
window.ComponentLoader = ComponentLoader;