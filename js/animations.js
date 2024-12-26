export class Animations {
    constructor(scene) {
        this.scene = scene;
        this.animations = new Map();
    }

    addFloatingAnimation(block, amplitude = 0.5, frequency = 0.002) {
        const initialY = block.position.y;
        const animation = {
            update: (time) => {
                block.position.y = initialY + Math.sin(time * frequency) * amplitude;
            }
        };
        this.animations.set(block.uuid, animation);
    }

    addRotationAnimation(block, speed = 0.01) {
        const animation = {
            update: () => {
                block.rotation.y += speed;
            }
        };
        this.animations.set(block.uuid + '_rotation', animation);
    }

    addHoverEffect(block) {
        const originalScale = block.scale.clone();
        block.userData.hover = {
            scale: originalScale,
            highlight: () => {
                block.scale.set(
                    originalScale.x * 1.1,
                    originalScale.y * 1.1,
                    originalScale.z * 1.1
                );
            },
            reset: () => {
                block.scale.copy(originalScale);
            }
        };
    }

    update(time) {
        this.animations.forEach(animation => animation.update(time));
    }
} 