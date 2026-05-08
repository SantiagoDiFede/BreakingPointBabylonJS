function initializeEnemyAI(enemy, playerMesh, scene) {
    console.log("initializing...");
    if (!enemy.enemyConfig) return;
    
    const config = enemy.enemyConfig;
    
    // Common AI properties
    enemy.aiState = {
        targetPlayer: playerMesh,
        lastShotTime: 0,
        canSee: false,
        timeSinceLastCheck: 0,
    };
    
    // Behavior-specific initialization
    if (config.name === "Tank" || config.name === "Fast Box") {
        // Melee walkers
        initializeMeleeAI(enemy, scene);
    } else if (config.name === "Box" || config.name === "Sphere") {
        // Ranged shooters
        initializeRangedAI(enemy, scene);
    }
}
 
/**
 * Initialize melee walker AI (Tank & Fast Box)
 */
function initializeMeleeAI(enemy, scene) {
    const config = enemy.enemyConfig;
    
    enemy.aiState.moveSpeed = config.name === "Tank" ? 3 : 5.5; // Tank is slower
    enemy.aiState.stoppingDistance = 2.5;
    enemy.aiState.detectionRange = 30;
    enemy.aiState.rotationSpeed = 0.1;
    
    enemy.updateAI = function(deltaTime) {
        updateMeleeAI(this, deltaTime);
    };
}
 
/**
 * Initialize ranged shooter AI (Box & Sphere)
 */
function initializeRangedAI(enemy, scene) {
    const config = enemy.enemyConfig;
    
    enemy.aiState.shootInterval = config.name === "Box" ? 1500 : 2200; // Box shoots faster
    enemy.aiState.projectileSpeed = 15;
    enemy.aiState.projectileSize = 0.3;
    enemy.aiState.detectionRange = 35;
    enemy.aiState.shootRange = 30;
    
    enemy.updateAI = function(deltaTime) {
        updateRangedAI(this, deltaTime);
    };
}
 
/**
 * Update melee walker AI (movement toward player)
 */
function updateMeleeAI(enemy, deltaTime) {
    if (enemy.isDead || !enemy.aiState.targetPlayer) return;
    
    const aiState = enemy.aiState;
    const player = aiState.targetPlayer;
    const config = enemy.enemyConfig;
    
    // Calculate distance to player
    const distToPlayer = BABYLON.Vector3.Distance(enemy.position, player.position);
    
    // Check if player is in detection range
    aiState.canSee = distToPlayer < aiState.detectionRange;
    
    if (aiState.canSee && distToPlayer > aiState.stoppingDistance) {
        // Walk toward player
        const direction = player.position.subtract(enemy.position).normalize();
        const moveAmount = aiState.moveSpeed * deltaTime;
        
        // Apply grounded movement (constrain to ground plane for static bodies)
        if (config.isGrounded && enemy.physicsAggregate) {
            // For static bodies, we need to move the aggregate directly
            const newPos = enemy.position.add(direction.scale(moveAmount));
            enemy.position = newPos;
        } else if (enemy.physicsAggregate && enemy.physicsAggregate.body) {
            // For dynamic bodies, use physics
            const currentVel = enemy.physicsAggregate.body.getLinearVelocity();
            const moveVec = direction.scale(aiState.moveSpeed);
            enemy.physicsAggregate.body.setLinearVelocity(
                new BABYLON.Vector3(moveVec.x, currentVel.y, moveVec.z)
            );
        }
        
        // Rotate to face player (smooth rotation)
        const targetRotY = Math.atan2(direction.x, direction.z);
        const currentRotY = enemy.rotation.y;
        const rotDiff = targetRotY - currentRotY;
        
        // Normalize angle difference to [-PI, PI]
        const normalizedDiff = Math.atan2(Math.sin(rotDiff), Math.cos(rotDiff));
        
        enemy.rotation.y += normalizedDiff * aiState.rotationSpeed;
    } else if (config.isGrounded && enemy.physicsAggregate && !aiState.canSee) {
        // Stop movement if out of range
        enemy.position.x = enemy.position.x; // No-op to prevent drift
    }
}
 
/**
 * Update ranged shooter AI (shooting at player)
 */
function updateRangedAI(enemy, deltaTime) {
    if (enemy.isDead || !enemy.aiState.targetPlayer) return;
    
    const aiState = enemy.aiState;
    const player = aiState.targetPlayer;
    const config = enemy.enemyConfig;
    
    // Calculate distance to player
    const distToPlayer = BABYLON.Vector3.Distance(enemy.position, player.position);
    
    // Check if player is in range
    aiState.canSee = distToPlayer < aiState.detectionRange;
    
    if (aiState.canSee && distToPlayer < aiState.shootRange) {
        // Update last check timer
        aiState.timeSinceLastCheck += deltaTime;
        
        // Shoot at interval
        if (aiState.timeSinceLastCheck - aiState.lastShotTime >= aiState.shootInterval) {
            fireProjectile(enemy, player, aiState.projectileSpeed, aiState.projectileSize);
            aiState.lastShotTime = aiState.timeSinceLastCheck;
        }
    }
}
 
/**
 * Fire a projectile from enemy toward player
 */
function fireProjectile(enemy, targetPlayer, projectileSpeed, projectileSize) {
    const scene = enemy.getScene();
    
    // Create projectile mesh
    const projectile = BABYLON.MeshBuilder.CreateSphere(
        "projectile",
        { diameter: projectileSize },
        scene
    );
    
    // Position at enemy center
    projectile.position = enemy.position.clone();
    projectile.position.y += 1; // Shoot from approximate eye height
    
    // Create projectile material
    const projMat = new BABYLON.StandardMaterial("projectileMat_" + Math.random(), scene);
    projMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0); // Orange-yellow
    projMat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0);
    projectile.material = projMat;
    
    // Calculate direction to player with slight height adjustment
    const direction = targetPlayer.position.subtract(projectile.position);
    direction.y += 0.5; // Aim slightly above player center
    direction.normalize();
    
    // Setup physics
    const projectileAggregate = new BABYLON.PhysicsAggregate(
        projectile,
        BABYLON.PhysicsShapeType.SPHERE,
        { mass: 0.1, restitution: 0.3, friction: 0.2 },
        scene
    );
    
    const projectileBody = projectileAggregate.body;
    projectileBody.setLinearVelocity(direction.scale(projectileSpeed));
    projectileBody.setLinearDamping(0.1);
    projectileBody.setAngularDamping(0.5);
    
    // Tag it as a projectile for collision detection
    projectile.isProjectile = true;
    projectile.sourceEnemy = enemy;
    projectile.createdTime = Date.now();
    projectile.maxLifetime = 15000; // 15 seconds
    
    // Setup collision with player
    projectileAggregate.onCollide = (body) => {
        handleProjectileCollision(projectile, body, scene);
    };
    
    // Auto-cleanup after timeout
    setTimeout(() => {
        if (projectile && !projectile.isDisposed()) {
            projectile.physicsAggregate.dispose();
            projectile.dispose();
        }
    }, projectile.maxLifetime);
}
 
/**
 * Handle projectile collision
 */
function handleProjectileCollision(projectile, otherBody, scene) {
    if (projectile.isDisposed()) return;
    
    // Damage player if hit
    // TODO: Implement player damage when you add player health
    // For now, just remove the projectile
    
    // Visual effect at impact
    spawnHitDecal(projectile.position, BABYLON.Vector3.Down(), 
                  scene.getMeshByName("ground") || scene.meshes[0]);
    
    // Cleanup
    if (projectile.physicsAggregate) {
        projectile.physicsAggregate.dispose();
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
