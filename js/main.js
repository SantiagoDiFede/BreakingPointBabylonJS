


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
        scene.enablePhysics(new BABYLON.Vector3(0, -25, 0), hk);
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

        playerAggregate = new BABYLON.PhysicsAggregate(
            playerMesh,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, restitution: 0, friction: 0 }, // friction: 0 — let us control sliding
            scene
        );

        const body = playerAggregate.body;

        body.setAngularDamping(100);
        body.setMassProperties({
            mass: 1,
            inertia: new BABYLON.Vector3(0, 0, 0)
        });

        body.setLinearDamping(0); // ← no drag, we handle deceleration manually
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

            // ---------- hit effect ----------

            spawnHitDecal(hit.pickedPoint, hit.getNormal(true), hit.pickedMesh);
            
            if (hit.pickedMesh.name === "enemy") {
                const forceDirection = ray.direction.normalize();

                const knockback = new BABYLON.Vector3(
                    forceDirection.x,
                    0,
                    forceDirection.z
                ).normalize().scale(4);

                const body = hit.pickedMesh.physicsAggregate.body;

               body.setLinearVelocity(new BABYLON.Vector3(0, 0.001, 0));
                body.applyImpulse(knockback, hit.pickedMesh.getAbsolutePosition());
            }
        }

        // --------------------
        // INPUT
        // --------------------
        window.addEventListener("keydown", (e) => inputMap[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", (e) => inputMap[e.key.toLowerCase()] = false);



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
        // DOUBLE JUMP  (single listener — replaces both old Space listeners)
        // --------------------
        let jumpCount = 0;
        const maxJumps = 2;

        window.addEventListener("keydown", (e) => {
            if (e.code === "Space") {
                const velocity = body.getLinearVelocity();
                const isGrounded = Math.abs(velocity.y) < 0.15;

                if (isGrounded) jumpCount = 0;

                if (jumpCount < maxJumps) {
                    if (jumpCount > 0) {
                        // Snap vertical velocity to zero for a snappy double-jump
                        body.setLinearVelocity(
                            new BABYLON.Vector3(velocity.x, 0, velocity.z)
                        );
                    }
                    body.applyImpulse(new BABYLON.Vector3(0, 9, 0), playerMesh.getAbsolutePosition());
                    jumpCount++;
                }
            }
        });

        // --------------------
        // MOVEMENT LOOP  (Quake-style acceleration → preserves momentum)
        // --------------------
        const MAX_SPEED    = 14;
        const SPRINT_SPEED = 22;
        const ACCEL        = 120;
        const AIR_ACCEL    = 55;
        const FRICTION     = 18;

        scene.onBeforeRenderObservable.add(() => {
            const dt = engine.getDeltaTime() / 1000;
            const velocity = body.getLinearVelocity();
            const isGrounded = Math.abs(velocity.y) < 0.15;

            let moveDir = BABYLON.Vector3.Zero();
            if (inputMap["z"] || inputMap["w"]) moveDir.z += 1;
            if (inputMap["s"])                  moveDir.z -= 1;
            if (inputMap["q"] || inputMap["a"]) moveDir.x -= 1;
            if (inputMap["d"])                  moveDir.x += 1;

            const wishSpeed = inputMap["shift"] ? SPRINT_SPEED : MAX_SPEED;

            if (!moveDir.equals(BABYLON.Vector3.Zero())) {
                moveDir.normalize();
                const forward = camera.getDirection(BABYLON.Axis.Z);
                const right   = camera.getDirection(BABYLON.Axis.X);

                const wishDir = forward.scale(moveDir.z).add(right.scale(moveDir.x));
                wishDir.y = 0;
                wishDir.normalize();

                // Quake-style additive acceleration: only add velocity in the wish direction
                // if we're not already at/past max speed in that direction
                const currentHorizontal = new BABYLON.Vector3(velocity.x, 0, velocity.z);
                const projectedSpeed = BABYLON.Vector3.Dot(currentHorizontal, wishDir);
                const addSpeed = wishSpeed - projectedSpeed;

                if (addSpeed > 0) {
                    const accel = isGrounded ? ACCEL : AIR_ACCEL;
                    const accelAmount = Math.min(accel * dt * wishSpeed, addSpeed);
                    const accelVec = wishDir.scale(accelAmount);

                    body.setLinearVelocity(new BABYLON.Vector3(
                        velocity.x + accelVec.x,
                        velocity.y,
                        velocity.z + accelVec.z
                    ));
                }
            } else if (isGrounded) {
                // Apply friction when grounded and no input
                const hVel = new BABYLON.Vector3(velocity.x, 0, velocity.z);
                const speed = hVel.length();
                if (speed > 0) {
                    const drop = speed * FRICTION * dt;
                    const newSpeed = Math.max(speed - drop, 0) / speed;
                    body.setLinearVelocity(new BABYLON.Vector3(
                        velocity.x * newSpeed,
                        velocity.y,
                        velocity.z * newSpeed
                    ));
                }
            }
        });

        return scene;
    }

    window.addEventListener("resize", () => {
        engine.resize();
    });

