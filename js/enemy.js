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