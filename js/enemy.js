// Enemy type definitions - now with model paths, health, and grounded physics
var ENEMY_TYPES = {
    box: {
        name: "Box", 
        size: 2, 
        modelPath: "models/rob1.glb",
        useModel: true,
        color: { r: 1, g: 0, b: 0 },
        mass: 1, restitution: 0.5, friction: 0.5,
        linearDamping: 0.7, angularDamping: 0.7,
        modelRotation: { x: 0, y: 0, z: 0 },
        modelYOffset: -1,
        // NEW: Health and ragdoll settings
        health: 3,                    // Shots needed to kill
        knockbackForce: 2,            // Reduced knockback while alive
        ragdollKnockbackForce: 15,    // Strong knockback when dead
        isGrounded: true              // Bolt to ground
    },
    sphere: {
        name: "Sphere", 
        size: 2.5, 
        modelPath: "models/semiautobot.glb",
        useModel: true,
        color: { r: 0.8, g: 0, b: 0.8 },
        mass: 0.8, restitution: 0.7, friction: 0.3,
        linearDamping: 0.5, angularDamping: 0.5,
        modelRotation: { x: 0, y: 0, z: 0},
        modelYOffset: -1,
        // NEW: Health and ragdoll settings
        health: 4,                    // More durable
        knockbackForce: 1.5,
        ragdollKnockbackForce: 18,
        isGrounded: true
    },
    fast_box: {
        name: "Fast Box", 
        size: 1.5, 
        modelPath: "models/speedbot.glb",
        useModel: true,
        color: { r: 1, g: 0.5, b: 0 },
        mass: 0.7, restitution: 0.3, friction: 0.5,
        linearDamping: 0.4, angularDamping: 0.4,
        modelRotation: { x: 0, y: 0, z: 0 },
        modelYOffset: -1,
        // NEW: Health and ragdoll settings
        health: 2,                    // Fragile
        knockbackForce: 2.5,          // Lighter but more knockback
        ragdollKnockbackForce: 12,
        isGrounded: true
    },
    tank: {
        name: "Tank", 
        size: 3, 
        modelPath: "models/tankbot.glb",
        useModel: true,
        color: { r: 0.3, g: 0.3, b: 1 },
        mass: 3, restitution: 0.2, friction: 0.8,
        linearDamping: 0.9, angularDamping: 0.9,
        modelRotation: { x: 0, y: 0, z: 0 },
        modelYOffset: -1.5,
        // NEW: Health and ragdoll settings
        health: 6,                    // Very durable
        knockbackForce: 1,            // Heavy, barely moves
        ragdollKnockbackForce: 20,
        isGrounded: true
    }
};

function createEnemy(scene, ground, playerMesh, position, type) {
    type = type || "box";
    var config = ENEMY_TYPES[type] || ENEMY_TYPES.box;
    
    // Load model from .blend file
    if (config.useModel && config.modelPath) {
        return loadEnemyModel(scene, config, position, playerMesh)
            .then(function(enemy) {
                // Initialize AI behavior for the enemy
                if (enemy && playerMesh) {
                    console.log("begin");
                    initializeEnemyAI(enemy, playerMesh, scene);
                }
                return enemy;
            })
            .catch(function(error) {
                // Fallback to primitive enemy if model fails to load
                console.warn("Failed to load model, using primitive instead:", error);
                var enemy = createPrimitiveEnemy(scene, config, position, playerMesh);
                if (enemy && playerMesh) {
                    initializeEnemyAI(enemy, playerMesh, scene);
                }
                return enemy;
            });
    } else {
        // Fallback to primitive shapes
        var enemy = createPrimitiveEnemy(scene, config, position, playerMesh);
        
        console.log(playerMesh);
        console.log(enemy);
        // ADDED: Initialize AI behavior for the enemy
        if (enemy && playerMesh) {
            console.log("begin");
            initializeEnemyAI(enemy, playerMesh, scene);
        }
        
        return Promise.resolve(enemy);
    }
}

 
async function loadEnemyModel(scene, config, position, playerMesh) {
    try {
        // Split the path into directory and filename
        const lastSlash = config.modelPath.lastIndexOf('/');
        let baseDir = '';
        let filename = config.modelPath;
        
        if (lastSlash !== -1) {
            baseDir = config.modelPath.substring(0, lastSlash + 1);
            filename = config.modelPath.substring(lastSlash + 1);
        }
        
        console.log("Loading model - baseDir:", baseDir, "filename:", filename);
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", baseDir, filename, scene);
        const modelRoot = result.meshes[0];
        
        // Get all geometry meshes
        const geometryMeshes = result.meshes.filter(m => m.getTotalVertices() > 0);
        
        // 1. COMPUTE BOUNDS BEFORE parenting (in world space as loaded)
        let minY = Infinity, maxY = -Infinity;
        geometryMeshes.forEach(mesh => {
            const bbox = mesh.getBoundingInfo().boundingBox;
            minY = Math.min(minY, bbox.minimumWorld.y);
            maxY = Math.max(maxY, bbox.maximumWorld.y);
        });
        const height = maxY - minY;
        const halfHeight = height / 2;

        const physicsParent = new BABYLON.Mesh("enemy_container", scene);
        
        // Position the parent at the vertical center of the enemy's body
        physicsParent.position = position.clone();
        physicsParent.position.y += halfHeight; 

        modelRoot.parent = physicsParent;

        // Center the model Root so that its geometric center is at the Parent's 0,0,0
        modelRoot.position.y = -(minY + halfHeight); 

        // Create the shape from the MESH, but apply it to the PARENT
        const shape = new BABYLON.PhysicsShapeConvexHull(geometryMeshes[0], scene);
        
        const aggregate = new BABYLON.PhysicsAggregate(
            physicsParent,
            shape,
            { mass: config.mass, restitution: config.restitution },
            scene
        );
        
 
        // 3. Attach the model to our container
        modelRoot.parent = physicsParent;
 
        // 4. OFFSET: Position the model relative to the parent
        modelRoot.position.y = -(minY + halfHeight) + (config.modelYOffset || 0);
        
        // 5. APPLY ROTATION: Use per-model rotation settings
        if (config.modelRotation) {
            modelRoot.rotation = new BABYLON.Vector3(
                config.modelRotation.x || 0,
                config.modelRotation.y || 0,
                config.modelRotation.z || 0
            );
        }
 

 
        physicsParent.physicsAggregate = aggregate;
        
        // Configure physics damping
        var body = aggregate.body;
        body.setLinearDamping(config.linearDamping);
        body.setAngularDamping(config.angularDamping);
        
        // Grounded enemies: set to STATIC motion type (immovable)
    if (config.isGrounded) {
        const isMeleeChaser = config.name === "Tank" || config.name === "Fast Box";
        if (!isMeleeChaser) {
            body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
        }
    }
 
        // 7. Initialize enemy-specific properties
        physicsParent.currentHealth = config.health;
        physicsParent.maxHealth = config.health;
        physicsParent.isDead = false;
        physicsParent.enemyConfig = config;
        physicsParent.geometryMeshes = geometryMeshes;
        physicsParent.modelRoot = modelRoot;
 
        // 8. Set material properties to prevent shader errors
        geometryMeshes.forEach(m => {
            m.enemyRoot = physicsParent; 
            if (m.material) {
                m.material.maxSimultaneousLights = 4;
            }
        });
 
        return physicsParent;
    } catch (e) {
        console.error("Error loading enemy model:", e);
    }
}
 
function createPrimitiveEnemy(scene, config, position, playerMesh) {
    var enemy;
    
    if (config.meshType === "sphere") {
        enemy = BABYLON.MeshBuilder.CreateSphere("enemy", { diameter: config.size }, scene);
    } else {
        enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: config.size }, scene);
    }
    
    // Set position
    if (position) {
        if (position instanceof BABYLON.Vector3) {
            enemy.position = position;
        } else {
            enemy.position = new BABYLON.Vector3(position.x, position.y, position.z);
        }
    } else {
        enemy.position = new BABYLON.Vector3(5, 1, 5);
    }
    
    // Create material
    var matName = "enemyMat_" + config.name + "_" + Math.random().toString(36).substr(2, 5);
    var enemyMaterial = new BABYLON.StandardMaterial(matName, scene);
    enemyMaterial.diffuseColor = new BABYLON.Color3(config.color.r, config.color.g, config.color.b);
    enemyMaterial.maxSimultaneousLights = 4; // Limit lights
    enemy.material = enemyMaterial;
    
    // Setup physics
    setupEnemyPhysics(scene, enemy, config);
    
    // Initialize enemy-specific properties
    enemy.currentHealth = config.health;
    enemy.maxHealth = config.health;
    enemy.isDead = false;
    enemy.enemyConfig = config;
    
    // Interaction handler for kicking
    enemy.onInteract = function(pMesh) {
        var dist = BABYLON.Vector3.Distance(pMesh.position, enemy.position);
        if (dist < 3) {
            var dir = enemy.position.subtract(pMesh.position).normalize();
            var body = enemy.physicsAggregate.body;
            body.applyImpulse(dir.scale(10), enemy.getAbsolutePosition());
        }
    };

        if (config.isGrounded) {
        const isMeleeChaser = config.name === "Tank" || config.name === "Fast Box";
        if (!isMeleeChaser) {
            body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
        }
    }
    
    // Store enemy type
    enemy.enemyType = config.name;
    
    return enemy;
}
 
function setupEnemyPhysics(scene, enemy, config) {
    // Use appropriate shape type based on grounded state
    var shapeType = config.useModel 
        ? BABYLON.PhysicsShapeType.CONVEX_HULL
        : (config.meshType === "sphere" 
            ? BABYLON.PhysicsShapeType.SPHERE 
            : BABYLON.PhysicsShapeType.BOX);
    
    // Always create with mass, but set motion type to control behavior
    var enemyAggregate = new BABYLON.PhysicsAggregate(
        enemy,
        shapeType,
        {
            mass: config.mass,
            restitution: config.restitution,
            friction: config.friction
        },
        scene
    );
    
    enemy.physicsAggregate = enemyAggregate;
    var body = enemyAggregate.body;
    
    // Configure physics damping
    body.setLinearDamping(config.linearDamping);
    body.setAngularDamping(config.angularDamping);
    
    // Grounded enemies: set to STATIC motion type (immovable)
    if (config.isGrounded) {
        body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
    }
}
 
function spawnHitDecal(position, normal, parentMesh) {
    const decal = BABYLON.MeshBuilder.CreateDecal("hitDecal", parentMesh, {
        position: position,
        normal: normal,
        size: new BABYLON.Vector3(3.6, 3.6, 3.6)
    });
    const mat = new BABYLON.StandardMaterial("hitMat", scene);
    // 🔁 Replace this path with your actual gif path
    mat.diffuseTexture = new BABYLON.Texture("../img/spark.gif", scene);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.zOffset = -2;
    decal.material = mat;
    
    // Fade + remove after 600ms
    let elapsed = 0;
    const fadeObserver = scene.onBeforeRenderObservable.add(() => {
        elapsed += engine.getDeltaTime();
        const t = Math.min(elapsed / 600, 1);
        mat.alpha = 1 - t;
        if (t >= 1) {
            scene.onBeforeRenderObservable.remove(fadeObserver);
            decal.dispose();
            mat.dispose();
        }
    });
}
 
/**
 * Converts a grounded enemy to ragdoll physics on death
 * Uses a velocity-based approach instead of changing physics bodies
 */
function enableRagdoll(enemy, scene) {
    if (enemy.isDead) return;
    
    enemy.isDead = true;
    enemy.isRagdolling = true;
    const currentPos = enemy.absolutePosition.clone();
    
    // Keep the body but change its motion type to dynamic
    if (enemy.physicsAggregate && enemy.physicsAggregate.body) {
        var body = enemy.physicsAggregate.body;
        
        // Change from static to dynamic
        body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);

        body.setTargetTransform(currentPos, enemy.rotationQuaternion || BABYLON.Quaternion.Identity());
        
        // Set mass for dynamic behavior
        var config = enemy.enemyConfig;
        body.setMassProperties({ mass: config.mass });
        
        // Set damping for ragdoll effect
        body.setLinearDamping(config.linearDamping);
        body.setAngularDamping(config.angularDamping);
    }
    
    // Create dead material
    var deadMat = new BABYLON.StandardMaterial("deadMat_" + Math.random(), scene);
    deadMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    
    // Visual indicator: change color to grey/dark
    // For primitives - change the enemy mesh itself
    if (enemy.material) {
        enemy.material = deadMat;
    }
    
    // For loaded models - change all child meshes
    if (enemy.getChildren) {
        var children = enemy.getChildren();
        children.forEach(child => {
            if (child instanceof BABYLON.Mesh) {
                child.material = deadMat;
            }
        });
    }
    
    // Also update geometryMeshes if they exist
    if (enemy.geometryMeshes) {
        enemy.geometryMeshes.forEach(mesh => {
            mesh.material = deadMat;
        });
    }
}
 
/**
 * Damage an enemy and check if it should die
 */
function damageEnemy(enemy, scene, impactPoint, impactDirection) {
    if (enemy.isDead) return;
    
    var config = enemy.enemyConfig;
    enemy.currentHealth--;
    
    console.log(enemy.enemyType + " hit! Health: " + enemy.currentHealth + "/" + enemy.maxHealth);
    
    // Apply knockback (reduced while alive)
    if (enemy.physicsAggregate && enemy.physicsAggregate.body) {
        // For grounded enemies, apply a small local effect
        // We'll create a visual knockback by rotating slightly
        if (config.isGrounded && !enemy.isDead) {
            // Small rotation knockback for grounded enemies
            var rotationAxis = new BABYLON.Vector3(0, 1, 0);
            var rotationAmount = config.knockbackForce * 0.1;
            enemy.rotation.z += (Math.random() - 0.5) * rotationAmount;
            enemy.rotation.x += (Math.random() - 0.5) * rotationAmount * 0.5;
        }
    }
    
    // Check if enemy should die
    if (enemy.currentHealth <= 0) {
        enableRagdoll(enemy, scene);
        
        // IMPORTANT: Delay knockback to let Havok process the motion type change
        // Without this delay, the impulse is applied to the static body
        setTimeout(function() {
                if (enemy.physicsAggregate && enemy.physicsAggregate.body) {
                    var knockbackDir = impactDirection.clone().normalize();
                    knockbackDir.y += 0.5; 
                    var impulseForce = knockbackDir.scale(config.ragdollKnockbackForce);
                    enemy.physicsAggregate.body.applyImpulse(impulseForce, impactPoint);
                }
                
                // Start the timer to sink and disappear
                handleDeathSequence(enemy, scene);
            }, 10);
    }
}

function handleDeathSequence(enemy, scene) {
    // 1. Wait for 2 seconds while they ragdoll on the ground
    setTimeout(() => {
        if (!enemy || enemy.isDisposed()) return;

        // 2. Disable physics collisions so it can fall through the floor
        if (enemy.physicsAggregate) {
            // We disable the body so it no longer reacts to gravity or collisions
            enemy.physicsAggregate.body.disablePreStep = false; 
            enemy.physicsAggregate.dispose(); 
            enemy.physicsAggregate = null;
        }

        // 3. Create a "Sink and Disposed" animation
        let sinkSpeed = 0.02;
        let opacity = 1.0;

        const sinkObserver = scene.onBeforeRenderObservable.add(() => {
            // Move the mesh down
            enemy.position.y -= sinkSpeed;
            sinkSpeed += 0.005; // Accelerate the fall
            
            // Fade out the model
            opacity -= 0.02;
            
            // Apply opacity to all children (for loaded models)
            enemy.getChildMeshes().forEach(m => {
                if (m.material) {
                    m.material.alpha = opacity;
                    m.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                }
            });

            // 4. Final Cleanup: Remove from scene once it's deep enough or invisible
            if (opacity <= 0 || enemy.position.y < -10) {
                scene.onBeforeRenderObservable.remove(sinkObserver);
                
                // Remove from the room's enemy list so it doesn't break room transitions
                const room = mapManager.getCurrentRoom();
                if (room && room.enemies) {
                    const index = room.enemies.indexOf(enemy);
                    if (index > -1) room.enemies.splice(index, 1);
                }

                enemy.dispose();
            }
        });
    }, 2000); // The 2-second "Death Throe" delay
}


