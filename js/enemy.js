// Enemy type definitions - extensible for future enemy types
var ENEMY_TYPES = {
    box: {
        name: "Box", size: 2, meshType: "box",
        color: { r: 1, g: 0, b: 0 },
        mass: 1, restitution: 0.5, friction: 0.5,
        linearDamping: 0.7, angularDamping: 0.7
    },
    sphere: {
        name: "Sphere", size: 2.5, meshType: "sphere",
        color: { r: 0.8, g: 0, b: 0.8 },
        mass: 0.8, restitution: 0.7, friction: 0.3,
        linearDamping: 0.5, angularDamping: 0.5
    },
    fast_box: {
        name: "Fast Box", size: 1.5, meshType: "box",
        color: { r: 1, g: 0.5, b: 0 },
        mass: 0.7, restitution: 0.3, friction: 0.5,
        linearDamping: 0.4, angularDamping: 0.4
    },
    tank: {
        name: "Tank", size: 3, meshType: "box",
        color: { r: 0.3, g: 0.3, b: 1 },
        mass: 3, restitution: 0.2, friction: 0.8,
        linearDamping: 0.9, angularDamping: 0.9
    }
};

function createEnemy(scene, ground, playerMesh) {
    const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 2 }, scene);
    enemy.position = new BABYLON.Vector3(5, 1, 5); // ✅ size is 2, so half = 1

    const enemyMaterial = new BABYLON.StandardMaterial("enemyMat", scene);
    enemyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    enemy.material = enemyMaterial;

    const enemyAggregate = new BABYLON.PhysicsAggregate(
        enemy,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 1, restitution: 0.5, friction: 0.5 },


function createEnemy(scene, ground, playerMesh, position, type) {
    type = type || "box";
    var config = ENEMY_TYPES[type] || ENEMY_TYPES.box;

    var enemy;
    if (config.meshType === "sphere") {
        enemy = BABYLON.MeshBuilder.CreateSphere("enemy", { diameter: config.size }, scene);
    } else {
        enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: config.size }, scene);
    }

    if (position) {
        if (position instanceof BABYLON.Vector3) {
            enemy.position = position;
        } else {
            enemy.position = new BABYLON.Vector3(position.x, position.y, position.z);
        }
    } else {
        enemy.position = new BABYLON.Vector3(5, 1, 5);
    }

    var matName = "enemyMat_" + type + "_" + Math.random().toString(36).substr(2, 5);
    var enemyMaterial = new BABYLON.StandardMaterial(matName, scene);
    enemyMaterial.diffuseColor = new BABYLON.Color3(config.color.r, config.color.g, config.color.b);
    enemy.material = enemyMaterial;

    var shapeType = (config.meshType === "sphere")
        ? BABYLON.PhysicsShapeType.SPHERE
        : BABYLON.PhysicsShapeType.BOX;

    var enemyAggregate = new BABYLON.PhysicsAggregate(
        enemy, shapeType,
        { mass: config.mass, restitution: config.restitution, friction: config.friction },
        scene
    );
    enemy.PhysicsAggregate = enemyAggregate;

    // ✅ Store aggregate on mesh so shoot() can access it
    enemy.physicsAggregate = enemyAggregate;

    const body = enemyAggregate.body;
    body.setLinearDamping(0.7);
    body.setAngularDamping(0.7);

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "e") {
            const distanceToEnemy = BABYLON.Vector3.Distance(
                playerMesh.position,
                enemy.position
            );
            if (distanceToEnemy < 3) {
                const kickDirection = enemy.position
                    .subtract(playerMesh.position)
                    .normalize();
                body.applyImpulse(
                    kickDirection.scale(10),
                    enemy.getAbsolutePosition()
                );
            }
    var body = enemyAggregate.body;
    body.setLinearDamping(config.linearDamping);
    body.setAngularDamping(config.angularDamping);

    enemy.onInteract = function(pMesh) {
        var dist = BABYLON.Vector3.Distance(pMesh.position, enemy.position);
        if (dist < 3) {
            var dir = enemy.position.subtract(pMesh.position).normalize();
            body.applyImpulse(dir.scale(10), enemy.getAbsolutePosition());
        }
    };

    enemy.enemyType = type;
    return enemy;
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
