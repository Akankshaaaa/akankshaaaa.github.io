import { content } from './content.js';

export class SectionsManager {
    constructor(scene) {
        this.scene = scene;
        this.contentOverlay = document.getElementById('content-overlay');
        this.setupEventListeners();
        this.currentView = null;
        this.cameraAnimation = null;
        this.isViewingSection = false;
        this.hasUserMovedCamera = false;
        
        // Store initial camera position
        this.initialCameraPosition = {
            x: 15,
            y: 15,
            z: 15
        };
        
        // Store initial camera target
        this.initialTarget = {
            x: 0,
            y: 0,
            z: 0
        };

        // Configure orbit controls for free movement
        if (this.scene.controls) {
            this.scene.controls.enableZoom = true;
            this.scene.controls.enablePan = true;
            this.scene.controls.enableRotate = true;
            this.scene.controls.minDistance = 2;
            this.scene.controls.maxDistance = 50;
            this.scene.controls.target.set(0, 0, 0);
        }
    }

    setupEventListeners() {
        // Raycaster for object clicking
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Menu click handlers
        document.querySelectorAll('#minecraft-menu li').forEach(item => {
            item.addEventListener('click', () => {
                this.showSection(item.dataset.section);
                this.isViewingSection = true;
                this.hasUserMovedCamera = false;
            });
        });

        // Mouse move for hover effects
        window.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.scene.camera);
            const intersects = raycaster.intersectObjects(this.scene.blocks);

            // Reset cursor
            document.body.style.cursor = 'default';

            // Check for intersection with clickable objects
            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (this.isClickableObject(object)) {
                    document.body.style.cursor = 'pointer';
                }
            }
        });

        // Click handler for objects
        window.addEventListener('click', (event) => {
            raycaster.setFromCamera(mouse, this.scene.camera);
            const intersects = raycaster.intersectObjects(this.scene.blocks);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                const section = this.getObjectSection(object);
                if (section) {
                    this.showSection(section);
                    this.isViewingSection = true;
                    this.hasUserMovedCamera = false;
                }
            }
        });

        // Click handler for background
        document.addEventListener('click', (event) => {
            if (!this.contentOverlay.contains(event.target) && 
                !event.target.closest('#minecraft-menu')) {
                if (this.isViewingSection && !this.hasUserMovedCamera) {
                    this.resetView();
                }
                this.isViewingSection = false;
            }
        });

        // Add camera movement listener
        if (this.scene.controls) {
            this.scene.controls.addEventListener('change', () => {
                if (!this.isViewingSection) {
                    this.hasUserMovedCamera = true;
                }
            });
        }
    }

    isClickableObject(object) {
        const pos = object.position;
        const size = 20;
        
        // Check entire house structure (including all parts)
        const houseX = -size + 5;
        const houseZ = size - 9;
        if (Math.abs(pos.x - houseX) < 5 && // Increased detection area
            Math.abs(pos.z - houseZ) < 6 && // Increased detection area
            pos.y < 8) { // Include chimney height
            return true;
        }
        
        // Check apple tree area (including apples)
        const treeX = -5;
        const treeZ = -25;
        if (Math.abs(pos.x - treeX) < 6 && // Wide enough for all tree parts
            Math.abs(pos.z - treeZ) < 6 && // Wide enough for all tree parts
            pos.y < 12) { // Full tree height
            
            // Special check for apples (they use the red material)
            if (object.material && object.material.color && 
                object.material.color.getHex() === 0xFF0000) {
                return true;
            }
            return true; // Tree parts are also clickable
        }
        
        // Check mailbox area
        if (Math.abs(pos.x - (-size + 7)) < 2 && 
            Math.abs(pos.z - (size - 11)) < 2 && 
            pos.y < 3) {
            return true;
        }
        
        // Check garden area
        if (Math.abs(pos.x - (-size + 15)) < 5 && 
            Math.abs(pos.z - (size - 8)) < 5 && 
            pos.y < 3) {
            return true;
        }
        
        // Check rabbit area
        if (Math.abs(pos.x - (size - 5)) < 3 && 
            Math.abs(pos.z - (size - 5)) < 3 && 
            pos.y > 5) {
            return true;
        }
        
        return false;
    }

    getObjectSection(object) {
        const pos = object.position;
        const size = 20;
        
        // Check mailbox area
        if (Math.abs(pos.x - (-size + 7)) < 2 && 
            Math.abs(pos.z - (size - 11)) < 2 && 
            pos.y < 3) {
            return 'contact';
        }
        
        // Check house area
        if (Math.abs(pos.x - (-size + 5)) < 4 && 
            Math.abs(pos.z - (size - 9)) < 5 && 
            pos.y < 7) {
            return 'experience';
        }
        
        // Check garden area
        if (Math.abs(pos.x - (-size + 15)) < 5 && 
            Math.abs(pos.z - (size - 8)) < 5 && 
            pos.y < 3) {
            return 'projects';
        }
        
        // Check apple tree area
        if (Math.abs(pos.x - (-5)) < 5 && 
            Math.abs(pos.z - (-25)) < 5 && 
            pos.y < 12) {
            return 'education';
        }
        
        // Check rabbit area
        if (Math.abs(pos.x - (size - 5)) < 3 && 
            Math.abs(pos.z - (size - 5)) < 3 && 
            pos.y > 5) {
            return 'summary';
        }
        
        return null;
    }

    resetView() {
        // Clear any existing camera animation
        if (this.cameraAnimation) {
            this.cameraAnimation.kill();
            this.cameraAnimation = null;
        }

        // Hide content overlay
        this.contentOverlay.style.display = 'none';

        // Animate camera back to initial position
        gsap.to(this.scene.camera.position, {
            duration: 2,
            x: this.initialCameraPosition.x,
            y: this.initialCameraPosition.y,
            z: this.initialCameraPosition.z,
            ease: "power2.inOut",
            onUpdate: () => {
                this.scene.camera.lookAt(
                    this.initialTarget.x,
                    this.initialTarget.y,
                    this.initialTarget.z
                );
            }
        });

        // Reset orbit controls
        if (this.scene.controls) {
            gsap.to(this.scene.controls.target, {
                duration: 2,
                x: this.initialTarget.x,
                y: this.initialTarget.y,
                z: this.initialTarget.z,
                ease: "power2.inOut"
            });

            // Reset control limits
            this.scene.controls.minDistance = 5;
            this.scene.controls.maxDistance = 30;
            this.scene.controls.enabled = true;
        }
    }

    showSection(sectionName) {
        const size = 20;
        
        // Define target positions for each object with direct coordinates
        const viewPositions = {
            summary: {
                position: { x: size - 8, y: 12, z: size - 8 },
                target: { x: size - 5, y: 6, z: size - 5 }, // Rabbit
                duration: 2
            },
            education: {
                position: { x: -12, y: 8, z: -8 },
                target: { x: -12, y: 4, z: -15 }, // Cherry blossom tree
                duration: 2
            },
            skills: {
                position: { x: -3, y: 8, z: 8 },
                target: { x: -3, y: 4, z: 5 }, // Treasure chest
                duration: 2
            },
            experience: {
                position: { x: -size + 12, y: 10, z: size - 6 },
                target: { x: -size + 5, y: 3, z: size - 9 }, // House
                duration: 2
            },
            projects: {
                position: { x: -size + 18, y: 8, z: size - 6 },
                target: { x: -size + 15, y: 2, z: size - 8 }, // Garden
                duration: 2
            },
            contact: {
                position: { x: -size + 8, y: 5, z: size - 14 },
                target: { x: -size + 7, y: 1, z: size - 11 }, // Mailbox
                duration: 1.5
            }
        };

        const viewData = viewPositions[sectionName];
        if (!viewData) return;

        // Hide previous content
        this.contentOverlay.style.display = 'none';

        // Clear any existing camera animation
        if (this.cameraAnimation) {
            this.cameraAnimation.kill();
        }

        // Move camera to initial position
        gsap.to(this.scene.camera.position, {
            duration: viewData.duration,
            x: viewData.position.x,
            y: viewData.position.y,
            z: viewData.position.z,
            ease: "power2.inOut",
            onUpdate: () => {
                this.scene.camera.lookAt(
                    viewData.target.x,
                    viewData.target.y,
                    viewData.target.z
                );
            },
            onComplete: () => {
                // Start circular camera motion after reaching position
                this.startCircularMotion(viewData);
                
                // Show content overlay after camera movement
                this.contentOverlay.innerHTML = content[sectionName].content;
                this.contentOverlay.style.display = 'block';
            }
        });

        // Update orbit controls target
        if (this.scene.controls) {
            // Enable controls during animation
            this.scene.controls.enabled = true;
            
            // Update controls target
            gsap.to(this.scene.controls.target, {
                duration: viewData.duration,
                x: viewData.target.x,
                y: viewData.target.y,
                z: viewData.target.z,
                ease: "power2.inOut"
            });

            // Set min and max distance for zooming
            this.scene.controls.minDistance = 5;
            this.scene.controls.maxDistance = 15;
        }

        this.currentView = viewData;
    }

    startCircularMotion(viewData) {
        if (this.cameraAnimation) {
            this.cameraAnimation.kill();
        }

        const rotationSpeed = 15;
        const radius = 8;
        let startTime = Date.now();

        this.cameraAnimation = gsap.to({}, {
            duration: rotationSpeed,
            repeat: -1,
            ease: "none",
            onUpdate: () => {
                const elapsedTime = (Date.now() - startTime) / 1000;
                const progress = (elapsedTime % rotationSpeed) / rotationSpeed;
                const angle = (progress * Math.PI * 2) + (Math.PI * 1.75);
                
                this.scene.camera.position.x = viewData.target.x + Math.cos(angle) * radius;
                this.scene.camera.position.z = viewData.target.z + Math.sin(angle) * radius;
                this.scene.camera.position.y = viewData.target.y + 5 + Math.sin(angle * 2) * 0.3;
                
                this.scene.camera.lookAt(
                    viewData.target.x,
                    viewData.target.y,
                    viewData.target.z
                );
            }
        });
    }
}

window.SectionsManager = SectionsManager;