import { Animations } from './animations.js';

export class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.blocks = [];
        this.water = null;
        this.rabbit = null;
        this.appleTree = null;
        this.house = null;
        this.garden = null;
        this.mailbox = null;
        
        // Minecraft sky color
        this.scene.fog = new THREE.Fog(0x91BDFF, 20, 50);
        this.scene.background = new THREE.Color(0x91BDFF);
        
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('scene-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);

        // Setup controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI * 0.6;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);

        // Create terrain and water
        this.createTerrain();
        this.createWater();

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    createTerrain() {
        const size = 20;
        const waterLevel = 0;
        
        // Define common variables at the start
        const houseX = -size + 5;
        const houseZ = size - 9;
        const riverStartX = -size;
        const riverStartZ = -size + 15;
        const riverEndX = size;
        const riverEndZ = -15;
        const pathEndX = houseX + 3;
        const pathEndZ = -15;

        // First pass: Create terrain, river, and path
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                let y = 0;

                // Hill generation parameters (corner 4)
                const hillCenterX = size - 5;
                const hillCenterZ = size - 5;
                const distanceFromHillCenter = Math.sqrt(
                    Math.pow(x - hillCenterX, 2) + 
                    Math.pow(z - hillCenterZ, 2)
                );
                
                // Calculate river curve using parametric equation
                const t = (x - riverStartX) / (riverEndX - riverStartX);
                const expectedZ = riverStartZ + (riverEndZ - riverStartZ) * t + 
                                Math.sin(t * Math.PI * 0.6) * 4;
                
                const distanceFromRiver = Math.abs(z - expectedZ);
                const riverWidth = 3.5 + Math.sin(t * Math.PI * 0.8) * 1;
                
                // Create path from house to river
                const pathWidth = 2;
                const isOnPath = (x, z) => {
                    // Calculate river position at current x
                    const t = (x - riverStartX) / (riverEndX - riverStartX);
                    const riverZ = riverStartZ + (riverEndZ - riverStartZ) * t + 
                                Math.sin(t * Math.PI * 0.6) * 4;
                    
                    // Calculate bridge position
                    const bridgeT = (pathEndX - riverStartX) / (riverEndX - riverStartX);
                    const bridgeZ = riverStartZ + (riverEndZ - riverStartZ) * bridgeT + 
                                    Math.sin(bridgeT * Math.PI * 0.6) * 4;
                    
                    // Create straight path that stops at bridge
                    return Math.abs(x - (houseX + 3)) <= 1 && // 2 blocks wide
                           z <= houseZ && // Start from house
                           z >= bridgeZ + 1; // Stop at bridge (added 1 block buffer)
                };

                // Create hill with flat top and better clipped region
                if (distanceFromHillCenter < 15) {
                    // Expanded mailbox safe area
                    const mailboxArea = x > -size + 3 && x < -size + 15 && z > size - 15;
                    
                    if (!mailboxArea) {  // Only create hill if not in mailbox area
                        if (distanceFromHillCenter < 6) {
                            // Flat top area
                            y = 6;
                        } else {
                            // Sloping sides
                            const slopeDistance = distanceFromHillCenter - 6;
                            const maxSlope = 6;
                            y = Math.max(0, Math.floor(maxSlope * (1 - slopeDistance / 9)));
                            
                            // Add gentle variations to the slope
                            const variation = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5;
                            y += variation;
                            
                            // Ensure y is never negative
                            y = Math.max(0, Math.floor(y));
                        }
                    }
                }

                // Create river with varying depth
                if (x >= riverStartX && x <= riverEndX && distanceFromRiver < riverWidth) {
                    // Create varying depth based on distance from center and position
                    const depthVariation = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.5;
                    const edgeFactor = 1 - (distanceFromRiver / riverWidth);
                    y = -1 - depthVariation - edgeFactor;
                    
                    // Ensure minimum depth
                    y = Math.min(-1, y);
                }

                // Create blocks
                if (y >= waterLevel) {
                    if (isOnPath(x, z)) {
                        // Create path
                        const pathMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
                        const pathBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pathMaterial);
                        pathBlock.position.set(x, y, z);
                        pathBlock.castShadow = true;
                        pathBlock.receiveShadow = true;
                        this.scene.add(pathBlock);
                        this.blocks.push(pathBlock);
                    } else {
                        this.createGrassBlock(x, y, z);
                    }
                    for (let dy = y - 1; dy >= -3; dy--) {
                        this.createDirtBlock(x, dy, z);
                    }
                } else {
                    // Create riverbed with mix of sand and dirt
                    for (let dy = waterLevel - 1; dy >= y - 1; dy--) {
                        if (Math.random() < 0.8) {
                            this.createSandBlock(x, dy, z);
                        } else {
                            this.createDirtBlock(x, dy, z);
                        }
                    }
                }
            }
        }

        // Calculate bridge position
        const bridgeT = (pathEndX - riverStartX) / (riverEndX - riverStartX);
        const bridgeZ = riverStartZ + (riverEndZ - riverStartZ) * bridgeT + 
                        Math.sin(bridgeT * Math.PI * 0.6) * 4;

        // Create bridge across the river (perpendicular to river flow)
        const bridgeX = pathEndX - 1;
        const bridgeWidth = 8; // Increased width to span the river
        this.createBridge(bridgeX, 0, bridgeZ - bridgeWidth/2, bridgeWidth, true); // Added rotation parameter

        // Place first tree near the start of terrain, away from river
        const tree2X = houseX - 4; // Tree left of house
        const tree2Z = houseZ + 2;

        // Check if tree position is safe from river
        const t2 = (tree2X - riverStartX) / (riverEndX - riverStartX);
        const expectedZ2 = riverStartZ + (riverEndZ - riverStartZ) * t2 + 
                        Math.sin(t2 * Math.PI * 0.6) * 4;
        const distanceFromRiver2 = Math.abs(tree2Z - expectedZ2);

        // Only place tree if it's far enough from river
        if (distanceFromRiver2 > 6) {
            this.createTree(tree2X, 0, tree2Z);
        }

        // Add the house
        this.createHouse(houseX, 0, houseZ);

        // Second pass: Add bushes and grass around river
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                // Calculate river curve
                const t = (x - riverStartX) / (riverEndX - riverStartX);
                const expectedZ = riverStartZ + (riverEndZ - riverStartZ) * t + 
                                Math.sin(t * Math.PI * 0.6) * 4;
                
                const distanceFromRiver = Math.abs(z - expectedZ);
                const riverWidth = 3.5 + Math.sin(t * Math.PI * 0.8) * 1;

                // Check if point is near the path
                const pathEndX = houseX + 3;
                const pathEndZ = -15;
                const isNearPath = this.isOnPath(x, z, houseX + 3, houseZ, pathEndX, pathEndZ, 2.0);

                // Create bushes along river with safe distance check
                if (x >= riverStartX && x <= riverEndX && 
                    distanceFromRiver > riverWidth + 1 && 
                    distanceFromRiver < riverWidth + 3 && 
                    !isNearPath) {
                    
                    // Calculate distance from path
                    const distanceFromPath = Math.abs(
                        this.getDistanceFromPath(x, z, houseX + 3, houseZ, pathEndX, pathEndZ)
                    );
                    
                    // Only place bushes if they're not too close to the path and bridge
                    const distanceFromBridge = Math.abs(x - bridgeX);
                    if (distanceFromPath > 4 && distanceFromBridge > 3) {
                        const noise = Math.sin(x * 0.8) * Math.cos(z * 0.8) * 0.5;
                        const bushChance = 0.25 * (1 + noise);
                        
                        if (Math.random() < bushChance) {
                            const heightVariation = Math.random() * 0.5;
                            this.createBush(x, 1 + heightVariation, z, true);
                            
                            // Create companion bushes with safety checks
                            if (Math.random() < 0.4) {
                                for (let i = 0; i < 2; i++) {
                                    const offsetX = (Math.random() - 0.5) * 0.6;
                                    const offsetZ = (Math.random() - 0.5) * 0.6;
                                    
                                    const newX = x + offsetX;
                                    const newZ = z + offsetZ;
                                    const newT = (newX - riverStartX) / (riverEndX - riverStartX);
                                    const expectedRiverZ = riverStartZ + (riverEndZ - riverStartZ) * newT + 
                                                        Math.sin(newT * Math.PI * 0.6) * 4;
                                    const bushDistanceFromRiver = Math.abs(newZ - expectedRiverZ);
                                    
                                    if (bushDistanceFromRiver > riverWidth + 1) {
                                        this.createBush(newX, 1, newZ, false);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add apple tree at the other end of bridge
        const appleTreeX = bridgeX;
        const appleTreeZ = bridgeZ - bridgeWidth/2 - 4; // Moved one more block away
        // this.createAppleTree(appleTreeX, 0, appleTreeZ);
        this.createCherryBlossomTree(appleTreeX, 0, appleTreeZ); // Use the same coordinates or adjust as needed


        // Place cat on top of the hill
        const catX = size - 5; // Hill center X
        const catZ = size - 5; // Hill center Z
        const catY = 6; // Height of hill's flat top
        this.createCat(catX, catY, catZ);

        // Add fish to the river
        const fishColors = [
            0xFF6B6B, // Coral
            0x4ECDC4, // Turquoise
            0xFFBE0B, // Gold
            0xFF9F1C  // Orange
        ];
        const numberOfFish = 12;

        for (let i = 0; i < numberOfFish; i++) {
            const fishColor = fishColors[Math.floor(Math.random() * fishColors.length)];
            const fishX = Math.random() * (riverEndX - riverStartX) + riverStartX;
            const t = (fishX - riverStartX) / (riverEndX - riverStartX);
            const fishZ = riverStartZ + (riverEndZ - riverStartZ) * t + 
                        Math.sin(t * Math.PI * 0.6) * 4 + (Math.random() * 2 - 1);
            const fishY = 0;
            
            this.createFish(fishX, fishY, fishZ, fishColor);
        }

        // Add some clouds at different positions
        const cloudPositions = [
            { x: -15, y: 15, z: -15 },
            { x: 5, y: 18, z: 0 },
            { x: 15, y: 16, z: 15 },
            { x: -10, y: 17, z: 10 },
            { x: 0, y: 19, z: -10 }
        ];

        cloudPositions.forEach(pos => {
            this.createCloud(pos.x, pos.y, pos.z);
        });

        // Remove the apple tree creation and add cherry blossom tree at the end of the bridge
        // this.createCherryBlossomTree(-12, 0, -15); // Use the same coordinates or adjust as needed
        
        // Add treasure chest near cherry blossom tree
        this.createTreasureChest(-3, 0, 5); // Adjust position as needed
    }

    createWater() {
        const waterGeometry = new THREE.PlaneGeometry(100, 100);
        const waterMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.6,
            roughness: 0,
            metalness: 0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
        });

        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = 0.01; // Slightly above ground level to prevent z-fighting
        this.water.receiveShadow = true;
        this.scene.add(this.water);
    }

    createGrassBlock(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Minecraft-accurate colors
        const materials = [
            new THREE.MeshLambertMaterial({ color: 0x7FB238 }), // right - grass side
            new THREE.MeshLambertMaterial({ color: 0x7FB238 }), // left - grass side
            new THREE.MeshLambertMaterial({ color: 0x91BD59 }), // top - grass top
            new THREE.MeshLambertMaterial({ color: 0x8B7355 }), // bottom - dirt
            new THREE.MeshLambertMaterial({ color: 0x7FB238 }), // front - grass side
            new THREE.MeshLambertMaterial({ color: 0x7FB238 })  // back - grass side
        ];

        const block = new THREE.Mesh(geometry, materials);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        
        this.scene.add(block);
        this.blocks.push(block);
        return block;
    }

    createDirtBlock(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x8B7355 // Minecraft dirt color
        });

        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        
        this.scene.add(block);
        this.blocks.push(block);
        return block;
    }

    createSandBlock(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xDCD0A6 // Minecraft sand color
        });

        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        
        this.scene.add(block);
        this.blocks.push(block);
        return block;
    }

    createBush(x, y, z, enhanced = false) {
        const leafGeometry = new THREE.BoxGeometry(1, 1, 1);
        const leafMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3BA13B,
            transparent: true,
            opacity: 0.9
        });

        if (enhanced) {
            // Create a larger, more detailed bush
            const positions = [
                // Core
                {x: 0, y: 0, z: 0},
                {x: 0, y: 1, z: 0},
                // Middle layer
                {x: 0.5, y: 0.5, z: 0},
                {x: -0.5, y: 0.5, z: 0},
                {x: 0, y: 0.5, z: 0.5},
                {x: 0, y: 0.5, z: -0.5},
                // Base layer
                {x: 0.7, y: 0, z: 0},
                {x: -0.7, y: 0, z: 0},
                {x: 0, y: 0, z: 0.7},
                {x: 0, y: 0, z: -0.7},
            ];

            positions.forEach(offset => {
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.set(
                    x + offset.x, 
                    y + offset.y, 
                    z + offset.z
                );
                leaf.scale.set(0.9, 0.9, 0.9);
                leaf.castShadow = true;
                leaf.receiveShadow = true;
                this.scene.add(leaf);
                this.blocks.push(leaf);
            });
        } else {
            // Create a smaller, simpler bush
            const positions = [
                {x: 0, y: 0, z: 0},
                {x: 0, y: 0.5, z: 0},
            ];

            if (Math.random() < 0.7) positions.push({x: 0.4, y: 0, z: 0});
            if (Math.random() < 0.7) positions.push({x: -0.4, y: 0, z: 0});
            if (Math.random() < 0.7) positions.push({x: 0, y: 0, z: 0.4});
            if (Math.random() < 0.7) positions.push({x: 0, y: 0, z: -0.4});

            positions.forEach(offset => {
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.set(
                    x + offset.x, 
                    y + offset.y, 
                    z + offset.z
                );
                leaf.scale.set(0.7, 0.7, 0.7);
                leaf.castShadow = true;
                leaf.receiveShadow = true;
                this.scene.add(leaf);
                this.blocks.push(leaf);
            });
        }
    }

    createTree(x, y, z) {
        // Create trunk
        const trunkGeometry = new THREE.BoxGeometry(1, 4, 1);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown color
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, y + 2, z); // Center the trunk
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        this.blocks.push(trunk);

        // Create leaves
        const leafPositions = [
            // Bottom layer
            {x: 0, y: 4, z: 0},
            {x: 1, y: 4, z: 0},
            {x: -1, y: 4, z: 0},
            {x: 0, y: 4, z: 1},
            {x: 0, y: 4, z: -1},
            // Middle layer
            {x: 0, y: 5, z: 0},
            {x: 1, y: 5, z: 0},
            {x: -1, y: 5, z: 0},
            {x: 0, y: 5, z: 1},
            {x: 0, y: 5, z: -1},
            // Top layer
            {x: 0, y: 6, z: 0},
        ];

        leafPositions.forEach(pos => {
            const leafGeometry = new THREE.BoxGeometry(1, 1, 1);
            const leafMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x2d5a27,
                transparent: true,
                opacity: 0.9
            });
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(x + pos.x, y + pos.y, z + pos.z);
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            this.scene.add(leaf);
            this.blocks.push(leaf);
        });
    }

    createFence(x, y, z, width, length) {
        const fenceGeometry = new THREE.BoxGeometry(1, 1, 1);
        const fenceMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown wood

        // Create fence posts
        for (let w = 0; w <= width; w++) {
            for (let l = 0; l <= length; l++) {
                // Only create posts at corners and every 2 blocks
                if ((w === 0 || w === width || l === 0 || l === length) && 
                    (w % 2 === 0 || l % 2 === 0)) {
                    const post = new THREE.Mesh(fenceGeometry, fenceMaterial);
                    post.scale.set(0.2, 1, 0.2);
                    post.position.set(x + w, y + 0.5, z + l);
                    post.castShadow = true;
                    post.receiveShadow = true;
                    this.scene.add(post);
                    this.blocks.push(post);
                }
            }
        }

        // Create horizontal fence beams
        for (let w = 0; w <= width; w++) {
            for (let l = 0; l <= length; l++) {
                if (w < width && (l === 0 || l === length)) {
                    // Horizontal beams along length
                    const beam = new THREE.Mesh(fenceGeometry, fenceMaterial);
                    beam.scale.set(1, 0.1, 0.1);
                    beam.position.set(x + w + 0.5, y + 0.7, z + l);
                    this.scene.add(beam);
                    this.blocks.push(beam);
                }
                if (l < length && (w === 0 || w === width)) {
                    // Horizontal beams along width
                    const beam = new THREE.Mesh(fenceGeometry, fenceMaterial);
                    beam.scale.set(0.1, 0.1, 1);
                    beam.position.set(x + w, y + 0.7, z + l + 0.5);
                    this.scene.add(beam);
                    this.blocks.push(beam);
                }
            }
        }
    }

    createFlower(x, y, z, color) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x2E8B57 }); // Green stem
        const flowerMaterial = new THREE.MeshLambertMaterial({ color: color });
        const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 }); // Yellow center

        // Create stem
        const stem = new THREE.Mesh(geometry, stemMaterial);
        stem.scale.set(0.1, 0.8, 0.1);
        stem.position.set(x, y + 0.4, z);
        this.scene.add(stem);
        this.blocks.push(stem);

        // Create flower center
        const center = new THREE.Mesh(geometry, centerMaterial);
        center.scale.set(0.2, 0.2, 0.2);
        center.position.set(x, y + 0.9, z);
        this.scene.add(center);
        this.blocks.push(center);

        // Create petals in different patterns based on color
        if (color === 0xFF69B4) { // Pink flower - daisy pattern
            const petalPositions = [
                {x: 0.2, y: 0, z: 0}, {x: -0.2, y: 0, z: 0},
                {x: 0, y: 0, z: 0.2}, {x: 0, y: 0, z: -0.2},
                {x: 0.15, y: 0, z: 0.15}, {x: -0.15, y: 0, z: 0.15},
                {x: 0.15, y: 0, z: -0.15}, {x: -0.15, y: 0, z: -0.15}
            ];
            
            petalPositions.forEach(pos => {
                const petal = new THREE.Mesh(geometry, flowerMaterial);
                petal.scale.set(0.2, 0.1, 0.2);
                petal.position.set(x + pos.x, y + 0.9, z + pos.z);
                this.scene.add(petal);
                this.blocks.push(petal);
            });
        } 
        else if (color === 0xFFFF00) { // Yellow flower - sunflower pattern
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                const petal = new THREE.Mesh(geometry, flowerMaterial);
                petal.scale.set(0.25, 0.1, 0.15);
                petal.position.set(
                    x + Math.cos(angle) * 0.25,
                    y + 0.9,
                    z + Math.sin(angle) * 0.25
                );
                petal.rotation.y = angle;
                this.scene.add(petal);
                this.blocks.push(petal);
            }
        }
        else if (color === 0xFF0000) { // Red flower - rose pattern
            const petalLayers = [
                {radius: 0.15, count: 4, height: 0.9},
                {radius: 0.25, count: 6, height: 0.85},
                {radius: 0.3, count: 6, height: 0.8}
            ];
            
            petalLayers.forEach(layer => {
                for (let i = 0; i < layer.count; i++) {
                    const angle = (i / layer.count) * Math.PI * 2;
                    const petal = new THREE.Mesh(geometry, flowerMaterial);
                    petal.scale.set(0.2, 0.15, 0.2);
                    petal.position.set(
                        x + Math.cos(angle) * layer.radius,
                        y + layer.height,
                        z + Math.sin(angle) * layer.radius
                    );
                    this.scene.add(petal);
                    this.blocks.push(petal);
                }
            });
        }
        else if (color === 0xFFA500) { // Orange flower - tulip pattern
            const petalPositions = [
                {x: 0, y: 0.2, z: 0},    // Top petal
                {x: 0.15, y: 0, z: 0},    // Right petal
                {x: -0.15, y: 0, z: 0},   // Left petal
                {x: 0, y: 0, z: 0.15},    // Front petal
                {x: 0, y: 0, z: -0.15}    // Back petal
            ];
            
            petalPositions.forEach(pos => {
                const petal = new THREE.Mesh(geometry, flowerMaterial);
                petal.scale.set(0.2, 0.3, 0.2);
                petal.position.set(x + pos.x, y + 0.8 + pos.y, z + pos.z);
                this.scene.add(petal);
                this.blocks.push(petal);
            });
        }

        // Add leaves to stem
        const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x3BA13B });
        const leafPositions = [
            {x: 0.15, y: 0.3, z: 0, rotation: Math.PI / 4},
            {x: -0.15, y: 0.4, z: 0, rotation: -Math.PI / 4}
        ];

        leafPositions.forEach(pos => {
            const leaf = new THREE.Mesh(geometry, leafMaterial);
            leaf.scale.set(0.2, 0.05, 0.1);
            leaf.position.set(x + pos.x, y + pos.y, z + pos.z);
            leaf.rotation.y = pos.rotation;
            this.scene.add(leaf);
            this.blocks.push(leaf);
        });
    }

    createGarden(x, y, z, width, length) {
        // Create garden soil
        for (let w = 0; w <= width; w++) {
            for (let l = 0; l <= length; l++) {
                const soil = this.createDirtBlock(x + w, y, z + l);
            }
        }

        // Add flowers in a pattern
        const flowerColors = [0xFF69B4, 0xFFFF00, 0xFF0000, 0xFFA500]; // Pink, yellow, red, orange
        
        for (let w = 1; w < width; w += 2) {
            for (let l = 1; l < length; l += 2) {
                const randomColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                this.createFlower(x + w, y, z + l, randomColor);
            }
        }
    }

    createHouse(x, y, z) {
        // Base dimensions
        const width = 6;
        const length = 7;
        const height = 4;  // Increased height for two stories

        // Materials
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xE8E8E8 }); // Light gray walls
        const accentMaterial = new THREE.MeshLambertMaterial({ color: 0x4A4A4A }); // Dark gray accent
        const windowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.6
        });
        const wallGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Create main structure
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                for (let l = 0; l < length; l++) {
                    // Skip interior space
                    if (w > 0 && w < width-1 && l > 0 && l < length-1 && h > 0) continue;
                    
                    // Create door opening
                    if (h < 2 && w === 2 && l === 0) continue;
                    if (h < 2 && w === 3 && l === 0) continue;

                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(x + w, y + h, z + l);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.scene.add(wall);
                    this.blocks.push(wall);
                }
            }
        }

        // Add windows
        const windowPositions = [
            // Front windows (first floor)
            {x: 1, y: 1, z: 0},
            {x: 4, y: 1, z: 0},
            // Front windows (second floor)
            {x: 1, y: 3, z: 0},
            {x: 4, y: 3, z: 0},
            // Side windows
            {x: 0, y: 2, z: 2},
            {x: 0, y: 2, z: 4},
            {x: width-1, y: 2, z: 2},
            {x: width-1, y: 2, z: 4},
        ];

        windowPositions.forEach(pos => {
            const window = new THREE.Mesh(wallGeometry, windowMaterial);
            window.position.set(x + pos.x, y + pos.y, z + pos.z);
            this.scene.add(window);
            this.blocks.push(window);
        });

        // Add flat roof with overhang
        for (let w = -1; w <= width; w++) {
            for (let l = -1; l <= length; l++) {
                const roof = new THREE.Mesh(wallGeometry, accentMaterial);
                roof.position.set(x + w, y + height, z + l);
                this.scene.add(roof);
                this.blocks.push(roof);
            }
        }

        // Add modern accent details
        for (let h = 0; h < height; h++) {
            // Vertical accent on front
            const accent1 = new THREE.Mesh(wallGeometry, accentMaterial);
            accent1.position.set(x + width/2, y + h, z - 0.2);
            this.scene.add(accent1);
            this.blocks.push(accent1);
        }

        // Add small garden features
        const bushPositions = [
            {x: -1, y: 0, z: -1},
            {x: width, y: 0, z: -1},
            {x: -1, y: 0, z: length},
            {x: width, y: 0, z: length}
        ];

        bushPositions.forEach(pos => {
            this.createBush(x + pos.x, y, z + pos.z);
        });

        // Add fenced garden to the right of the house
        const gardenWidth = 5;
        const gardenLength = 6;
        const gardenX = x + width + 4;
        const gardenZ = z + 1;

        // Create the garden first
        this.createGarden(gardenX, y, gardenZ, gardenWidth, gardenLength);
        
        // Create fence around garden
        this.createFence(gardenX - 1, y, gardenZ - 1, gardenWidth + 2, gardenLength + 2);

        // Move mailbox to front of house
        this.createMailbox(x + width/2 + 2, y, z - 2); // 2 blocks in front of the house

        // Add detailed chimney
        const chimneyHeight = 3; // Made taller
        const chimneyX = x + width - 2; // Position near back of house
        const chimneyZ = z + 2; // A bit away from edge
        
        // Create main chimney structure
        for (let h = 0; h < chimneyHeight; h++) {
            // Create 2x2 chimney structure
            for (let cx = 0; cx <= 1; cx++) {
                for (let cz = 0; cz <= 1; cz++) {
                    const chimney = new THREE.Mesh(wallGeometry, accentMaterial);
                    chimney.position.set(
                        chimneyX + cx * 0.8, 
                        y + height + h, 
                        chimneyZ + cz * 0.8
                    );
                    chimney.scale.set(0.8, 1, 0.8); // Slightly smaller blocks for detail
                    chimney.castShadow = true;
                    chimney.receiveShadow = true;
                    this.scene.add(chimney);
                    this.blocks.push(chimney);
                }
            }
        }

        // Add decorative top rim
        for (let cx = -0.2; cx <= 1.2; cx += 1.4) {
            for (let cz = -0.2; cz <= 1.2; cz += 1.4) {
                const topBlock = new THREE.Mesh(wallGeometry, accentMaterial);
                topBlock.position.set(
                    chimneyX + cx, 
                    y + height + chimneyHeight, 
                    chimneyZ + cz
                );
                topBlock.scale.set(0.4, 0.4, 0.4);
                this.scene.add(topBlock);
                this.blocks.push(topBlock);
            }
        }

        // Add chimney top slab
        const chimneyTop = new THREE.Mesh(wallGeometry, accentMaterial);
        chimneyTop.scale.set(2, 0.2, 2);
        chimneyTop.position.set(
            chimneyX + 0.4, 
            y + height + chimneyHeight + 0.3, 
            chimneyZ + 0.4
        );
        this.scene.add(chimneyTop);
        this.blocks.push(chimneyTop);

        // Add smoke effect blocks (semi-transparent gray)
        const smokeMaterial = new THREE.MeshLambertMaterial({
            color: 0x808080,
            transparent: true,
            opacity: 0.3
        });

        for (let h = 0; h < 2; h++) {
            const smoke = new THREE.Mesh(wallGeometry, smokeMaterial);
            smoke.scale.set(0.6, 0.6, 0.6);
            smoke.position.set(
                chimneyX + 0.4,
                y + height + chimneyHeight + 0.8 + h * 0.5,
                chimneyZ + 0.4
            );
            this.scene.add(smoke);
            this.blocks.push(smoke);
        }
    }

    createMailbox(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Create taller, thinner post
        const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown wood
        const post = new THREE.Mesh(geometry, postMaterial);
        post.scale.set(0.3, 1.5, 0.3);
        post.position.set(x, y + 0.75, z);
        post.castShadow = true;
        post.receiveShadow = true;
        this.scene.add(post);
        this.blocks.push(post);

        // Create mailbox body - longer and narrower
        const mailboxMaterial = new THREE.MeshLambertMaterial({ color: 0x2F4F4F }); // Dark slate gray
        const mailbox = new THREE.Mesh(geometry, mailboxMaterial);
        mailbox.scale.set(0.8, 0.6, 1.2); // Make it longer in Z direction
        mailbox.position.set(x, y + 1.5, z);
        mailbox.castShadow = true;
        mailbox.receiveShadow = true;
        this.scene.add(mailbox);
        this.blocks.push(mailbox);

        // Create mailbox roof - slightly larger than body
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x1C1C1C }); // Darker gray
        const roof = new THREE.Mesh(geometry, roofMaterial);
        roof.scale.set(0.9, 0.1, 1.3); // Slightly wider and longer than body
        roof.position.set(x, y + 1.85, z);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.scene.add(roof);
        this.blocks.push(roof);

        // Create red flag - thinner and more flag-like
        const flagMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 }); // Bright red
        const flag = new THREE.Mesh(geometry, flagMaterial);
        flag.scale.set(0.1, 0.4, 0.3); // Thin flag
        flag.position.set(x + 0.45, y + 1.6, z - 0.3); // Positioned on the side
        flag.castShadow = true;
        flag.receiveShadow = true;
        this.scene.add(flag);
        this.blocks.push(flag);
        this.mailbox = mailbox;
        return mailbox;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Animate water
        if (this.water) {
            this.water.material.opacity = 0.6 + Math.sin(Date.now() * 0.001) * 0.1;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Add this new helper method for path creation
    isOnPath(x, z, startX, startZ, endX, endZ, width) {
        // Calculate the distance from point (x,z) to the line segment from start to end
        const A = x - startX;
        const B = z - startZ;
        const C = endX - startX;
        const D = endZ - startZ;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) {
            param = dot / len_sq;
        }

        let xx, zz;

        if (param < 0) {
            xx = startX;
            zz = startZ;
        } else if (param > 1) {
            xx = endX;
            zz = endZ;
        } else {
            xx = startX + param * C;
            zz = startZ + param * D;
        }

        const dx = x - xx;
        const dz = z - zz;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Add some noise to the path edges for a more natural look
        const noise = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.3;
        return distance < width + noise;
    }

    // Modified createGrass method
    createGrass(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const grassMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x5CAB2F,
            transparent: true,
            opacity: 0.9
        });

        // Create a tall grass blade
        const grass = new THREE.Mesh(geometry, grassMaterial);
        const heightVariation = 0.3 + Math.random() * 0.4; // Height between 0.3 and 0.7
        grass.scale.set(0.1, heightVariation, 0.1);
        
        // Add slight random rotation for natural look
        grass.rotation.y = Math.random() * Math.PI;
        grass.rotation.x = (Math.random() - 0.5) * 0.2;
        
        // Position grass with proper height offset
        grass.position.set(x, y + heightVariation/2, z);
        grass.castShadow = true;
        grass.receiveShadow = true;
        this.scene.add(grass);
        this.blocks.push(grass);
    }

    // Add helper method for path distance calculation
    getDistanceFromPath(x, z, startX, startZ, endX, endZ) {
        const A = endZ - startZ;
        const B = startX - endX;
        const C = (startZ * endX) - (startX * endZ);
        
        return Math.abs(A * x + B * z + C) / Math.sqrt(A * A + B * B);
    }

    // Add this new method to create bridge
    createBridge(x, y, z, width, rotated = false) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Dark wood
        const railingMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4423 }); // Darker wood for railings
        const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x5C4033 }); // Darker wood for supports
        const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 }); // Stone for base

        // Create stone foundation on both ends
        for (let side = 0; side < 2; side++) {
            for (let h = -1; h <= 0; h++) {
                for (let w = -1; w <= 1; w++) {
                    const foundation = new THREE.Mesh(geometry, stoneMaterial);
                    if (rotated) {
                        foundation.position.set(
                            x + w,
                            y + h,
                            z + (side === 0 ? -1 : width)
                        );
                    } else {
                        foundation.position.set(
                            x + (side === 0 ? -1 : width),
                            y + h,
                            z + w
                        );
                    }
                    this.scene.add(foundation);
                    this.blocks.push(foundation);
                }
            }
        }

        // Create main bridge structure
        for (let w = 0; w < width; w++) {
            // Main bridge planks (3 wide)
            for (let wide = -1; wide <= 1; wide++) {
                const plank = new THREE.Mesh(geometry, woodMaterial);
                if (rotated) {
                    plank.scale.set(0.95, 0.2, 0.95);
                    plank.position.set(x + wide, y + 0.5, z + w);
                } else {
                    plank.scale.set(0.95, 0.2, 0.95);
                    plank.position.set(x + w, y + 0.5, z + wide);
                }
                plank.castShadow = true;
                plank.receiveShadow = true;
                this.scene.add(plank);
                this.blocks.push(plank);
            }

            // Support structure
            if (w % 3 === 0) {
                // Vertical supports
                for (let h = -1; h <= 0; h++) {
                    // Left and right main supports
                    [-1.2, 1.2].forEach(side => {
                        const support = new THREE.Mesh(geometry, supportMaterial);
                        if (rotated) {
                            support.scale.set(0.4, 1, 0.4);
                            support.position.set(x + side, y + h, z + w);
                        } else {
                            support.scale.set(0.4, 1, 0.4);
                            support.position.set(x + w, y + h, z + side);
                        }
                        this.scene.add(support);
                        this.blocks.push(support);
                    });

                    // Cross supports
                    const crossSupport = new THREE.Mesh(geometry, supportMaterial);
                    if (rotated) {
                        crossSupport.scale.set(2.8, 0.3, 0.3);
                        crossSupport.position.set(x, y + h - 0.3, z + w);
                    } else {
                        crossSupport.scale.set(0.3, 0.3, 2.8);
                        crossSupport.position.set(x + w, y + h - 0.3, z);
                    }
                    this.scene.add(crossSupport);
                    this.blocks.push(crossSupport);
                }
            }

            // Detailed railings
            if (w % 2 === 0) {
                // Railing posts
                [-1.2, 1.2].forEach(side => {
                    // Main post
                    const post = new THREE.Mesh(geometry, railingMaterial);
                    if (rotated) {
                        post.scale.set(0.3, 1.2, 0.3);
                        post.position.set(x + side, y + 1.1, z + w);
                    } else {
                        post.scale.set(0.3, 1.2, 0.3);
                        post.position.set(x + w, y + 1.1, z + side);
                    }
                    this.scene.add(post);
                    this.blocks.push(post);

                    // Post cap
                    const cap = new THREE.Mesh(geometry, railingMaterial);
                    if (rotated) {
                        cap.scale.set(0.4, 0.15, 0.4);
                        cap.position.set(x + side, y + 1.8, z + w);
                    } else {
                        cap.scale.set(0.4, 0.15, 0.4);
                        cap.position.set(x + w, y + 1.8, z + side);
                    }
                    this.scene.add(cap);
                    this.blocks.push(cap);
                });
            }

            // Horizontal railing beams
            if (w < width - 1) {
                [-1.2, 1.2].forEach(side => {
                    // Upper beam
                    const upperBeam = new THREE.Mesh(geometry, railingMaterial);
                    if (rotated) {
                        upperBeam.scale.set(0.2, 0.2, 1.1);
                        upperBeam.position.set(x + side, y + 1.6, z + w + 0.5);
                    } else {
                        upperBeam.scale.set(1.1, 0.2, 0.2);
                        upperBeam.position.set(x + w + 0.5, y + 1.6, z + side);
                    }
                    this.scene.add(upperBeam);
                    this.blocks.push(upperBeam);

                    // Lower beam
                    const lowerBeam = new THREE.Mesh(geometry, railingMaterial);
                    if (rotated) {
                        lowerBeam.scale.set(0.2, 0.2, 1.1);
                        lowerBeam.position.set(x + side, y + 1.0, z + w + 0.5);
                    } else {
                        lowerBeam.scale.set(1.1, 0.2, 0.2);
                        lowerBeam.position.set(x + w + 0.5, y + 1.0, z + side);
                    }
                    this.scene.add(lowerBeam);
                    this.blocks.push(lowerBeam);
                });
            }
        }
    }

    // Add this new method for creating an apple tree
    createAppleTree(x, y, z) {
        const trunkGeometry = new THREE.BoxGeometry(1, 1, 1);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Dark brown
        
        // Main trunk with more detail
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.scale.set(1.4, 6, 1.4);
        trunk.position.set(x, y + 3, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        this.blocks.push(trunk);

        // Add bark texture details
        const barkDetails = [
            { x: 0.7, y: 2, z: 0, scale: 0.3 },
            { x: -0.7, y: 3, z: 0.2, scale: 0.4 },
            { x: 0, y: 4, z: 0.7, scale: 0.3 },
            { x: -0.2, y: 1, z: -0.7, scale: 0.4 }
        ];

        barkDetails.forEach(detail => {
            const bark = new THREE.Mesh(trunkGeometry, trunkMaterial);
            bark.scale.set(detail.scale, 1, detail.scale);
            bark.position.set(x + detail.x, y + detail.y, z + detail.z);
            this.scene.add(bark);
            this.blocks.push(bark);
        });

        // More detailed branch structure
        const branches = [
            { x: 1.5, y: 4, z: 0, rotY: Math.PI / 4, scale: 2.5, thickness: 0.9 },
            { x: -1.5, y: 5, z: 0, rotY: -Math.PI / 4, scale: 2.5, thickness: 0.9 },
            { x: 0, y: 5, z: 1.5, rotZ: Math.PI / 4, scale: 2, thickness: 0.8 },
            { x: 0, y: 4, z: -1.5, rotZ: -Math.PI / 4, scale: 2, thickness: 0.8 },
            { x: 1, y: 6, z: 1, rotY: Math.PI / 6, scale: 1.5, thickness: 0.7 },
            { x: -1, y: 6, z: -1, rotY: -Math.PI / 6, scale: 1.5, thickness: 0.7 }
        ];

        branches.forEach(branch => {
            const branchMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
            branchMesh.scale.set(branch.thickness, branch.thickness, branch.scale);
            branchMesh.position.set(x + branch.x, y + branch.y, z + branch.z);
            if (branch.rotY) branchMesh.rotation.y = branch.rotY;
            if (branch.rotZ) branchMesh.rotation.z = branch.rotZ;
            branchMesh.castShadow = true;
            branchMesh.receiveShadow = true;
            this.scene.add(branchMesh);
            this.blocks.push(branchMesh);
        });

        // Create larger, more detailed leaf clusters with apples
        const leafMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2d5a27,
            transparent: true,
            opacity: 0.9
        });
        const appleMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFF0000,    // Pure red
            emissive: 0x330000, // Slight glow
            emissiveIntensity: 0.2
        });
        const darkLeafMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a3d19,
            transparent: true,
            opacity: 0.9
        });

        // Create larger, more varied foliage area
        for (let lx = -4; lx <= 4; lx++) {
            for (let ly = 0; ly <= 4; ly++) {
                for (let lz = -4; lz <= 4; lz++) {
                    // Create more natural shape
                    const distance = Math.sqrt(lx * lx + ly * ly + lz * lz);
                    if (distance > 4 || Math.random() < 0.3) continue;

                    // Vary leaf colors and sizes
                    const leafMesh = new THREE.Mesh(
                        trunkGeometry, 
                        Math.random() > 0.3 ? leafMaterial : darkLeafMaterial
                    );
                    const leafSize = 0.8 + Math.random() * 0.4;
                    leafMesh.scale.set(leafSize, leafSize, leafSize);
                    leafMesh.position.set(
                        x + lx + (Math.random() * 0.3 - 0.15),
                        y + ly + 6,
                        z + lz + (Math.random() * 0.3 - 0.15)
                    );
                    leafMesh.rotation.set(
                        Math.random() * 0.2,
                        Math.random() * Math.PI * 2,
                        Math.random() * 0.2
                    );
                    leafMesh.castShadow = true;
                    leafMesh.receiveShadow = true;
                    this.scene.add(leafMesh);
                    this.blocks.push(leafMesh);

                    // Add more detailed apple clusters
                    if (Math.random() < 0.15 && ly === 0) { // Changed from ly === 1 to ly === 0 for lower placement
                        // Create apple with stem - made bigger and brighter
                        const apple = new THREE.Mesh(trunkGeometry, appleMaterial);
                        apple.scale.set(0.5, 0.5, 0.5);
                        
                        // Position apples to hang lower from the bottom of leaves
                        apple.position.set(
                            x + lx + (Math.random() * 0.3 - 0.15),
                            y + ly + 4.2, // Lowered from 4.8 to 4.2
                            z + lz + (Math.random() * 0.3 - 0.15)
                        );
                        apple.castShadow = true;
                        apple.receiveShadow = true;
                        this.scene.add(apple);
                        this.blocks.push(apple);

                        // Add stem to apple - pointing upward
                        const stem = new THREE.Mesh(trunkGeometry, trunkMaterial);
                        stem.scale.set(0.12, 0.25, 0.12);
                        stem.position.set(
                            apple.position.x,
                            apple.position.y + 0.4,
                            apple.position.z
                        );
                        this.scene.add(stem);
                        this.blocks.push(stem);
                    }
                }
            }
        }
    }

    // Add this new method for creating a cat
    createCat(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mainFurMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF }); // White fur
        const pinkMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 }); // Pink for ears inside and nose
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 }); // Red eyes
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Black for pupils

        // Create body
        const body = new THREE.Mesh(geometry, mainFurMaterial);
        body.scale.set(1.2, 1.3, 1.0);
        body.position.set(x, y + 0.65, z);
        this.scene.add(body);
        this.blocks.push(body);

        // Create lower body/haunches (bigger for rabbit)
        const lowerBody = new THREE.Mesh(geometry, mainFurMaterial);
        lowerBody.scale.set(1.4, 0.8, 1.2);
        lowerBody.position.set(x, y + 0.4, z);
        this.scene.add(lowerBody);
        this.blocks.push(lowerBody);

        // Create head (rounder for rabbit)
        const head = new THREE.Mesh(geometry, mainFurMaterial);
        head.scale.set(0.9, 0.9, 0.8);
        head.position.set(x, y + 1.6, z - 0.4);
        this.scene.add(head);
        this.blocks.push(head);

        // Create longer ears for rabbit
        const earPositions = [
            { x: 0.25, z: -0.15 },
            { x: -0.25, z: -0.15 }
        ];

        earPositions.forEach(pos => {
            // Outer ear (longer)
            const ear = new THREE.Mesh(geometry, mainFurMaterial);
            ear.scale.set(0.25, 0.8, 0.15); // Much longer ears
            ear.position.set(x + pos.x, y + 2.6, z - 0.5 + pos.z);
            ear.rotation.x = Math.PI / 6; // Slightly tilted back
            this.scene.add(ear);
            this.blocks.push(ear);

            // Inner ear
            const innerEar = new THREE.Mesh(geometry, pinkMaterial);
            innerEar.scale.set(0.15, 0.7, 0.07);
            innerEar.position.set(x + pos.x, y + 2.55, z - 0.48 + pos.z);
            innerEar.rotation.x = Math.PI / 6;
            this.scene.add(innerEar);
            this.blocks.push(innerEar);
        });

        // Create red eyes
        const eyePositions = [
            { x: 0.25, z: -0.7 },
            { x: -0.25, z: -0.7 }
        ];

        eyePositions.forEach(pos => {
            const eye = new THREE.Mesh(geometry, eyeMaterial);
            eye.scale.set(0.25, 0.25, 0.15);
            eye.position.set(x + pos.x, y + 1.75, z + pos.z);
            this.scene.add(eye);
            this.blocks.push(eye);

            const pupil = new THREE.Mesh(geometry, blackMaterial);
            pupil.scale.set(0.15, 0.15, 0.07);
            pupil.position.set(x + pos.x, y + 1.75, z + pos.z - 0.07);
            this.scene.add(pupil);
            this.blocks.push(pupil);
        });

        // Create pink nose (slightly larger)
        const nose = new THREE.Mesh(geometry, pinkMaterial);
        nose.scale.set(0.2, 0.15, 0.15);
        nose.position.set(x, y + 1.55, z - 0.85);
        this.scene.add(nose);
        this.blocks.push(nose);

        // Create front paws (shorter)
        const frontPawPositions = [
            { x: 0.4, z: -0.4 },
            { x: -0.4, z: -0.4 }
        ];

        frontPawPositions.forEach(pos => {
            const paw = new THREE.Mesh(geometry, mainFurMaterial);
            paw.scale.set(0.3, 0.4, 0.3);
            paw.position.set(x + pos.x, y + 0.2, z + pos.z);
            this.scene.add(paw);
            this.blocks.push(paw);
        });

        // Create fluffy tail
        const tail = new THREE.Mesh(geometry, mainFurMaterial);
        tail.scale.set(0.5, 0.5, 0.5);
        tail.position.set(x, y + 0.5, z + 0.6);
        this.scene.add(tail);
        this.blocks.push(tail);

        // Add whiskers (thinner for rabbit)
        const whiskerPositions = [
            { x: 0.5, y: 0.1, z: 0, side: 1 },
            { x: 0.5, y: 0, z: 0, side: 1 },
            { x: 0.5, y: -0.1, z: 0, side: 1 },
            { x: -0.5, y: 0.1, z: 0, side: -1 },
            { x: -0.5, y: 0, z: 0, side: -1 },
            { x: -0.5, y: -0.1, z: 0, side: -1 }
        ];

        whiskerPositions.forEach(pos => {
            const whisker = new THREE.Mesh(geometry, blackMaterial);
            whisker.scale.set(0.4, 0.02, 0.02);
            whisker.position.set(
                x + pos.x * pos.side,
                y + 1.55 + pos.y,
                z - 0.8 + pos.z
            );
            this.scene.add(whisker);
            this.blocks.push(whisker);
        });
    }

    // Add this new method to create a fish
    createFish(x, y, z, color = 0xFF6B6B) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const fishMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });
        const fishGroup = new THREE.Group();
        
        // Main body (more streamlined)
        const bodySegments = [
            { pos: [0, 0, 0], scale: [0.6, 0.3, 0.4] },      // Center (made longer)
            { pos: [0.25, 0, 0], scale: [0.3, 0.25, 0.3] },  // Front
            { pos: [-0.25, 0, 0], scale: [0.3, 0.25, 0.3] }, // Back
            { pos: [0.4, 0, 0], scale: [0.2, 0.2, 0.2] },    // Nose
        ];

        bodySegments.forEach(segment => {
            const bodyPart = new THREE.Mesh(geometry, fishMaterial);
            bodyPart.scale.set(...segment.scale);
            bodyPart.position.set(...segment.pos);
            fishGroup.add(bodyPart);
        });

        // Prettier tail fin (fan-shaped)
        const tailPositions = [
            { pos: [-0.4, 0, 0], scale: [0.2, 0.4, 0.4], rot: 0 },
            { pos: [-0.5, 0, 0.2], scale: [0.15, 0.3, 0.2], rot: Math.PI / 4 },
            { pos: [-0.5, 0, -0.2], scale: [0.15, 0.3, 0.2], rot: -Math.PI / 4 }
        ];

        tailPositions.forEach(segment => {
            const tailPart = new THREE.Mesh(geometry, fishMaterial);
            tailPart.scale.set(...segment.scale);
            tailPart.position.set(...segment.pos);
            tailPart.rotation.y = segment.rot;
            fishGroup.add(tailPart);
        });

        // Decorative fins
        const finMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.7
        });

        // Top fin (more elegant)
        const dorsalFin = new THREE.Mesh(geometry, finMaterial);
        dorsalFin.scale.set(0.4, 0.3, 0.05);
        dorsalFin.position.set(0, 0.2, 0);
        dorsalFin.rotation.z = Math.PI / 5;
        fishGroup.add(dorsalFin);

        // Side fins (more delicate)
        [0.2, -0.2].forEach(zPos => {
            const sideFin = new THREE.Mesh(geometry, finMaterial);
            sideFin.scale.set(0.25, 0.05, 0.2);
            sideFin.position.set(0, -0.1, zPos);
            sideFin.rotation.z = zPos > 0 ? Math.PI / 3 : -Math.PI / 3;
            fishGroup.add(sideFin);
        });

        // Shimmering eyes
        const eyeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            emissive: 0x666666,
            emissiveIntensity: 0.2
        });
        const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        [0.15, -0.15].forEach(zPos => {
            const eye = new THREE.Mesh(geometry, eyeMaterial);
            eye.scale.set(0.12, 0.12, 0.12);
            eye.position.set(0.35, 0.05, zPos);
            fishGroup.add(eye);

            const pupil = new THREE.Mesh(geometry, pupilMaterial);
            pupil.scale.set(0.06, 0.06, 0.06);
            pupil.position.set(0.4, 0.05, zPos);
            fishGroup.add(pupil);
        });

        // Scale and position
        fishGroup.scale.set(0.4, 0.4, 0.4); // Made slightly smaller
        fishGroup.position.set(x, y, z);
        this.scene.add(fishGroup);

        return fishGroup;
    }

    createCloud(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const cloudMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });

        const cloudGroup = new THREE.Group();
        
        // Create main cloud body with multiple segments
        const segments = [
            { pos: [0, 0, 0], scale: [2, 1, 2] },
            { pos: [-1, 0.2, 0], scale: [1.5, 0.8, 1.5] },
            { pos: [1, 0.3, 0], scale: [1.7, 0.9, 1.7] },
            { pos: [0, 0.4, 1], scale: [1.4, 0.7, 1.4] },
            { pos: [0, 0.1, -1], scale: [1.6, 0.8, 1.6] },
            { pos: [-1, 0.2, 1], scale: [1.3, 0.6, 1.3] },
            { pos: [1, 0.3, -1], scale: [1.5, 0.7, 1.5] }
        ];

        segments.forEach(segment => {
            const cloudPart = new THREE.Mesh(geometry, cloudMaterial);
            cloudPart.position.set(
                x + segment.pos[0],
                y + segment.pos[1],
                z + segment.pos[2]
            );
            cloudPart.scale.set(...segment.scale);
            cloudGroup.add(cloudPart);
        });

        this.scene.add(cloudGroup);
        this.blocks.push(cloudGroup);

        return cloudGroup;
    }

    createCherryBlossomTree(x, y, z) {
        const trunkGeometry = new THREE.BoxGeometry(1, 1, 1);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Dark brown
        
        // Main trunk with more detail
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.scale.set(1.4, 6, 1.4);
        trunk.position.set(x, y + 3, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.scene.add(trunk);
        this.blocks.push(trunk);

        // Add bark texture details
        const barkDetails = [
            { x: 0.7, y: 2, z: 0, scale: 0.3 },
            { x: -0.7, y: 3, z: 0.2, scale: 0.4 },
            { x: 0, y: 4, z: 0.7, scale: 0.3 },
            { x: -0.2, y: 1, z: -0.7, scale: 0.4 }
        ];

        barkDetails.forEach(detail => {
            const bark = new THREE.Mesh(trunkGeometry, trunkMaterial);
            bark.scale.set(detail.scale, 1, detail.scale);
            bark.position.set(x + detail.x, y + detail.y, z + detail.z);
            this.scene.add(bark);
            this.blocks.push(bark);
        });

        // More detailed branch structure
        const branches = [
            // Primary branches
            { x: 2.5, y: 4, z: 0, rotY: Math.PI / 4, scale: 3, thickness: 0.8 },
            { x: -2.5, y: 4.5, z: 0, rotY: -Math.PI / 4, scale: 3, thickness: 0.8 },
            { x: 0, y: 5, z: 2.5, rotZ: Math.PI / 4, scale: 2.5, thickness: 0.8 },
            { x: 0, y: 4.5, z: -2.5, rotZ: -Math.PI / 4, scale: 2.5, thickness: 0.8 },
            
            // Secondary branches
            { x: 1.8, y: 5.5, z: 1.8, rotY: Math.PI / 6, scale: 2, thickness: 0.6 },
            { x: -1.8, y: 5.5, z: -1.8, rotY: -Math.PI / 6, scale: 2, thickness: 0.6 },
            { x: -1.8, y: 5, z: 1.8, rotY: -Math.PI / 3, scale: 2, thickness: 0.6 },
            { x: 1.8, y: 5, z: -1.8, rotY: Math.PI / 3, scale: 2, thickness: 0.6 },
            
            // Smaller decorative branches
            { x: 1.2, y: 6, z: 0.8, rotY: Math.PI / 5, scale: 1.2, thickness: 0.4 },
            { x: -1.2, y: 6, z: -0.8, rotY: -Math.PI / 5, scale: 1.2, thickness: 0.4 },
            { x: 0.8, y: 5.8, z: 1.2, rotZ: Math.PI / 5, scale: 1.2, thickness: 0.4 },
            { x: -0.8, y: 5.8, z: -1.2, rotZ: -Math.PI / 5, scale: 1.2, thickness: 0.4 }
        ];

        branches.forEach(branch => {
            const branchMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
            branchMesh.scale.set(branch.thickness, branch.thickness, branch.scale);
            branchMesh.position.set(x + branch.x, y + branch.y, z + branch.z);
            if (branch.rotY) branchMesh.rotation.y = branch.rotY;
            if (branch.rotZ) branchMesh.rotation.z = branch.rotZ;
            branchMesh.castShadow = true;
            branchMesh.receiveShadow = true;
            this.scene.add(branchMesh);
            this.blocks.push(branchMesh);
        });

        // Enhanced cherry blossoms with multiple colors
        const blossomColors = [
            { color: 0xFFB7C5, opacity: 0.9 }, // Light pink
            { color: 0xFF69B4, opacity: 0.85 }, // Dark pink
            { color: 0xFFC0CB, opacity: 0.95 }, // Pink
            { color: 0xFFE4E1, opacity: 0.9 }  // Nearly white pink
        ];

        const blossomMaterials = blossomColors.map(color => 
            new THREE.MeshLambertMaterial({ 
                color: color.color,
                transparent: true,
                opacity: color.opacity,
                emissive: color.color,
                emissiveIntensity: 0.1
            })
        );

        // Create denser, more natural foliage
        for (let lx = -5; lx <= 5; lx++) {
            for (let ly = 0; ly <= 5; ly++) {
                for (let lz = -5; lz <= 5; lz++) {
                    const distance = Math.sqrt(lx * lx + ly * ly + lz * lz);
                    if (distance > 5 || Math.random() < 0.2) continue;

                    // Create varied blossom clusters
                    const material = blossomMaterials[Math.floor(Math.random() * blossomMaterials.length)];
                    const blossom = new THREE.Mesh(trunkGeometry, material);
                    
                    // Vary blossom sizes more
                    const blossomSize = 0.4 + Math.random() * 0.4;
                    blossom.scale.set(blossomSize, blossomSize, blossomSize);

                    // Add more randomness to positioning
                    const offsetX = Math.random() * 0.4 - 0.2;
                    const offsetY = Math.random() * 0.4 - 0.2;
                    const offsetZ = Math.random() * 0.4 - 0.2;

                    blossom.position.set(
                        x + lx + offsetX,
                        y + ly + 5 + offsetY,
                        z + lz + offsetZ
                    );

                    // Random rotations for more natural look
                    blossom.rotation.set(
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2,
                        Math.random() * Math.PI * 2
                    );

                    blossom.castShadow = true;
                    blossom.receiveShadow = true;
                    this.scene.add(blossom);
                    this.blocks.push(blossom);

                    // Add occasional falling petals
                    if (Math.random() < 0.1) {
                        const petal = new THREE.Mesh(trunkGeometry, material);
                        petal.scale.set(0.2, 0.05, 0.2);
                        petal.position.set(
                            x + lx + Math.random() * 2 - 1,
                            y + ly + 3 + Math.random() * 2,
                            z + lz + Math.random() * 2 - 1
                        );
                        petal.rotation.set(
                            Math.random() * Math.PI,
                            Math.random() * Math.PI,
                            Math.PI / 4 + Math.random() * Math.PI / 4
                        );
                        this.scene.add(petal);
                        this.blocks.push(petal);
                    }
                }
            }
        }
    }

    createTreasureChest(x, y, z) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Enhanced materials
        const woodMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Dark wood
        const darkWoodMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Darker wood for contrast
        const metalMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xB8860B,
            emissive: 0xB8860B,
            emissiveIntensity: 0.1
        });
        const goldMaterial = new THREE.MeshLambertMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.2
        });
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 }); // For keyhole

        const chest = new THREE.Group();
        
        // Main chest body with layered design
        const baseOuter = new THREE.Mesh(geometry, woodMaterial);
        baseOuter.scale.set(2.2, 1.5, 1.6);
        baseOuter.position.set(0, 0.75, 0);
        chest.add(baseOuter);

        // Inner layer with darker wood
        const baseInner = new THREE.Mesh(geometry, darkWoodMaterial);
        baseInner.scale.set(2, 1.3, 1.4);
        baseInner.position.set(0, 0.75, 0);
        chest.add(baseInner);

        // Decorative metal frame
        const frameDetails = [
            // Corner posts (thicker)
            { pos: [-1, 0.75, -0.7], scale: [0.2, 1.5, 0.2] },
            { pos: [1, 0.75, -0.7], scale: [0.2, 1.5, 0.2] },
            { pos: [-1, 0.75, 0.7], scale: [0.2, 1.5, 0.2] },
            { pos: [1, 0.75, 0.7], scale: [0.2, 1.5, 0.2] },
            
            // Horizontal bands (thinner but more detailed)
            { pos: [0, 0.3, 0.7], scale: [2.2, 0.15, 0.1] },
            { pos: [0, 1.2, 0.7], scale: [2.2, 0.15, 0.1] },
            { pos: [0, 0.3, -0.7], scale: [2.2, 0.15, 0.1] },
            { pos: [0, 1.2, -0.7], scale: [2.2, 0.15, 0.1] },
            
            // Side bands
            { pos: [-1, 0.75, 0], scale: [0.1, 1.5, 1.6] },
            { pos: [1, 0.75, 0], scale: [0.1, 1.5, 1.6] },
            
            // Decorative center band
            { pos: [0, 0.75, 0], scale: [2.2, 0.3, 0.1] }
        ];

        frameDetails.forEach(detail => {
            const frame = new THREE.Mesh(geometry, metalMaterial);
            frame.scale.set(...detail.scale);
            frame.position.set(...detail.pos);
            chest.add(frame);
        });

        // Detailed lock mechanism
        const lockPieces = [
            // Main lock body
            { pos: [0, 0.75, 0.8], scale: [0.6, 0.6, 0.2], material: metalMaterial },
            // Lock inner piece
            { pos: [0, 0.75, 0.9], scale: [0.4, 0.4, 0.1], material: darkWoodMaterial },
            // Keyhole (black)
            { pos: [0, 0.75, 1], scale: [0.15, 0.25, 0.1], material: blackMaterial }
        ];

        lockPieces.forEach(piece => {
            const lockPart = new THREE.Mesh(geometry, piece.material);
            lockPart.scale.set(...piece.scale);
            lockPart.position.set(...piece.pos);
            chest.add(lockPart);
        });

        // Add decorative corner studs
        const studPositions = [
            [-0.9, 0.2, 0.7], [0.9, 0.2, 0.7],
            [-0.9, 1.3, 0.7], [0.9, 1.3, 0.7],
            [-0.9, 0.2, -0.7], [0.9, 0.2, -0.7],
            [-0.9, 1.3, -0.7], [0.9, 1.3, -0.7]
        ];

        studPositions.forEach(pos => {
            const stud = new THREE.Mesh(geometry, metalMaterial);
            stud.scale.set(0.2, 0.2, 0.2);
            stud.position.set(...pos);
            chest.add(stud);
        });

        // Add treasure inside (more varied and detailed)
        const treasureItems = [
            // Gold coins in piles
            ...Array(8).fill().map(() => ({
                pos: [(Math.random() - 0.5) * 1.4, 1.2, (Math.random() - 0.5) * 0.8],
                scale: [0.25, 0.08, 0.25],
                material: goldMaterial,
                rotation: [0, Math.random() * Math.PI, 0]
            })),
            // Larger gold pieces
            { pos: [-0.5, 1.1, 0], scale: [0.4, 0.2, 0.3], material: goldMaterial },
            { pos: [0.4, 1.1, 0.2], scale: [0.3, 0.25, 0.3], material: goldMaterial },
            // Decorative gems (using different colors)
            { pos: [0, 1.2, 0.3], scale: [0.2, 0.2, 0.2], material: new THREE.MeshLambertMaterial({ 
                color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.2 
            })}, // Ruby
            { pos: [-0.3, 1.2, -0.2], scale: [0.2, 0.2, 0.2], material: new THREE.MeshLambertMaterial({ 
                color: 0x0000FF, emissive: 0x0000FF, emissiveIntensity: 0.2 
            })} // Sapphire
        ];

        treasureItems.forEach(item => {
            const treasure = new THREE.Mesh(geometry, item.material);
            treasure.scale.set(...item.scale);
            treasure.position.set(...item.pos);
            if (item.rotation) {
                treasure.rotation.set(...item.rotation);
            }
            chest.add(treasure);
        });

        // Position the entire chest
        chest.position.set(x, y, z);
        this.scene.add(chest);
        this.blocks.push(chest);

        return chest;
    }
}

window.Scene = Scene; 