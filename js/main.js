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
var gameStarted = false;
var gamePaused = false;
var playerHealth = 50;
var maxHealth = 50;
var lastDamageTime = 0;
var damageCooldown = 500; // 0.5 seconds of invincibility after hit
var isGameOver = false;

// ===========================
// MENU STATE & FUNCTIONS
// ===========================
async function startGameFromMenu() {
    // Hide menu, show loading screen
    document.getElementById("main-menu").classList.add("hidden");
    document.getElementById("loading-screen").classList.remove("hidden");

    if (!gameStarted) {
        gameStarted = true;
        await startGame();
    } else {
        // Already initialised – just resume
        if (engine) engine.runRenderLoop(function() { scene.render(); });
    }

    // Hide loading screen, show game UI
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("myCanvas").classList.remove("hidden");
    document.getElementById("crosshair").classList.remove("hidden");
    document.getElementById("hud").classList.remove("hidden");
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

// ===========================
// ESC PAUSE TOGGLE
// ===========================
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
// GAME INITIALIZATION
// ===========================
async function startGame() {
    havokInstance = await HavokPhysics({
        locateFile: function(path) { return "https://cdn.babylonjs.com/havok/" + path; }
    });
    canvas = document.querySelector("#myCanvas");
    engine = new BABYLON.Engine(canvas, true);
    scene = createScene();

    // We need to wait for the scene components to be ready
    // Map building is async, but createScene itself is sync. 
    // Let's refactor slightly to wait for mapManager.initRandomMap
    await mapManager.initRandomMap();

    // Spawn player at the start room's center
    var spawnPos = mapManager.getSpawnPosition();
    _teleportPlayer(spawnPos);

    engine.runRenderLoop(function() { scene.render(); });
    window.addEventListener("resize", function() { engine.resize(); });
}

// ===========================
// SCENE CREATION
// ===========================
function createScene() {
    var sc = new BABYLON.Scene(engine);
    sc.clearColor = new BABYLON.Color3(0.05, 0.05, 0.1);

    // ---------- PHYSICS ----------
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

    window.playerAggregate = playerAggregate;

    var gravityVector = new BABYLON.Vector3(0, -18.0, 0);
    sc.enablePhysics(gravityVector, hk);
    var body = playerAggregate.body;
    body.setAngularDamping(100);
    body.setMassProperties({ mass: 1, inertia: new BABYLON.Vector3(0, 0, 0) });
    body.setLinearDamping(0.9);

    // ---------- MAP MANAGER ----------
    mapManager = new MapManager(sc);
    // (Note: initRandomMap is now called in startGame and awaited)

    // ---------- CAMERA ----------
    camera = new BABYLON.FreeCamera("fpsCamera", playerMesh.position.clone(), sc);
    camera.parent = playerMesh;
    camera.position = new BABYLON.Vector3(0, 1.7, 0);
    camera.attachControl(canvas, true);

    // ---------- HUD ----------
    hudMapName = document.getElementById("hud-map");
    hudRooms = document.getElementById("hud-rooms");
    hudEnemies = document.getElementById("hud-enemies");
    _updateHUD();

    // ---------- SHOOTING ----------
    window.addEventListener("click", function() {
        if (document.pointerLockElement === canvas) _shoot(sc);
    });

    // ---------- INPUT ----------
    window.addEventListener("keydown", function(e) { inputMap[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup", function(e) { inputMap[e.key.toLowerCase()] = false; });

    // ---------- JUMP ----------
    window.addEventListener("keydown", function(e) {
if (e.code === "Space") {
            var vel = body.getLinearVelocity();
            if (Math.abs(vel.y) < 0.1) { // Loosened threshold slightly for higher gravity
                // Increased impulse from 5 to 8 to compensate for heavier gravity
                body.applyImpulse(new BABYLON.Vector3(0, 8, 0), playerMesh.getAbsolutePosition());
            }
        }
    });

    // ---------- POINTER LOCK ----------
    canvas.addEventListener("click", function() { canvas.requestPointerLock(); });

    // ---------- KICK (E) ----------
    window.addEventListener("keydown", function(e) {
        if (e.key.toLowerCase() === "e") {
            var room = mapManager.getCurrentRoom();
            if (room) room.enemies.forEach(function(en) { if (en.onInteract) en.onInteract(playerMesh); });
        }
    });

    // ---------- LIGHTING ----------
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), sc);
    light.intensity = 0.3;

    // ---------- GAME LOOP ----------
    sc.onBeforeRenderObservable.add(function() {
        if (gamePaused) return;

        // Movement
        var moveDir = BABYLON.Vector3.Zero();
        if (inputMap["z"] || inputMap["w"]) moveDir.z += 1;
        if (inputMap["s"]) moveDir.z -= 1;
        if (inputMap["q"] || inputMap["a"]) moveDir.x -= 1;
        if (inputMap["d"]) moveDir.x += 1;

        var body = playerAggregate.body;
    var currentVel = body.getLinearVelocity();

        if (currentVel.y < 0) {
            // Player is falling - apply an extra downward force (Gravity Multiplier)
            // Adjust 15 to make the fall even faster
            body.applyForce(new BABYLON.Vector3(0, -15, 0), playerMesh.getAbsolutePosition());
        }

        if (!moveDir.equals(BABYLON.Vector3.Zero())) {
            moveDir.normalize();
            var forward = camera.getDirection(BABYLON.Axis.Z);
            var right = camera.getDirection(BABYLON.Axis.X);
            var wishDir = forward.scale(moveDir.z).add(right.scale(moveDir.x));
            wishDir.y = 0;
            wishDir.normalize();
            var speed = inputMap["shift"] ? 15 : 9;
            var cv = body.getLinearVelocity();
            body.setLinearVelocity(new BABYLON.Vector3(wishDir.x * speed, cv.y, wishDir.z * speed));
        }

        // Update HUD, lights and room clearing status based on player position
        _updateHUD();
        mapManager.updateProximityLights();
        mapManager.checkCurrentRoomCleared();

 
        // ADDED: Update enemy AI
        var deltaTime = engine.getDeltaTime() / 1000; // Convert to seconds
        updateAllEnemyAI(deltaTime, mapManager);
    });

    return sc;
}

// ===========================
// HELPER FUNCTIONS
// ===========================
function _teleportPlayer(pos) {
    if (!playerAggregate) return;
    var body = playerAggregate.body;
    body.setLinearVelocity(BABYLON.Vector3.Zero());
    body.setTargetTransform(pos, BABYLON.Quaternion.Identity());
    playerMesh.position.copyFrom(pos);
}

function _shoot(sc) {
    var ray = sc.createPickingRay(canvas.width / 2, canvas.height / 2, BABYLON.Matrix.Identity(), camera);
    var hit = sc.pickWithRay(ray);
    
    if (hit.hit && hit.pickedMesh) {
        spawnHitDecal(hit.pickedPoint, hit.getNormal(true), hit.pickedMesh);
        
        // Find the enemy root
        let target = hit.pickedMesh.enemyRoot || (hit.pickedMesh.physicsAggregate ? hit.pickedMesh : null);
        
        if (target && target.enemyConfig) {
            // This is an enemy - damage it!
            damageEnemy(target, sc, hit.pickedPoint, ray.direction);
        }
    }
}

function _updateHUD() {
    updateHPUI();
    if (hudMapName) hudMapName.textContent = mapManager.getMapName();
    if (hudRooms) hudRooms.textContent = mapManager.getCurrentRoomName();
    if (hudEnemies) hudEnemies.textContent = mapManager.getAliveEnemiesCount();
}

function takeDamage(amount) {
    const now = Date.now();
    if (now - lastDamageTime < damageCooldown || playerHealth <= 0) return;

    playerHealth -= amount;
    lastDamageTime = now;

    // Trigger Flash Effect
    const flash = document.getElementById("damage-flash");
    flash.style.opacity = "1";
    setTimeout(() => { flash.style.opacity = "0"; }, 150);

    updateHPUI();

    if (playerHealth <= 0) {
        gameOver();
    }
}

function updateHPUI() {
    const fill = document.getElementById("hp-bar-fill");
    const text = document.getElementById("hp-text");
    const percentage = (playerHealth / maxHealth) * 100;

    fill.style.width = Math.max(0, percentage) + "%";
    text.innerText = Math.max(0, playerHealth) + " / " + maxHealth + " HP";
}

function gameOver() {
    if (isGameOver) return; // Prevent multiple triggers
    isGameOver = true;
    gamePaused = true;

    // 1. Stop the game engine and AI
    if (engine) engine.stopRenderLoop();

    // 2. Release the mouse pointer
    document.exitPointerLock();

    // 3. Hide HUD and Crosshair
    document.getElementById("crosshair").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");

    // 4. Trigger a permanent red flash effect
    const flash = document.getElementById("damage-flash");
    if (flash) {
        flash.style.transition = "opacity 1s ease";
        flash.style.backgroundColor = "rgba(139, 0, 0, 0.6)";
        flash.style.opacity = "1";
    }

    // 5. Show the Game Over screen
    const goScreen = document.getElementById("game-over-screen");
    if (goScreen) {
        goScreen.classList.remove("hidden");
    }
}