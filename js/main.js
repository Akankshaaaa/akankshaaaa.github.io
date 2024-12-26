import { Scene } from './scene.js';
import { SectionsManager } from './sections.js';

class MinecraftPortfolio {
    constructor() {
        this.scene = new Scene();
        this.init();
    }

    init() {
        // Create ground
        this.createGround();
        
        // Initialize sections
        this.sections = new SectionsManager(this.scene);
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 2000);

        // Start animation loop
        this.animate();
    }

    createGround() {
        const size = 20;
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                const y = -1;
                this.scene.createDirtBlock(x, y, z);
            }
        }
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
    }
}

// Initialize the application when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new MinecraftPortfolio();
}); 