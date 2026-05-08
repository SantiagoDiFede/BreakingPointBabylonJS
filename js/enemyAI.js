function initializeEnemyAI(enemy, playerMesh, scene) {
    console.log("initializing...");
    if (!enemy.enemyConfig) return;
    
    const config = enemy.enemyConfig;
    
    enemy.aiState = {
        targetPlayer: playerMesh,
        lastShotTime: 0,
        canSee: false,
        timeSinceLastCheck: 0,
    };
    
    if (config.name === "Tank" || config.name === "Fast Box") {
        initializeMeleeAI(enemy, scene);
    } else if (config.name === "Box" || config.name === "Sphere") {
        initializeRangedAI(enemy, scene);
    }
}

function initializeMeleeAI(enemy, scene) {
    const config = enemy.enemyConfig;
    enemy.aiState.moveSpeed = config.name === "Tank" ? 3 : 5.5;
    enemy.aiState.stoppingDistance = 2.5;
    enemy.aiState.detectionRange = 30;
    enemy.aiState.rotationSpeed = 0.1; // Lerp factor
    
    enemy.updateAI = function(deltaTime) {
        updateMeleeAI(this, deltaTime);
    };
}

function initializeRangedAI(enemy, scene) {
    const config = enemy.enemyConfig;
    enemy.aiState.shootInterval = config.name === "Box" ? 1500 : 3200;
    enemy.aiState.projectileSpeed =  config.name === "Box" ? 20 :  10;
    enemy.aiState.projectileSize =  config.name === "Box" ? 0.8 : 0.5;
    enemy.aiState.detectionRange = config.name === "Box" ? 35 : 35;
    enemy.aiState.shootRange = config.name === "Box" ? 25 : 35;
    enemy.aiState.rotationSpeed = 0.08; // Shooters turn a bit slower
    
    enemy.updateAI = function(deltaTime) {
        updateRangedAI(this, deltaTime);
    };
}

function updateMeleeAI(enemy, deltaTime) {
    if (enemy.isDead || !enemy.aiState.targetPlayer) return;
    
    const aiState = enemy.aiState;
    const player = aiState.targetPlayer;
    const config = enemy.enemyConfig;
    
    // Calculate distance to player
    const distToPlayer = BABYLON.Vector3.Distance(enemy.position, player.position);
    
    // Check if player is in detection range
    aiState.canSee = distToPlayer < aiState.detectionRange;
    
    if (aiState.canSee) {
        const direction = player.position.subtract(enemy.position).normalize();

        // --- NEW ROTATION LOGIC ---
        // Create a target position at the same height as the enemy to prevent tilting
        const lookTarget = new BABYLON.Vector3(player.position.x, enemy.position.y, player.position.z);
        
        // Use lookAt for immediate rotation or smoothly lerp the quaternion
        enemy.lookAt(lookTarget); 
        // ---------------------------

        if (distToPlayer > aiState.stoppingDistance) {
            // Walk toward player
            const moveAmount = aiState.moveSpeed * deltaTime;
            
            if (config.isGrounded && enemy.physicsAggregate) {
                const body = enemy.physicsAggregate.body;
                
                if (body.getMotionType() === BABYLON.PhysicsMotionType.DYNAMIC) {
                    const currentVel = body.getLinearVelocity();
                    const moveVec = direction.scale(aiState.moveSpeed);
                    body.setLinearVelocity(new BABYLON.Vector3(moveVec.x, currentVel.y, moveVec.z));
                } else {
                    enemy.position.addInPlace(direction.scale(moveAmount));
                }
            }
        }
    } else if (config.isGrounded && enemy.physicsAggregate && !aiState.canSee) {
        // Stop movement if out of range and dynamic
        const body = enemy.physicsAggregate.body;
        if (body.getMotionType() === BABYLON.PhysicsMotionType.DYNAMIC) {
            const currentVel = body.getLinearVelocity();
            body.setLinearVelocity(new BABYLON.Vector3(0, currentVel.y, 0));
        }
    }

    const dist = BABYLON.Vector3.Distance(enemy.position, player.position);

    if (dist < 2.0) { // Touching distance
        const now = Date.now();
        if (!enemy.aiState.lastAttackTime || now - enemy.aiState.lastAttackTime > 1000) {
            takeDamage(15);
            enemy.aiState.lastAttackTime = now;
            console.log("Player hit by enemy!");
        }
    }
}

function updateRangedAI(enemy, deltaTime) {
    if (enemy.isDead || !enemy.aiState.targetPlayer) return;
    
    const aiState = enemy.aiState;
    const player = aiState.targetPlayer;
    const distToPlayer = BABYLON.Vector3.Distance(enemy.position, player.position);
    
    aiState.canSee = distToPlayer < aiState.detectionRange;
    
    if (aiState.canSee) {
        // Face the player before and while shooting
        facePlayer(enemy, player, aiState.rotationSpeed);

        if (distToPlayer < aiState.shootRange) {
            aiState.timeSinceLastCheck += deltaTime * 1000; // Convert to ms
            
            if (aiState.timeSinceLastCheck - aiState.lastShotTime >= aiState.shootInterval) {
                fireProjectile(enemy, player, aiState.projectileSpeed, aiState.projectileSize);
                aiState.lastShotTime = aiState.timeSinceLastCheck;
            }
        }
    }
}
 
/**
 * Fire a projectile from enemy toward player
 */
function fireProjectile(enemy, targetPlayer, projectileSpeed, projectileSize) {
    const scene = enemy.getScene();
    
    const projectile = BABYLON.MeshBuilder.CreateSphere(
        "projectile",
        { diameter: projectileSize },
        scene
    );
    
    projectile.position = enemy.position.clone();
    projectile.position.y += 1; 
    
    const projMat = new BABYLON.StandardMaterial("projectileMat_" + Math.random(), scene);
    // A dark, cool grey for the base metal
    projMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22); 

    // A very subtle glow to simulate metallic sheen/reflection
    // (Keep this low so it doesn't look like it's glowing in the dark)
    projMat.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.07);

    // Optional: If you want that polished bullet "shine"
    projMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.45);
    projMat.specularPower = 64;
        
    const direction = targetPlayer.position.subtract(projectile.position).normalize();
    
    const projectileAggregate = new BABYLON.PhysicsAggregate(
        projectile,
        BABYLON.PhysicsShapeType.SPHERE,
        { mass: 0.1, restitution: 0.3, friction: 0.2 },
        scene
    );
    
    projectile.physicsAggregate = projectileAggregate;
    const projectileBody = projectileAggregate.body;
    
    projectileBody.setGravityFactor(0);
    projectileBody.setLinearVelocity(direction.scale(projectileSpeed));
    
    projectile.isProjectile = true;
    projectile.sourceEnemy = enemy;
    projectile.maxLifetime = 10000; 

    // --- FIX: USE COLLISION OBSERVABLE ---
    // 1. Enable collision callbacks for this body
    projectileBody.setCollisionCallbackEnabled(true);
    
    // 2. Add the observer to detect collisions
    projectileBody.getCollisionObservable().add((collisionEvent) => {
        // collisionEvent.collidedAgainst is the other physics body
        handleProjectileCollision(projectile, collisionEvent.collidedAgainst, scene);
    });
    // -------------------------------------
    
    setTimeout(() => {
        if (projectile && !projectile.isDisposed()) {
            if (projectile.physicsAggregate) projectile.physicsAggregate.dispose();
            projectile.dispose();
        }
    }, projectile.maxLifetime);
}
/**
 * Handle projectile collision
 */
function handleProjectileCollision(projectile, otherBody, scene) {
    if (projectile.isDisposed()) return;

    // Check if the body we hit is the player's physics body
    if (window.playerAggregate && otherBody === window.playerAggregate.body) {
        // Call the damage function in main.js
        if (typeof takeDamage === "function") {
            takeDamage(10); 
        }
        console.log("Player hit by projectile!");
    }

    // Visual effect at impact
    spawnHitDecal(projectile.position, BABYLON.Vector3.Down(), 
                  scene.getMeshByName("ground") || scene.meshes[0]);
    
    // Cleanup physics and mesh
    if (projectile.physicsAggregate) {
        projectile.physicsAggregate.dispose();
        projectile.physicsAggregate = null;
    }
    projectile.dispose();
}
/**
 * Main AI update loop - call this in your game loop
 */
function updateAllEnemyAI(deltaTime, mapManager) {
    const currentRoom = mapManager.getCurrentRoom();
    if (!currentRoom || !currentRoom.enemies) return;
    
    currentRoom.enemies.forEach(enemy => {
        if (enemy.updateAI && !enemy.isDead) {
            enemy.updateAI(deltaTime);
        }
    });
}
 
// ===========================
// HELPER: Clear all projectiles when changing rooms
// ===========================
function clearProjectiles(scene) {
    scene.meshes.forEach(mesh => {
        if (mesh.isProjectile && !mesh.isDisposed()) {
            if (mesh.physicsAggregate) {
                mesh.physicsAggregate.dispose();
            }
            mesh.dispose();
        }
    });
}


function facePlayer(enemy, player, lerpSpeed = 0.1) {
    if (!enemy || !player) return;

    // Calculate direction on the XZ plane (ignore height)
    const direction = player.position.subtract(enemy.position);
    direction.y = 0; 
    
    if (direction.length() > 0.001) {
        // Calculate target rotation
        const targetRotation = BABYLON.Quaternion.FromLookDirectionLH(
            direction.normalize(), 
            BABYLON.Vector3.Up()
        );

        // Physics-enabled meshes use rotationQuaternion. 
        // If it's null, initialize it from current rotation.
        if (!enemy.rotationQuaternion) {
            enemy.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(enemy.rotation);
        }

        // Smoothly interpolate (Slerp) toward the target
        BABYLON.Quaternion.SlerpToRef(
            enemy.rotationQuaternion, 
            targetRotation, 
            lerpSpeed, 
            enemy.rotationQuaternion
        );
    }
}