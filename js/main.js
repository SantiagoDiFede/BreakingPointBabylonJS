


    let havokInstance;
    let canvas, engine, scene;
    let camera;
    let playerMesh;
    let playerAggregate;

    // Input tracking
    const inputMap = {};

    window.onload = startGame;

    async function startGame() {
        havokInstance = await HavokPhysics({
        locateFile: (path) => `https://cdn.babylonjs.com/havok/${path}`
        });
        canvas = document.querySelector("#myCanvas");
        engine = new BABYLON.Engine(canvas, true);
        scene = createScene();

        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    let currentRoom = null;
    const roomTemplates = [
        {
            name: "Simple Room",
            width: 20,
            depth: 20,
            doors: { north: true, south: true, east: true, west: true },
            enemies: []
        },
        {
            name: "Enemy Room 1",
            width: 125,
            depth: 125,
            doors: { north: true, south: true, east: true, west: true },
            enemies: [
                { type: "box", position: new BABYLON.Vector3(25, 1, 25) },
                { type: "box", position: new BABYLON.Vector3(-25, 1, -25) }
            ]
        },
        {
            name: "Enemy Room 2",
            width: 150,
            depth: 100,
            doors: { north: true, south: true, east: true, west: true },
            enemies: [
                { type: "box", position: new BABYLON.Vector3(0, 1, 35) },
                { type: "box", position: new BABYLON.Vector3(40, 1, 0) },
                { type: "box", position: new BABYLON.Vector3(-40, 1, 0) }
            ]
        }
    ];

    function createScene() {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // ✅ Havok physics
        const hk = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);

        // --------------------
        // PLAYER
        // --------------------
        playerMesh = BABYLON.MeshBuilder.CreateCapsule("player", {
            height: 2,
            radius: 0.5
        }, scene);
        playerMesh.position.y = 2;
        playerMesh.isVisible = false;

        // ✅ PhysicsAggregate (dynamic)
        playerAggregate = new BABYLON.PhysicsAggregate(
            playerMesh,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, restitution: 0, friction: 1 },
            scene
        );

        const body = playerAggregate.body;
        body.setAngularDamping(100);
        body.setMassProperties({
            mass: 1,
            inertia: new BABYLON.Vector3(0, 0, 0)
        });
        body.setLinearDamping(0.9);

        // --------------------
        // INITIAL ROOM
        // --------------------
        loadRoom(roomTemplates[0]);

        function loadRoom(template) {
            if (currentRoom) {
                currentRoom.dispose();
            }

            currentRoom = new Room(scene, template.width, template.depth, template.doors, template.enemies);
            currentRoom.create();
            
            // Default center position
            body.setLinearVelocity(BABYLON.Vector3.Zero());
            const targetPos = new BABYLON.Vector3(0, 2, 0);
            body.setTargetTransform(targetPos, BABYLON.Quaternion.Identity());
            playerMesh.position.copyFrom(targetPos);
        }

        function transitionToNewRoom(doorDirection) {
            console.log("Emptying room and spawning new one from direction:", doorDirection);
            
            const randomIndex = Math.floor(Math.random() * (roomTemplates.length - 1)) + 1;
            const nextTemplate = roomTemplates[randomIndex];
            
            loadRoom(nextTemplate);

            // Reposition player based on entry door (reverse of doorDirection)
            let offset = 4; // spawn slightly further from the wall
            let targetPos = new BABYLON.Vector3(0, 2, 0);

            if (doorDirection === "north") targetPos.z = -currentRoom.depth / 2 + offset;
            if (doorDirection === "south") targetPos.z = currentRoom.depth / 2 - offset;
            if (doorDirection === "east") targetPos.x = -currentRoom.width / 2 + offset;
            if (doorDirection === "west") targetPos.x = currentRoom.width / 2 - offset;

            body.setLinearVelocity(BABYLON.Vector3.Zero());
            body.setTargetTransform(targetPos, BABYLON.Quaternion.Identity());
            playerMesh.position.copyFrom(targetPos);
        }

        // --------------------
        // CAMERA
        // --------------------
        camera = new BABYLON.FreeCamera("fpsCamera", playerMesh.position.clone(), scene);
        camera.parent = playerMesh;
        camera.position = new BABYLON.Vector3(0, 1.7, 0);
        camera.attachControl(canvas, true);

        // --------------------
        // SHOOTING
        // --------------------
        window.addEventListener("click", () => {
            if (document.pointerLockElement === canvas) {
                shoot();
            }
        });

        function shoot() {
            const ray = scene.createPickingRay(
                canvas.width / 2,
                canvas.height / 2,
                BABYLON.Matrix.Identity(),
                camera
            );

            const hit = scene.pickWithRay(ray);

            if (hit.pickedMesh && hit.pickedMesh.name === "enemy") {
                const forceDirection = ray.direction.normalize();

                hit.pickedMesh.PhysicsAggregate.applyImpulse(
                    forceDirection.scale(15),
                    hit.pickedPoint
                );
            }
        }

        // --------------------
        // INPUT
        // --------------------
        window.addEventListener("keydown", (e) => inputMap[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", (e) => inputMap[e.key.toLowerCase()] = false);

        // Jump
        window.addEventListener("keydown", (e) => {
            if (e.code === "Space") {
                const velocity = body.getLinearVelocity();
                if (Math.abs(velocity.y) < 0.05) {
                    body.applyImpulse(
                        new BABYLON.Vector3(0, 5, 0),
                        playerMesh.getAbsolutePosition()
                    );
                }
            }
        });

        // Pointer lock
        canvas.addEventListener("click", () => canvas.requestPointerLock());

        // Kick/interaction
        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "e") {
                if (currentRoom) {
                    currentRoom.enemies.forEach(enemy => {
                        if (enemy.onInteract) enemy.onInteract(playerMesh);
                    });
                }
            }
        });

        // Light
        const light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        light.intensity = 0.3;

        // --------------------
        // MOVEMENT & TRANSITION LOOP
        // --------------------
        scene.onBeforeRenderObservable.add(() => {
            // Movement
            let moveDir = BABYLON.Vector3.Zero();
            if (inputMap["z"] || inputMap["w"]) moveDir.z += 1;
            if (inputMap["s"]) moveDir.z -= 1;
            if (inputMap["q"] || inputMap["a"]) moveDir.x -= 1;
            if (inputMap["d"]) moveDir.x += 1;

            if (!moveDir.equals(BABYLON.Vector3.Zero())) {
                moveDir.normalize();
                const forward = camera.getDirection(BABYLON.Axis.Z);
                const right = camera.getDirection(BABYLON.Axis.X);
                const wishDir = forward.scale(moveDir.z).add(right.scale(moveDir.x));
                wishDir.y = 0;
                wishDir.normalize();
                const speed = inputMap["shift"] ? 10 : 6;
                const currentVelocity = body.getLinearVelocity();
                body.setLinearVelocity(
                    new BABYLON.Vector3(
                        wishDir.x * speed,
                        currentVelocity.y,
                        wishDir.z * speed
                    )
                );
            }

            // Door detection (Check if player is near a trigger)
            currentRoom.meshes.forEach(mesh => {
                if (mesh.isDoor) {
                    const dist = BABYLON.Vector3.Distance(playerMesh.position, mesh.position);
                    if (dist < 2.5) {
                        transitionToNewRoom(mesh.doorDirection);
                    }
                }
            });
        });

        return scene;
    }

    window.addEventListener("resize", () => {
        engine.resize();
    });
