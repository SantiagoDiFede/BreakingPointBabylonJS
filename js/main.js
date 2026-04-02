


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

    function createScene() {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.8);

        // ✅ Havok physics
        const hk = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), hk);

        // --------------------
        // GROUND
        // --------------------
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 6000,
            height: 6000
        }, scene);

        const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture("../img/weezer.jpg", scene);
        groundMaterial.diffuseTexture.uScale = 800;
        groundMaterial.diffuseTexture.vScale = 800;
        ground.material = groundMaterial;

        // ✅ PhysicsAggregate (static)
        new BABYLON.PhysicsAggregate(
            ground,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 },
            scene
        );

        // --------------------
        // PLAYER
        // --------------------
        playerMesh = BABYLON.MeshBuilder.CreateCapsule("player", {
            height: 2,
            radius: 0.5
        }, scene);

        playerMesh.isVisible = false;

        // ✅ PhysicsAggregate (dynamic)
        playerAggregate = new BABYLON.PhysicsAggregate(
            playerMesh,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, restitution: 0, friction: 1 },
            scene
        );

        const body = playerAggregate.body;

        // Prevent tipping over
        body.setAngularDamping(100);
        body.setMassProperties({
            mass: 1,
            inertia: new BABYLON.Vector3(0, 0, 0)  // ← empêche le basculement
        });

        // Smooth movement
        body.setLinearDamping(0.9);

        // --------------------
        // ENEMY
        // --------------------
        const enemy = createEnemy(scene, ground, playerMesh);

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

                // Simple grounded check
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

        // Light
        const light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        light.intensity = 0.6;

        // --------------------
        // MOVEMENT LOOP
        // --------------------
        scene.onBeforeRenderObservable.add(() => {
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
        });

        return scene;
    }

    window.addEventListener("resize", () => {
        engine.resize();
    });

