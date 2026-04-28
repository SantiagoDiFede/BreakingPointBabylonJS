function createEnemy(scene, ground, playerMesh, position = null) {
    // Create enemy
    const enemy = BABYLON.MeshBuilder.CreateBox("enemy", { size: 2 }, scene);
    
    if (position) {
        enemy.position = position;
    } else {
        enemy.position = new BABYLON.Vector3(5, 0.5, 5);
        enemy.position.y = ground.position.y + (enemy.scaling.y / 2) + 1.01;
    }

    // Material
    const enemyMaterial = new BABYLON.StandardMaterial("enemyMat", scene);
    enemyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    enemy.material = enemyMaterial;

    // ✅ Physics avec la bonne API Havok
    const enemyAggregate = new BABYLON.PhysicsAggregate(
        enemy,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 1, restitution: 0.5, friction: 0.5 },
        scene
    );
    enemy.PhysicsAggregate = enemyAggregate;

    // ✅ Damping via le body
    const body = enemyAggregate.body;
    body.setLinearDamping(0.7);
    body.setAngularDamping(0.7);

    // Kick interaction
    enemy.onInteract = (pMesh) => {
        const distanceToEnemy = BABYLON.Vector3.Distance(
            pMesh.position,
            enemy.position
        );
        if (distanceToEnemy < 3) {
            const kickDirection = enemy.position
                .subtract(pMesh.position)
                .normalize();
            body.applyImpulse(
                kickDirection.scale(10),
                enemy.getAbsolutePosition()
            );
        }
    };

    return enemy;
}