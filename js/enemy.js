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
        scene
    );

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
        }
    });

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