

// Enemy type definitions - now with model paths
var ENEMY_TYPES = {
    box: {
        name: "Box", 
        size: 2, 
        modelPath: "/models/rob1.glb",  // Path to your .glb file
        useModel: true,
        color: { r: 1, g: 0, b: 0 },
        mass: 1, restitution: 0.5, friction: 0.5,
        linearDamping: 0.7, angularDamping: 0.7
    },
    sphere: {
        name: "Sphere", 
        size: 2.5, 
        modelPath: "/models/rob1.glb",  // Path to your .glb file
        useModel: true,
        color: { r: 0.8, g: 0, b: 0.8 },
        mass: 0.8, restitution: 0.7, friction: 0.3,
        linearDamping: 0.5, angularDamping: 0.5
    },
    fast_box: {
        name: "Fast Box", 
        size: 1.5, 
        modelPath: "/models/rob1.glb",  // Path to your .glb file
        useModel: true,
        color: { r: 1, g: 0.5, b: 0 },
        mass: 0.7, restitution: 0.3, friction: 0.5,
        linearDamping: 0.4, angularDamping: 0.4
    },
    tank: {
        name: "Tank", 
        size: 3, 
        modelPath: "/models/rob1.glb",  // Path to your .glb file
        useModel: true,
        color: { r: 0.3, g: 0.3, b: 1 },
        mass: 3, restitution: 0.2, friction: 0.8,
        linearDamping: 0.9, angularDamping: 0.9
    }
};

function createEnemy(scene, ground, playerMesh, position, type) {
    type = type || "box";
    var config = ENEMY_TYPES[type] || ENEMY_TYPES.box;
    
    // Load model from .blend file
    if (config.useModel && config.modelPath) {
        return loadEnemyModel(scene, config, position, playerMesh);
    } else {
        // Fallback to primitive shapes
        return createPrimitiveEnemy(scene, config, position, playerMesh);
    }
}

async function loadEnemyModel(scene, config, position, playerMesh) {
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", config.modelPath, scene);
        const modelRoot = result.meshes[0];
        
        // 1. Create a "Physics Container" (the actual object that moves)
        const physicsParent = new BABYLON.Mesh("enemy_container", scene);
        physicsParent.position = position instanceof BABYLON.Vector3 ? 
                                 position.clone() : 
                                 new BABYLON.Vector3(position.x, 3, position.z);

        // 2. Attach the model to our container
        modelRoot.parent = physicsParent;

        // 3. OFFSET: Lift the model inside the container
        // If your model is 2 units tall, lifting it by 1 unit puts feet at the origin
        modelRoot.position = new BABYLON.Vector3(0, config.size / 2, 0);
        
        // 4. FIX ROTATION: Flip the model if it's upside down
        modelRoot.rotation = new BABYLON.Vector3(0, Math.PI, 0); 

        // 5. PHYSICS: Apply to the PARENT container
        const geometryMeshes = result.meshes.filter(m => m.getTotalVertices() > 0);
        const shape = new BABYLON.PhysicsShapeConvexHull(geometryMeshes[0], scene);
        
        const aggregate = new BABYLON.PhysicsAggregate(
            physicsParent,
            shape,
            { mass: config.mass, restitution: config.restitution },
            scene
        );

        physicsParent.physicsAggregate = aggregate;

        // 6. Tagging for your shoot function
        geometryMeshes.forEach(m => {
            m.enemyRoot = physicsParent; 
        });

        return physicsParent;
    } catch (e) {
        console.error(e);
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
    enemy.material = enemyMaterial;
    
    // Setup physics
    setupEnemyPhysics(scene, enemy, config);
    
    // Interaction handler for kicking
    enemy.onInteract = function(pMesh) {
        var dist = BABYLON.Vector3.Distance(pMesh.position, enemy.position);
        if (dist < 3) {
            var dir = enemy.position.subtract(pMesh.position).normalize();
            var body = enemy.physicsAggregate.body;
            body.applyImpulse(dir.scale(10), enemy.getAbsolutePosition());
        }
    };
    
    // Store enemy type
    enemy.enemyType = config.name;
    
    return enemy;
}

function setupEnemyPhysics(scene, enemy, config) {
    // For imported models, use CONVEX_HULL for better physics on complex shapes
    var shapeType = config.useModel 
        ? BABYLON.PhysicsShapeType.CONVEX_HULL  // Good for complex models
        : (config.meshType === "sphere" 
            ? BABYLON.PhysicsShapeType.SPHERE 
            : BABYLON.PhysicsShapeType.BOX);
    
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
    
    // Configure physics damping
    var body = enemyAggregate.body;
    body.setLinearDamping(config.linearDamping);
    body.setAngularDamping(config.angularDamping);
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
    mat.zOffset = -2;                      // prevents z-fighting with the surface
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