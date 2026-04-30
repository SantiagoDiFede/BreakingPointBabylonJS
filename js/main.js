// ===========================
// MENU STATE
// ===========================
var gameStarted = false;
var gamePaused  = false;

function startGameFromMenu() {
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("myCanvas").classList.remove("hidden");
    document.getElementById("crosshair").classList.remove("hidden");
    document.getElementById("hud").classList.remove("hidden");

    if (!gameStarted) {
        gameStarted = true;
        startGame();
    } else {
        // Already initialised – just resume
        if (engine) engine.runRenderLoop(function() { scene.render(); });
    }
}

function toggleControls() {
    var panel = document.getElementById("controls-panel");
    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
    }
}

function quitGame() {
    // In browser we can only close tabs opened by script; redirect to a blank page
    window.close();
    // Fallback: show a message
    document.getElementById("menu-subtitle").textContent = "FERMEZ CET ONGLET POUR QUITTER";
}

function resumeGame() {
    gamePaused = false;
    document.getElementById("pause-menu").classList.add("hidden");
    document.getElementById("crosshair").classList.remove("hidden");
    document.getElementById("hud").classList.remove("hidden");
    if (engine) engine.runRenderLoop(function() { scene.render(); });
    // Re-acquire pointer lock
    var canvas = document.getElementById("myCanvas");
    if (canvas) canvas.requestPointerLock();
}

function returnToMenu() {
    gamePaused = false;
    document.exitPointerLock();
    document.getElementById("pause-menu").classList.add("hidden");
    document.getElementById("crosshair").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("main-menu").classList.remove("hidden");
    if (engine) engine.stopRenderLoop();
}

// ESC toggles pause
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && gameStarted) {
        if (!gamePaused) {
            gamePaused = true;
            document.exitPointerLock();
            if (engine) engine.stopRenderLoop();
            document.getElementById("crosshair").classList.add("hidden");
            document.getElementById("hud").classList.add("hidden");
            document.getElementById("pause-menu").classList.remove("hidden");
        } else {
            resumeGame();
        }
    }
});

// ===========================
// GAME GLOBALS
// ===========================
var havokInstance;
var canvas, engine, scene;
var camera;
var playerMesh;
var playerAggregate;
var mapManager;
var inputMap = {};

var hudMapName, hudRooms;

async function startGame() {
    havokInstance = await HavokPhysics({
        locateFile: function(path) { return "https://cdn.babylonjs.com/havok/" + path; }
    });
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene  = createScene();

    engine.runRenderLoop(function() { scene.render(); });
}

function createScene() {
    var sc = new BABYLON.Scene(engine);
    sc.clearColor = new BABYLON.Color3(0.05, 0.05, 0.1);

    var hk = new BABYLON.HavokPlugin(true, havokInstance);
    sc.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);

    // ---------- PLAYER ----------
    playerMesh = BABYLON.MeshBuilder.CreateCapsule("player", { height: 2, radius: 0.5 }, sc);
    playerMesh.position.y = 2;
    playerMesh.isVisible = false;

    playerAggregate = new BABYLON.PhysicsAggregate(
        playerMesh, BABYLON.PhysicsShapeType.CAPSULE,
        { mass: 1, restitution: 0, friction: 1 }, sc
    );
    var body = playerAggregate.body;
    body.setAngularDamping(100);
    body.setMassProperties({ mass: 1, inertia: new BABYLON.Vector3(0, 0, 0) });
    body.setLinearDamping(0.9);

    // ---------- MAP ----------
    mapManager = new MapManager(sc);
    mapManager.initRandomMap();
    _teleportPlayer(new BABYLON.Vector3(0, 2, 0));

    // ---------- CAMERA ----------
    camera = new BABYLON.FreeCamera("fpsCamera", playerMesh.position.clone(), sc);
    camera.parent = playerMesh;
    camera.position = new BABYLON.Vector3(0, 1.7, 0);
    camera.attachControl(canvas, true);

    // ---------- HUD ----------
    hudMapName = document.getElementById("hud-map");
    hudRooms   = document.getElementById("hud-rooms");
    _updateHUD();

    // ---------- SHOOTING ----------
    window.addEventListener("click", function() {
        if (document.pointerLockElement === canvas) _shoot(sc);
    });

    // ---------- INPUT ----------
    window.addEventListener("keydown", function(e) { inputMap[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup",   function(e) { inputMap[e.key.toLowerCase()] = false; });

    // Jump
    window.addEventListener("keydown", function(e) {
        if (e.code === "Space") {
            var vel = body.getLinearVelocity();
            if (Math.abs(vel.y) < 0.05) {
                body.applyImpulse(new BABYLON.Vector3(0, 5, 0), playerMesh.getAbsolutePosition());
            }
        }
    });

    // Pointer lock on canvas click
    canvas.addEventListener("click", function() { canvas.requestPointerLock(); });

    // Kick (E)
    window.addEventListener("keydown", function(e) {
        if (e.key.toLowerCase() === "e") {
            var room = mapManager.getCurrentRoom();
            if (room) room.enemies.forEach(function(en) { if (en.onInteract) en.onInteract(playerMesh); });
        }
    });

    // Light
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), sc);
    light.intensity = 0.3;

    // Transition cooldown
    var cooldown = false;

    // ---------- GAME LOOP ----------
    sc.onBeforeRenderObservable.add(function() {
        if (gamePaused) return;

        // Movement
        var moveDir = BABYLON.Vector3.Zero();
        if (inputMap["z"] || inputMap["w"]) moveDir.z += 1;
        if (inputMap["s"]) moveDir.z -= 1;
        if (inputMap["q"] || inputMap["a"]) moveDir.x -= 1;
        if (inputMap["d"]) moveDir.x += 1;

        if (!moveDir.equals(BABYLON.Vector3.Zero())) {
            moveDir.normalize();
            var forward = camera.getDirection(BABYLON.Axis.Z);
            var right   = camera.getDirection(BABYLON.Axis.X);
            var wishDir = forward.scale(moveDir.z).add(right.scale(moveDir.x));
            wishDir.y = 0;
            wishDir.normalize();
            var speed = inputMap["shift"] ? 10 : 6;
            var cv = body.getLinearVelocity();
            body.setLinearVelocity(new BABYLON.Vector3(wishDir.x * speed, cv.y, wishDir.z * speed));
        }

        // Door detection
        if (!cooldown) {
            var room = mapManager.getCurrentRoom();
            if (room) {
                room.meshes.forEach(function(mesh) {
                    if (mesh.isDoor) {
                        var dist = BABYLON.Vector3.Distance(playerMesh.position, mesh.position);
                        if (dist < 2.5) {
                            cooldown = true;
                            mapManager.transitionToRoom(mesh.doorDirection);
                            _spawnPlayerFromDoor(mesh.doorDirection);
                            _updateHUD();
                            setTimeout(function() { cooldown = false; }, 800);
                        }
                    }
                });
            }
        }
    });

    window.addEventListener("resize", function() { engine.resize(); });
    return sc;
}

// ===========================
// HELPERS
// ===========================
function _teleportPlayer(pos) {
    var body = playerAggregate.body;
    body.setLinearVelocity(BABYLON.Vector3.Zero());
    body.setTargetTransform(pos, BABYLON.Quaternion.Identity());
    playerMesh.position.copyFrom(pos);
}

function _spawnPlayerFromDoor(dir) {
    var room = mapManager.getCurrentRoom();
    var offset = 6;
    var pos = new BABYLON.Vector3(0, 2, 0);
    if (dir === "north") pos.z = -(room.depth / 2 - offset);
    if (dir === "south") pos.z =  (room.depth / 2 - offset);
    if (dir === "east")  pos.x = -(room.width / 2 - offset);
    if (dir === "west")  pos.x =  (room.width / 2 - offset);
    _teleportPlayer(pos);
}

function _shoot(sc) {
    var ray = sc.createPickingRay(canvas.width / 2, canvas.height / 2, BABYLON.Matrix.Identity(), camera);
    var hit = sc.pickWithRay(ray);
    if (hit.pickedMesh && hit.pickedMesh.name === "enemy" && hit.pickedMesh.PhysicsAggregate) {
        hit.pickedMesh.PhysicsAggregate.body.applyImpulse(
            ray.direction.normalize().scale(15), hit.pickedPoint
        );
    }
}

function _updateHUD() {
    if (hudMapName) hudMapName.textContent = mapManager.getMapName();
    if (hudRooms)   hudRooms.textContent   = mapManager.getVisitedCount() + " / " + mapManager.getRoomCount();
}
