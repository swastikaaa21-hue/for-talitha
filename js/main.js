/* ========================================================
   🌹 WEBSITE UCAPAN SELAMAT — MAIN SCRIPT
   Three.js + GSAP — 3D scenes, animasi & interaksi
   Untuk: Talitha Salsabila Maulidiyah
   ======================================================== */

(function () {
    'use strict';

    /* ============================================================
       CONFIGURATION
       ============================================================ */
    const COLORS = {
        maroon: 0x800020,
        deepMaroon: 0x4A0012,
        softPink: 0xFFB6C1,
        blushPink: 0xF8C8D4,
        gold: 0xD4AF37,
        goldLight: 0xF0D98C,
        warmWhite: 0xFFF8F0,
        cream: 0xFFFAF3,
        lavender: 0xC9A0DC,
        sunsetPink: 0xFF6B8A,
        sunsetOrange: 0xFF8C69,
        darkBg: 0x1A0A10,
        red: 0xCC0000,
        white: 0xFFFFFF,
        pinkWall: 0xF5D0D6,
    };

    const SECTION_COUNT = 9;
    const SECTION_SPACING = 30;

    // Camera positions for each section [pos, lookAt target]
    const CAMERA_DATA = [
        { pos: [0, 2, 8], look: [0, 0.5, 0] },   // 0: Amplop
        { pos: [0, -28, 5], look: [0, -30, 0] },   // 1: Ucapan Utama
        { pos: [0, -58, 6], look: [0, -60, 0] },   // 2: Surat
        { pos: [0, -88, 8], look: [0, -90, 0] },   // 3: Polaroid
        { pos: [0, -118, 7], look: [0, -120, 0] },   // 4: Film Strip
        { pos: [0, -148, 6], look: [0, -150, 0] },   // 5: Time Counter
        { pos: [0, -178, 6], look: [0, -180, 0] },   // 6: Pop-up Card
        { pos: [0, -208, 5], look: [0, -210, 0] },   // 7: Penutup
        { pos: [0, -238, 5], look: [0, -240, 0] },   // 8: Reply Box
    ];

    /* ============================================================
       GLOBAL STATE
       ============================================================ */
    let renderer, scene, camera, clock;
    let currentSection = 0;
    let isTransitioning = false;
    let envelopeOpened = false;
    let mouseNDC = new THREE.Vector2();
    let raycaster = new THREE.Raycaster();

    // Current camera lookAt target (for smooth interpolation)
    let cameraLookTarget = new THREE.Vector3(...CAMERA_DATA[0].look);

    // Section groups & references
    let sectionGroups = [];
    let envelopeRef = {};
    let polaroidRefs = [];
    let sealClickable = null;

    // Particle arrays
    let heartParticles = [];
    let sparkleParticles = [];

    /* ============================================================
       INITIALIZATION
       ============================================================ */
    function init() {
        clock = new THREE.Clock();

        // Renderer
        const canvas = document.getElementById('three-canvas');
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(COLORS.darkBg, 0.004);

        // Camera
        camera = new THREE.PerspectiveCamera(
            55,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        camera.position.set(...CAMERA_DATA[0].pos);
        camera.lookAt(...CAMERA_DATA[0].look);

        // Lighting
        setupLighting();

        // Build all 9 sections
        buildSection1_Envelope();
        buildSection2_Greeting();
        buildSection3_LoveLetter();
        buildSection4_Polaroid();
        buildSection5_FilmStrip();
        buildSection6_TimeCounter();
        buildSection7_PopupCard();
        buildSection8_Closing();
        buildSection9_Reply();

        // Create floating stars (CSS)
        createCSSHearts();

        // Events
        window.addEventListener('resize', onResize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);
        window.addEventListener('touchstart', onTouch, { passive: false });

        // Navigation buttons
        document.getElementById('btn-prev').addEventListener('click', () => navigateTo(currentSection - 1));
        document.getElementById('btn-next').addEventListener('click', () => navigateTo(currentSection + 1));

        // Reply Button (Section 9)
        const sendReplyBtn = document.getElementById('send-reply-btn');
        if(sendReplyBtn) {
            sendReplyBtn.addEventListener('click', () => {
                const text = document.getElementById('talitha-reply').value;
                const status = document.getElementById('reply-status');
                if(text.trim() === '') {
                    status.textContent = 'Pesan tidak boleh kosong ya sayang...';
                    return;
                }
                status.textContent = 'Membuka Aplikasi Email...';
                
                const subject = encodeURIComponent("Pesan untuk Swastika 💖");
                const body = encodeURIComponent("Halo Cheetah Amrullah Swastika sayang 💖\n\n" + text);
                window.location.href = `mailto:swastikaaa@gmail.com?subject=${subject}&body=${body}`;
                
                setTimeout(() => {
                    status.textContent = 'Pesan disiapkan untuk Email-ku! 💖';
                    document.getElementById('talitha-reply').value = '';
                }, 2000);
            });
        }

        // Fullscreen logic
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    });
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                }
            });

            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    fullscreenBtn.textContent = 'out';
                } else {
                    fullscreenBtn.textContent = 'full';
                }
            });
        }

        // Section dots
        document.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.dataset.section);
                if (idx === 0 && !envelopeOpened) return;
                navigateTo(idx);
            });
        });

        // Cursor sparkle effect
        setupCursorSparkle();



        // Entrance animation
        if (envelopeRef.group && envelopeRef.skyMat && envelopeRef.oceanMat) {
            envelopeRef.group.position.y = -5;
            envelopeRef.group.scale.set(0.1, 0.1, 0.1);

            gsap.to(envelopeRef.skyMat, { opacity: 1, duration: 2, ease: "power2.inOut" });
            gsap.to(envelopeRef.oceanMat, { opacity: 0.85, duration: 2, ease: "power2.inOut", delay: 0.5 });
            gsap.to(envelopeRef.group.position, { y: 0.5, duration: 2, ease: "back.out(1.5)", delay: 1 });
            gsap.to(envelopeRef.group.scale, { x: 1, y: 1, z: 1, duration: 2, ease: "back.out(1.5)", delay: 1 });
        }

        const titleMail = document.querySelector('.title-mail');
        const hintText = document.querySelector('.hint-text');
        if (titleMail && hintText) {
            gsap.fromTo(titleMail, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5, delay: 2.2, ease: "power2.out" });
            gsap.fromTo(hintText, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5, delay: 2.7, ease: "power2.out" });
        }

        // Setup Password Modal
        setupPasswordModal();

        // Start animation loop
        onResize();
        animate();
    }

    /* ============================================================
       LIGHTING
       ============================================================ */
    function setupLighting() {
        // Warm ambient
        const ambient = new THREE.AmbientLight(0xFFF5EB, 0.45);
        scene.add(ambient);

        // Main directional (warm key light)
        const dirLight = new THREE.DirectionalLight(0xFFD4A0, 0.7);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        scene.add(dirLight);

        // Soft fill light
        const fillLight = new THREE.DirectionalLight(0xFFB6C1, 0.3);
        fillLight.position.set(-3, 5, 5);
        scene.add(fillLight);

        // Point lights per section
        for (let i = 0; i < SECTION_COUNT; i++) {
            const y = -i * SECTION_SPACING;
            const pointLight = new THREE.PointLight(0xFFD4A0, 0.5, 20);
            pointLight.position.set(0, y + 2, 5);
            scene.add(pointLight);
        }
    }

    /* ============================================================
       UTILITY: Create canvas texture for placeholders
       ============================================================ */
    function createPlaceholderTex(text, w, h, bg1, bg2) {
        const canvas = document.createElement('canvas');
        canvas.width = w || 512;
        canvas.height = h || 512;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, bg1 || '#F8C8D4');
        grad.addColorStop(1, bg2 || '#C9A0DC');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Star decoration
        ctx.font = `${Math.floor(canvas.height * 0.15)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('⭐', canvas.width / 2, canvas.height * 0.35);

        ctx.font = `${Math.floor(canvas.height * 0.06)}px "Segoe UI", sans-serif`;
        ctx.fillStyle = 'rgba(128,0,32,0.7)';
        ctx.fillText(text, canvas.width / 2, canvas.height * 0.6);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    /* ============================================================
       UTILITY: Create heart/star shape
       ============================================================ */
    function createHeartShape(s) {
        const shape = new THREE.Shape();
        const x = 0, y = 0;
        shape.moveTo(x, y + s * 0.5);
        shape.bezierCurveTo(x, y + s * 0.5, x - s * 0.1, y + s * 0.7, x - s * 0.5, y + s * 0.7);
        shape.bezierCurveTo(x - s, y + s * 0.7, x - s, y + s * 0.25, x - s, y + s * 0.25);
        shape.bezierCurveTo(x - s, y, x - s * 0.5, y - s * 0.4, x, y - s * 0.7);
        shape.bezierCurveTo(x + s * 0.5, y - s * 0.4, x + s, y, x + s, y + s * 0.25);
        shape.bezierCurveTo(x + s, y + s * 0.25, x + s, y + s * 0.7, x + s * 0.5, y + s * 0.7);
        shape.bezierCurveTo(x + s * 0.1, y + s * 0.7, x, y + s * 0.5, x, y + s * 0.5);
        return shape;
    }

    /* ============================================================
       SECTION 1: AMPLOP KEJUTAN (Envelope with Wax Seal)
       ============================================================ */
    function buildSection1_Envelope() {
        const group = new THREE.Group();
        group.position.set(0, 0, 0);

        // --- SUNSET SKY BACKGROUND ---
        const skyGeo = new THREE.PlaneGeometry(80, 40);
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 1024;
        skyCanvas.height = 512;
        const skyCtx = skyCanvas.getContext('2d');
        const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
        skyGrad.addColorStop(0, '#2D1B4E');
        skyGrad.addColorStop(0.3, '#6B3A7D');
        skyGrad.addColorStop(0.5, '#C9627E');
        skyGrad.addColorStop(0.7, '#F0946A');
        skyGrad.addColorStop(1, '#FFC1A0');
        skyCtx.fillStyle = skyGrad;
        skyCtx.fillRect(0, 0, 1024, 512);

        // Soft clouds
        skyCtx.fillStyle = 'rgba(255, 200, 220, 0.15)';
        for (let i = 0; i < 6; i++) {
            const cx = Math.random() * 1024;
            const cy = 100 + Math.random() * 200;
            const rx = 60 + Math.random() * 120;
            const ry = 20 + Math.random() * 30;
            skyCtx.beginPath();
            skyCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            skyCtx.fill();
        }

        const skyTex = new THREE.CanvasTexture(skyCanvas);
        const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, opacity: 0 });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.position.set(0, 8, -15);
        group.add(sky);
        envelopeRef.skyMat = skyMat;

        // --- OCEAN WAVES ---
        const oceanGeo = new THREE.PlaneGeometry(80, 30, 80, 40);
        const oceanMat = new THREE.MeshStandardMaterial({
            color: 0x3D6B8E,
            roughness: 0.4,
            metalness: 0.2,
            transparent: true,
            opacity: 0,
        });
        envelopeRef.oceanMat = oceanMat;
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.rotation.x = -Math.PI / 2.3;
        ocean.position.set(0, -3, -5);
        group.add(ocean);
        envelopeRef.ocean = ocean;

        // --- ENVELOPE BODY ---
        const envGroup = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(3.5, 2.5, 0.12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xAA0015,
            roughness: 0.65,
            metalness: 0.05,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        envGroup.add(body);

        // Inside
        const insideGeo = new THREE.PlaneGeometry(3.3, 2.3);
        const insideMat = new THREE.MeshStandardMaterial({
            color: 0xDD4455,
            roughness: 0.8,
        });
        const inside = new THREE.Mesh(insideGeo, insideMat);
        inside.position.z = 0.065;
        envGroup.add(inside);

        // Flap
        const flapShape = new THREE.Shape();
        flapShape.moveTo(-1.75, 0);
        flapShape.lineTo(0, -1.4);
        flapShape.lineTo(1.75, 0);
        flapShape.closePath();
        const flapGeo = new THREE.ShapeGeometry(flapShape);
        const flapMat = new THREE.MeshStandardMaterial({
            color: 0x990010,
            roughness: 0.6,
            metalness: 0.05,
            side: THREE.DoubleSide,
        });
        const flap = new THREE.Mesh(flapGeo, flapMat);
        flap.castShadow = true;

        const flapPivot = new THREE.Group();
        flapPivot.position.set(0, 1.25, 0.06);
        flap.position.set(0, 0, 0);
        flapPivot.add(flap);
        envGroup.add(flapPivot);
        envelopeRef.flapPivot = flapPivot;

        // --- WAX SEAL (Emote Love Berapi ❤️‍🔥) ---
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 256;
        emojiCanvas.height = 256;
        const eCtx = emojiCanvas.getContext('2d');
        eCtx.font = '160px sans-serif';
        eCtx.textAlign = 'center';
        eCtx.textBaseline = 'middle';
        eCtx.fillText('❤️‍🔥', 128, 140);

        const emojiTex = new THREE.CanvasTexture(emojiCanvas);
        emojiTex.needsUpdate = true;

        const sealGeo = new THREE.PlaneGeometry(1.0, 1.0);
        const sealMat = new THREE.MeshBasicMaterial({
            map: emojiTex,
            transparent: true,
            side: THREE.DoubleSide
        });
        const seal = new THREE.Mesh(sealGeo, sealMat);
        seal.position.set(0, 0, 0.15);
        seal.name = 'waxSeal';
        envGroup.add(seal);
        sealClickable = seal;
        envelopeRef.seal = seal;

        envGroup.position.set(0, 0.5, 0);
        group.add(envGroup);
        envelopeRef.group = envGroup;

        // Sparkle particles
        const sparkleGeo = new THREE.BufferGeometry();
        const sparkleCount = 60;
        const sparklePositions = new Float32Array(sparkleCount * 3);
        for (let i = 0; i < sparkleCount; i++) {
            sparklePositions[i * 3] = (Math.random() - 0.5) * 12;
            sparklePositions[i * 3 + 1] = Math.random() * 8 - 2;
            sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
        sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
        const sparkleMat = new THREE.PointsMaterial({
            color: COLORS.goldLight,
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });
        const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
        group.add(sparkles);
        envelopeRef.sparkles = sparkles;

        scene.add(group);
        sectionGroups.push(group);
    }

    /* ============================================================
       SECTION 2: UCAPAN UTAMA (Pure Greeting & Elegance)
       ============================================================ */
    function buildSection2_Greeting() {
        const group = new THREE.Group();
        const baseY = -SECTION_SPACING;
        group.position.set(0, baseY, 0);

        const greetingGroup = new THREE.Group();
        greetingGroup.position.set(0, 0, -2); // Push back so text is clearly in front

        const goldMat = new THREE.MeshStandardMaterial({
            color: COLORS.gold,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.8
        });

        // 1. Giant Elegant Golden Rings
        const ringGeo1 = new THREE.TorusGeometry(3.5, 0.03, 16, 100);
        const ring1 = new THREE.Mesh(ringGeo1, goldMat);
        ring1.rotation.x = Math.PI / 3;
        greetingGroup.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(3.2, 0.02, 16, 100);
        const ring2 = new THREE.Mesh(ringGeo2, goldMat);
        ring2.rotation.y = Math.PI / 4;
        greetingGroup.add(ring2);

        // 2. Floating Golden Stardust
        const stardustGeo = new THREE.BufferGeometry();
        const stardustCount = 200;
        const positions = new Float32Array(stardustCount * 3);
        const stardustBasePositions = new Float32Array(stardustCount * 3);

        for (let i = 0; i < stardustCount; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 5;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            stardustBasePositions[i * 3] = x;
            stardustBasePositions[i * 3 + 1] = y;
            stardustBasePositions[i * 3 + 2] = z;
        }
        stardustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const stardustMat = new THREE.PointsMaterial({
            color: COLORS.goldLight,
            size: 0.05,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const stardust = new THREE.Points(stardustGeo, stardustMat);
        greetingGroup.add(stardust);

        group.add(greetingGroup);

        // Lighting
        const accentLight = new THREE.PointLight(0xFFD4A0, 1.5, 15);
        accentLight.position.set(0, 0, 2);
        group.add(accentLight);

        // Save refs for animation
        envelopeRef.greetingRings = [ring1, ring2];
        envelopeRef.greetingStardust = {
            points: stardust,
            basePositions: stardustBasePositions
        };

        scene.add(group);
        sectionGroups.push(group);
    }

    /* ============================================================
       SECTION 3: SURAT UCAPAN
       ============================================================ */
    function buildSection3_LoveLetter() {
        const group = new THREE.Group();
        const baseY = -2 * SECTION_SPACING;
        group.position.set(0, baseY, 0);

        // Deep maroon background
        const bgGeo = new THREE.PlaneGeometry(25, 16);
        const bgMat = new THREE.MeshStandardMaterial({
            color: COLORS.maroon,
            roughness: 0.95,
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.z = -3;
        group.add(bg);

        // Floating 3D stars/hearts
        const heartMat = new THREE.MeshStandardMaterial({
            color: COLORS.sunsetPink,
            roughness: 0.5,
            transparent: true,
            opacity: 0.4,
        });

        for (let i = 0; i < 15; i++) {
            const hs = createHeartShape(0.06 + Math.random() * 0.08);
            const hgeo = new THREE.ExtrudeGeometry(hs, {
                depth: 0.05,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelSegments: 2,
            });
            const heart = new THREE.Mesh(hgeo, heartMat.clone());
            heart.position.set(
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 4
            );
            heart.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            heart.userData.floatSpeed = 0.3 + Math.random() * 0.5;
            heart.userData.floatOffset = Math.random() * Math.PI * 2;
            group.add(heart);
            heartParticles.push({ mesh: heart, baseY: heart.position.y });
        }

        const warmLight = new THREE.PointLight(0xFF8866, 0.6, 15);
        warmLight.position.set(0, 0, 4);
        group.add(warmLight);

        scene.add(group);
        sectionGroups.push(group);
    }

    /* ============================================================
       SECTION 4: GALERI POLAROID
       ============================================================ */
    function buildSection4_Polaroid() {
        const group = new THREE.Group();
        const baseY = -3 * SECTION_SPACING;
        group.position.set(0, baseY, 0);

        // Pink brick wall background
        const wallGeo = new THREE.PlaneGeometry(22, 16);
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 512;
        wallCanvas.height = 384;
        const wCtx = wallCanvas.getContext('2d');
        wCtx.fillStyle = '#F5D0D6';
        wCtx.fillRect(0, 0, 512, 384);
        const brickH = 18, brickW = 40;
        for (let row = 0; row < 384 / brickH; row++) {
            for (let col = 0; col < 512 / brickW + 1; col++) {
                const offset = row % 2 === 0 ? 0 : brickW / 2;
                const x = col * brickW - offset;
                const y = row * brickH;
                wCtx.fillStyle = `rgba(${220 + Math.random() * 20}, ${180 + Math.random() * 20}, ${190 + Math.random() * 15}, 0.3)`;
                wCtx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
            }
        }
        const wallTex = new THREE.CanvasTexture(wallCanvas);
        const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.z = -3;
        group.add(wall);

        // 6 Polaroid frames
        const gridPositions = [
            [-3.5, 2, 0], [0, 2, 0], [3.5, 2, 0],
            [-3.5, -2, 0], [0, -2, 0], [3.5, -2, 0],
        ];
        const rotations = [-0.05, 0.03, -0.02, 0.04, -0.03, 0.02];

        gridPositions.forEach((pos, i) => {
            const polaroid = createPolaroid(i + 1);
            polaroid.position.set(pos[0], pos[1], pos[2]);
            polaroid.rotation.z = rotations[i];
            polaroid.userData.basePos = { x: pos[0], y: pos[1], z: pos[2] };
            polaroid.userData.baseRot = rotations[i];
            polaroid.name = `polaroid_${i}`;
            group.add(polaroid);
            polaroidRefs.push(polaroid);
        });

        // Connecting lines
        const lineMat = new THREE.LineBasicMaterial({ color: COLORS.maroon, transparent: true, opacity: 0.4 });
        for (let i = 0; i < gridPositions.length - 1; i++) {
            const points = [
                new THREE.Vector3(...gridPositions[i]),
                new THREE.Vector3(...gridPositions[i + 1]),
            ];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(lineGeo, lineMat);
            group.add(line);
        }

        // Heart decorations
        const heartDeco = createHeartShape(0.12);
        const heartGeo = new THREE.ShapeGeometry(heartDeco);
        const heartMat = new THREE.MeshStandardMaterial({ color: COLORS.maroon, side: THREE.DoubleSide });
        [[-1.7, 0, 0.1], [1.7, 0, 0.1], [0, 0, 0.1]].forEach(pos => {
            const h = new THREE.Mesh(heartGeo, heartMat);
            h.position.set(pos[0], pos[1], pos[2]);
            h.scale.set(1.5, 1.5, 1);
            group.add(h);
        });

        scene.add(group);
        sectionGroups.push(group);
    }

    function createPolaroid(index) {
        const polaroidGroup = new THREE.Group();

        const borderGeo = new THREE.BoxGeometry(2.2, 2.8, 0.05);
        const borderMat = new THREE.MeshStandardMaterial({
            color: COLORS.white,
            roughness: 0.8,
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.castShadow = true;
        polaroidGroup.add(border);

        const photoGeo = new THREE.PlaneGeometry(1.8, 1.8);
        const photoTex = createPlaceholderTex(
            `Foto ${index}`, 512, 512,
            ['#F8C8D4', '#E8B4C8', '#D4A0BC', '#C99BB0', '#B88FA8', '#A883A0'][index - 1] || '#F8C8D4',
            ['#C9A0DC', '#B090CC', '#A080BC', '#9070AC', '#80609C', '#70508C'][index - 1] || '#C9A0DC'
        );
        const photoMat = new THREE.MeshStandardMaterial({ map: photoTex });
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.position.set(0, 0.25, 0.03);
        polaroidGroup.add(photo);

        return polaroidGroup;
    }

    /* ============================================================
       SECTION 5: FILM STRIP
       ============================================================ */
    function buildSection5_FilmStrip() {
        const group = new THREE.Group();
        const baseY = -4 * SECTION_SPACING;
        group.position.set(0, baseY, 0);

        // Dark background
        const bgGeo = new THREE.PlaneGeometry(25, 16);
        const bgMat = new THREE.MeshStandardMaterial({
            color: 0x1A0508,
            roughness: 0.95,
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.z = -3;
        group.add(bg);

        // Spotlights
        const spotlight1 = new THREE.SpotLight(0xFFD4A0, 1.2, 20, Math.PI / 6, 0.5);
        spotlight1.position.set(-3, 5, 5);
        spotlight1.target.position.set(-3, 0, 0);
        group.add(spotlight1);
        group.add(spotlight1.target);

        const spotlight2 = new THREE.SpotLight(0xFFB6C1, 1.0, 20, Math.PI / 6, 0.5);
        spotlight2.position.set(3, 5, 5);
        spotlight2.target.position.set(3, 0, 0);
        group.add(spotlight2);
        group.add(spotlight2.target);

        // Film strips
        const strip1 = createFilmStrip3D(3, -1);
        strip1.position.set(-3.5, 0, 0);
        group.add(strip1);

        const strip2 = createFilmStrip3D(3, 1);
        strip2.position.set(3.5, 0, 0);
        group.add(strip2);

        scene.add(group);
        sectionGroups.push(group);
    }

    function createFilmStrip3D(frameCount, direction) {
        const stripGroup = new THREE.Group();

        const stripGeo = new THREE.BoxGeometry(5.5, 3, 0.06);
        const stripMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A1A,
            roughness: 0.7,
        });
        const stripBody = new THREE.Mesh(stripGeo, stripMat);
        stripGroup.add(stripBody);

        // Sprocket holes
        const holeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8);
        const holeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
        for (let i = 0; i < 14; i++) {
            const x = -2.5 + i * (5 / 13);
            const holeTop = new THREE.Mesh(holeGeo, holeMat);
            holeTop.rotation.x = Math.PI / 2;
            holeTop.position.set(x, 1.3, 0.04);
            stripGroup.add(holeTop);
            const holeBot = new THREE.Mesh(holeGeo, holeMat);
            holeBot.rotation.x = Math.PI / 2;
            holeBot.position.set(x, -1.3, 0.04);
            stripGroup.add(holeBot);
        }

        // Photo frames
        const texLoader = new THREE.TextureLoader();
        for (let i = 0; i < frameCount; i++) {
            const x = -1.6 + i * 1.6;
            const texIndex = direction > 0 ? i + 4 : i + 1;
            const texUrl = `assets/photos/momen ${texIndex}.${texIndex === 6 ? 'jpeg' : 'jpg'}`;
            const frameMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.3, 1.8),
                new THREE.MeshStandardMaterial({
                    map: texLoader.load(texUrl),
                    roughness: 0.5,
                })
            );
            frameMesh.position.set(x, 0, 0.04);
            stripGroup.add(frameMesh);
        }

        // Label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 256;
        labelCanvas.height = 32;
        const lCtx = labelCanvas.getContext('2d');
        lCtx.fillStyle = '#FF6B35';
        lCtx.font = '14px monospace';
        lCtx.textAlign = 'center';
        lCtx.fillText('KENANGAN INDAH', 128, 20);
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
        const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.25), labelMat);
        labelMesh.position.set(0, -1.7, 0.04);
        stripGroup.add(labelMesh);

        return stripGroup;
    }

    /* ============================================================
       SECTION 6: TIME COUNTER (Penghitung Waktu)
       ============================================================ */
    function buildSection6_TimeCounter() {
        const group = new THREE.Group();
        const baseY = -5 * SECTION_SPACING;
        group.position.set(0, baseY, 0);
        
        sectionGroups.push(group);
        scene.add(group);

        // Timer Logic
        const startDate = new Date('2022-05-10T00:00:00');
        const updateTimer = () => {
            const now = new Date();
            const diff = now - startDate;
            
            let years = now.getFullYear() - startDate.getFullYear();
            let months = now.getMonth() - startDate.getMonth();
            let days = now.getDate() - startDate.getDate();
            
            if (days < 0) {
                months--;
                const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                days += lastMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }
            
            const totalSeconds = Math.floor(diff / 1000);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;
            
            const elYears = document.getElementById('t-years');
            const elMonths = document.getElementById('t-months');
            const elDays = document.getElementById('t-days');
            const elHours = document.getElementById('t-hours');
            const elMins = document.getElementById('t-minutes');
            const elSecs = document.getElementById('t-seconds');
            
            if (elYears) {
                elYears.textContent = years.toString().padStart(2, '0');
                elMonths.textContent = months.toString().padStart(2, '0');
                elDays.textContent = days.toString().padStart(2, '0');
                elHours.textContent = hours.toString().padStart(2, '0');
                elMins.textContent = mins.toString().padStart(2, '0');
                elSecs.textContent = secs.toString().padStart(2, '0');
            }
        };
        
        setInterval(updateTimer, 1000);
        updateTimer();
    }

    /* ============================================================
       SECTION 7: POP-UP CARD (Kartu Kejutan)
       ============================================================ */
    function buildSection7_PopupCard() {
        const group = new THREE.Group();
        const baseY = -6 * SECTION_SPACING;
        group.position.set(0, baseY, 0);

        // Gingham pattern background
        const ginghamGeo = new THREE.PlaneGeometry(25, 16);
        const gCanvas = document.createElement('canvas');
        gCanvas.width = 512;
        gCanvas.height = 384;
        const gCtx = gCanvas.getContext('2d');
        gCtx.fillStyle = '#FFEEEE';
        gCtx.fillRect(0, 0, 512, 384);
        const sq = 24;
        for (let row = 0; row < 384 / sq; row++) {
            for (let col = 0; col < 512 / sq; col++) {
                if ((row + col) % 2 === 0) {
                    gCtx.fillStyle = 'rgba(204, 50, 50, 0.25)';
                    gCtx.fillRect(col * sq, row * sq, sq, sq);
                }
                if (row % 2 === 0) {
                    gCtx.fillStyle = 'rgba(204, 50, 50, 0.12)';
                    gCtx.fillRect(col * sq, row * sq, sq, sq);
                }
                if (col % 2 === 0) {
                    gCtx.fillStyle = 'rgba(204, 50, 50, 0.12)';
                    gCtx.fillRect(col * sq, row * sq, sq, sq);
                }
            }
        }
        const gTex = new THREE.CanvasTexture(gCanvas);
        const gMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.9 });
        const gingham = new THREE.Mesh(ginghamGeo, gMat);
        gingham.position.z = -3;
        group.add(gingham);

        // Standing card
        const cardGroup = new THREE.Group();

        const cardGeo = new THREE.BoxGeometry(4, 5, 0.1);
        const cardMat = new THREE.MeshStandardMaterial({
            color: COLORS.warmWhite,
            roughness: 0.8,
        });
        const card = new THREE.Mesh(cardGeo, cardMat);
        card.castShadow = true;
        cardGroup.add(card);

        // Red ribbon
        const ribbonGeo = new THREE.BoxGeometry(1.2, 0.3, 0.15);
        const ribbonMat = new THREE.MeshStandardMaterial({
            color: COLORS.maroon,
            roughness: 0.5,
        });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.set(0, 2.65, 0.05);
        cardGroup.add(ribbon);

        const tailGeo = new THREE.BoxGeometry(0.15, 0.5, 0.1);
        const tail1 = new THREE.Mesh(tailGeo, ribbonMat);
        tail1.position.set(-0.3, 2.3, 0.05);
        tail1.rotation.z = 0.2;
        cardGroup.add(tail1);
        const tail2 = new THREE.Mesh(tailGeo, ribbonMat);
        tail2.position.set(0.3, 2.3, 0.05);
        tail2.rotation.z = -0.2;
        cardGroup.add(tail2);

        // Gold pin
        const pinGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const pinMat = new THREE.MeshPhysicalMaterial({
            color: COLORS.gold,
            roughness: 0.2,
            metalness: 0.9,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(1.6, 2.2, 0.1);
        cardGroup.add(pin);

        // Flowers
        const flowerColors = [0xFF69B4, 0xFF1493, 0xFFB6C1];
        flowerColors.forEach((c, i) => {
            const fGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const fMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
            const flower = new THREE.Mesh(fGeo, fMat);
            flower.position.set(-1.3 + i * 0.4, -2.2, 0.1);
            cardGroup.add(flower);
        });

        cardGroup.position.set(0, 0, 0);
        group.add(cardGroup);

        scene.add(group);
        sectionGroups.push(group);
    }

    /* ============================================================
       SECTION 8: PENUTUP (Closing Scene)
       ============================================================ */
    function buildSection8_Closing() {
        const group = new THREE.Group();
        const baseY = -7 * SECTION_SPACING;
        group.position.set(0, baseY, 0);

        // Warm gradient background
        const bgGeo = new THREE.PlaneGeometry(25, 16);
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 512;
        bgCanvas.height = 384;
        const bgCtx = bgCanvas.getContext('2d');
        const bgGrad = bgCtx.createRadialGradient(256, 192, 50, 256, 192, 300);
        bgGrad.addColorStop(0, '#4A0012');
        bgGrad.addColorStop(0.5, '#800020');
        bgGrad.addColorStop(1, '#2D0A16');
        bgCtx.fillStyle = bgGrad;
        bgCtx.fillRect(0, 0, 512, 384);
        const bgTex = new THREE.CanvasTexture(bgCanvas);
        const bgMat = new THREE.MeshBasicMaterial({ map: bgTex });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.z = -3;
        group.add(bg);

        // Gold photo frame
        const frameGroup = new THREE.Group();

        const outerGeo = new THREE.BoxGeometry(4, 5.2, 0.2);
        const outerMat = new THREE.MeshPhysicalMaterial({
            color: COLORS.gold,
            roughness: 0.25,
            metalness: 0.85,
            clearcoat: 0.4,
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        frameGroup.add(outer);

        const innerGeo = new THREE.BoxGeometry(3.4, 4.6, 0.22);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x3D2B1F,
            roughness: 0.6,
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        frameGroup.add(inner);

        const photoGeo = new THREE.PlaneGeometry(3.2, 4.4);
        const photoTex = createPlaceholderTex('', 640, 880, '#F8C8D4', '#D4A0BC');
        const photoMat = new THREE.MeshStandardMaterial({ map: photoTex });
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.position.z = 0.12;
        frameGroup.add(photo);

        // Decorative corners
        const cornerGeo = new THREE.BoxGeometry(0.3, 0.3, 0.25);
        const cornerMat = new THREE.MeshPhysicalMaterial({
            color: COLORS.gold,
            roughness: 0.2,
            metalness: 0.9,
        });
        [[-1.85, 2.45], [1.85, 2.45], [-1.85, -2.45], [1.85, -2.45]].forEach(([x, y]) => {
            const corner = new THREE.Mesh(cornerGeo, cornerMat);
            corner.position.set(x, y, 0.1);
            frameGroup.add(corner);
        });

        frameGroup.position.set(0, 0.5, 0);
        group.add(frameGroup);

        // Sparkle particles
        const spkGeo = new THREE.BufferGeometry();
        const count = 80;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 16;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        spkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const spkMat = new THREE.PointsMaterial({
            color: COLORS.goldLight,
            size: 0.1,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
        });
        const sparklePoints = new THREE.Points(spkGeo, spkMat);
        group.add(sparklePoints);
        sparkleParticles.push({ points: sparklePoints, basePositions: positions.slice() });

        const closingLight = new THREE.PointLight(COLORS.gold, 1.0, 15);
        closingLight.position.set(0, 2, 5);
        group.add(closingLight);

        scene.add(group);
        sectionGroups.push(group);
    }

    function buildSection9_Reply() {
        const group = new THREE.Group();
        const baseY = -8 * SECTION_SPACING;
        group.position.y = baseY;

        // Add some floating 3D hearts around the reply box
        const heartMat = new THREE.MeshStandardMaterial({
            color: COLORS.sunsetPink,
            roughness: 0.5,
            transparent: true,
            opacity: 0.6,
        });

        for (let i = 0; i < 6; i++) {
            const hs = createHeartShape(0.08);
            const hgeo = new THREE.ExtrudeGeometry(hs, {
                depth: 0.05,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelSegments: 2,
            });
            const heart = new THREE.Mesh(hgeo, heartMat.clone());
            
            heart.position.set(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 4 - 2
            );

            // Gentle float animation
            gsap.to(heart.position, {
                y: heart.position.y + 1.5,
                duration: 3 + Math.random() * 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: Math.random() * 2
            });

            group.add(heart);
        }

        const replyLight = new THREE.PointLight(COLORS.softPink, 0.8, 15);
        replyLight.position.set(0, 2, 5);
        group.add(replyLight);

        scene.add(group);
        sectionGroups.push(group);
    }

    /* ============================================================
       NAVIGATION — ULTRA SMOOTH TRANSITIONS
       ============================================================ */
    function navigateTo(targetIndex) {
        if (isTransitioning) return;
        if (targetIndex < 0 || targetIndex >= SECTION_COUNT) return;
        if (targetIndex === currentSection) return;
        if (!envelopeOpened && targetIndex > 0) return;

        isTransitioning = true;

        const fromData = CAMERA_DATA[currentSection];
        const toData = CAMERA_DATA[targetIndex];
        const overlay = document.getElementById('transition-overlay');

        // Fade out current section overlay
        const currentOverlay = document.getElementById(`section-${currentSection + 1}`);
        const targetOverlay = document.getElementById(`section-${targetIndex + 1}`);
        if (currentOverlay) currentOverlay.classList.remove('active');

        // Smooth camera position animation
        gsap.to(camera.position, {
            x: toData.pos[0],
            y: toData.pos[1],
            z: toData.pos[2],
            duration: 2.5,
            ease: 'power2.inOut',
        });

        // Smooth lookAt target animation (separate from position for cinematic feel)
        gsap.to(cameraLookTarget, {
            x: toData.look[0],
            y: toData.look[1],
            z: toData.look[2],
            duration: 2.5,
            ease: 'power2.inOut',
        });

        // Very subtle transition overlay (just a gentle darkening)
        gsap.to(overlay, {
            opacity: 0.2,
            duration: 0.8,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: 1,
            repeatDelay: 0.6,
        });

        // Show target overlay after camera arrives
        gsap.delayedCall(2.0, () => {
            if (targetOverlay) targetOverlay.classList.add('active');
            currentSection = targetIndex;
            isTransitioning = false;
            updateNavigation();
        });
    }

    function updateNavigation() {
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        const navControls = document.getElementById('nav-controls');
        const sectionDots = document.getElementById('section-dots');

        if (envelopeOpened) {
            navControls.classList.add('visible');
            sectionDots.classList.add('visible');
        }

        prevBtn.disabled = currentSection <= 0;
        nextBtn.disabled = currentSection >= SECTION_COUNT - 1;

        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSection);
        });
    }

    /* ============================================================
       ENVELOPE OPENING — SMOOTH CINEMATIC ANIMATION
       ============================================================ */
    function openEnvelope() {
        if (envelopeOpened || isTransitioning) return;
        envelopeOpened = true;
        isTransitioning = true;

        const { flapPivot, seal, group: envGroup } = envelopeRef;

        // Step 1: Seal shake & crack
        gsap.to(seal.scale, {
            x: 1.3, y: 0.7, z: 1.3,
            duration: 0.25,
            ease: 'power2.in',
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                gsap.to(seal.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power3.in' });
            }
        });

        // Step 2: Seal break particles
        gsap.delayedCall(0.9, createSealParticles);

        // Step 3: Flap opens smoothly
        gsap.delayedCall(1.1, () => {
            gsap.to(flapPivot.rotation, {
                x: -Math.PI * 0.95,
                duration: 1.4,
                ease: 'power2.inOut',
            });
        });

        // Step 4: Camera zooms in gently
        gsap.delayedCall(2.2, () => {
            gsap.to(camera.position, {
                x: 0, y: 0.5, z: 2,
                duration: 1.8,
                ease: 'power2.inOut',
            });

            document.getElementById('section-1').classList.remove('active');
        });

        // Step 5: Smooth transition to section 2
        gsap.delayedCall(3.8, () => {
            const target = CAMERA_DATA[1];

            gsap.to(camera.position, {
                x: target.pos[0],
                y: target.pos[1],
                z: target.pos[2],
                duration: 2.8,
                ease: 'power2.inOut',
            });

            gsap.to(cameraLookTarget, {
                x: target.look[0],
                y: target.look[1],
                z: target.look[2],
                duration: 2.8,
                ease: 'power2.inOut',
            });

            // Subtle darkening during transition
            const overlay = document.getElementById('transition-overlay');
            gsap.to(overlay, {
                opacity: 0.25,
                duration: 1.0,
                ease: 'power1.inOut',
                yoyo: true,
                repeat: 1,
                repeatDelay: 0.8,
            });

            gsap.delayedCall(2.4, () => {
                currentSection = 1;
                isTransitioning = false;
                document.getElementById('section-2').classList.add('active');
                updateNavigation();
            });
        });
    }

    function createSealParticles() {
        const sealWorldPos = new THREE.Vector3();
        envelopeRef.seal.getWorldPosition(sealWorldPos);

        for (let i = 0; i < 25; i++) {
            const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: COLORS.gold,
                transparent: true,
                opacity: 1,
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(sealWorldPos);
            scene.add(particle);

            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            gsap.to(particle.position, {
                x: sealWorldPos.x + Math.cos(angle) * speed,
                y: sealWorldPos.y + Math.sin(angle) * speed + Math.random(),
                z: sealWorldPos.z + (Math.random() - 0.5) * 2,
                duration: 1.2 + Math.random() * 0.5,
                ease: 'power2.out',
            });
            gsap.to(mat, {
                opacity: 0,
                duration: 1.5,
                ease: 'power2.in',
                onComplete: () => {
                    scene.remove(particle);
                    geo.dispose();
                    mat.dispose();
                }
            });
        }
    }

    /* ============================================================
       PASSWORD MODAL LOGIC
       ============================================================ */
    const CORRECT_PASSWORD = "030407"; // Default sandi

    function setupPasswordModal() {
        const modal = document.getElementById('password-modal');
        const submitBtn = document.getElementById('password-submit');
        const pinBoxes = document.querySelectorAll('.pin-box');
        const errorMsg = document.getElementById('password-error');

        if (!modal || !submitBtn || pinBoxes.length === 0) return;

        // Auto-focus next input logic
        pinBoxes.forEach((box, index) => {
            box.dataset.realValue = '';

            box.addEventListener('input', (e) => {
                let val = box.value;
                if (val.length > 0) {
                    // Extract the newly typed character (ignore existing hearts)
                    let typedChar = val.replace(/❤/g, '').replace(/️/g, '').trim();
                    
                    if (typedChar.length > 0) {
                        box.dataset.realValue = typedChar.slice(-1);
                    }
                    
                    // Replace visual value with heart
                    box.value = '❤️';
                    
                    // Jump to next
                    if (index < pinBoxes.length - 1) {
                        pinBoxes[index + 1].focus();
                    }
                } else {
                    box.dataset.realValue = '';
                }
            });

            box.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (box.value.length === 0 && index > 0) {
                        pinBoxes[index - 1].focus();
                        pinBoxes[index - 1].value = '';
                        pinBoxes[index - 1].dataset.realValue = '';
                        e.preventDefault();
                    } else {
                        box.dataset.realValue = '';
                        box.value = '';
                    }
                } else if (e.key === 'Enter') {
                    checkPassword();
                }
            });
            
            // Auto select text on focus so user can easily overwrite
            box.addEventListener('focus', () => {
                box.select();
            });
        });

        function checkPassword() {
            // Collect PIN
            let enteredPwd = '';
            pinBoxes.forEach(b => enteredPwd += (b.dataset.realValue || ''));

            if (enteredPwd.toLowerCase() === CORRECT_PASSWORD) {
                modal.classList.remove('active');
                errorMsg.style.display = 'none';

                // Trigger Confetti Effect
                if (window.confetti) {
                    const duration = 3000;
                    const end = Date.now() + duration;
                    const colors = ['#FFB6C1', '#FF6B8A', '#D4AF37'];

                    (function frame() {
                        confetti({
                            particleCount: 5,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                            colors: colors,
                            zIndex: 9999
                        });
                        confetti({
                            particleCount: 5,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                            colors: colors,
                            zIndex: 9999
                        });

                        if (Date.now() < end) {
                            requestAnimationFrame(frame);
                        }
                    }());
                }

                // Start Background Music with Dramatic Fade In
                const bgMusic = document.getElementById('bg-music');
                if (bgMusic) {
                    bgMusic.volume = 0;
                    bgMusic.play().catch(err => console.log("Audio play failed:", err));
                    gsap.to(bgMusic, { volume: 0.8, duration: 5, ease: "power2.inOut" });
                }

                openEnvelope();
            } else {
                errorMsg.style.display = 'block';
                pinBoxes.forEach(b => {
                    b.value = '';
                    b.dataset.realValue = '';
                });
                pinBoxes[0].focus();
            }
        }

        submitBtn.addEventListener('click', checkPassword);

        // Also close modal if clicking outside content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    function showPasswordModal() {
        const modal = document.getElementById('password-modal');
        const pinBoxes = document.querySelectorAll('.pin-box');
        const errorMsg = document.getElementById('password-error');

        if (modal) {
            modal.classList.add('active');
            errorMsg.style.display = 'none';
            pinBoxes.forEach(b => {
                b.value = '';
                b.dataset.realValue = '';
            });
            setTimeout(() => {
                if (pinBoxes.length > 0) pinBoxes[0].focus();
            }, 100);
        } else {
            // Fallback
            const pwd = prompt("Masukkan sandi untuk membuka surat:");
            if (pwd && pwd.toLowerCase() === CORRECT_PASSWORD) {
                openEnvelope();
            } else if (pwd !== null) {
                alert("Sandi salah!");
            }
        }
    }

    /* ============================================================
       INTERACTION HANDLERS
       ============================================================ */
    function onMouseMove(e) {
        mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Polaroid hover effect (section index 3)
        if (currentSection === 3 && polaroidRefs.length > 0) {
            raycaster.setFromCamera(mouseNDC, camera);
            const intersects = raycaster.intersectObjects(
                polaroidRefs.flatMap(p => p.children),
                true
            );

            // Reset all
            polaroidRefs.forEach(p => {
                gsap.to(p.position, {
                    z: p.userData.basePos.z,
                    duration: 0.4,
                    ease: 'power2.out',
                });
                gsap.to(p.rotation, {
                    z: p.userData.baseRot,
                    y: 0,
                    duration: 0.4,
                    ease: 'power2.out',
                });
            });

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj.parent && !obj.name.startsWith('polaroid_')) {
                    obj = obj.parent;
                }
                if (obj.name.startsWith('polaroid_')) {
                    gsap.to(obj.position, {
                        z: obj.userData.basePos.z + 0.8,
                        duration: 0.4,
                        ease: 'power2.out',
                    });
                    gsap.to(obj.rotation, {
                        z: 0,
                        y: 0.1,
                        duration: 0.4,
                        ease: 'power2.out',
                    });
                }
            }
        }
    }

    function onClick(e) {
        if (isTransitioning) return;

        // Prevent 3D clicks when password modal is open
        const modal = document.getElementById('password-modal');
        if (modal && modal.classList.contains('active')) return;

        if (currentSection === 0 && !envelopeOpened && sealClickable) {
            mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouseNDC, camera);

            const intersects = raycaster.intersectObject(sealClickable);
            if (intersects.length > 0) {
                showPasswordModal();
            }
        }
    }

    function onTouch(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            onClick({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    /* ============================================================
       CURSOR SPARKLE EFFECT
       ============================================================ */
    function setupCursorSparkle() {
        let lastSparkle = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastSparkle < 100) return;
            lastSparkle = now;

            const sparkle = document.createElement('div');
            sparkle.className = 'cursor-sparkle';
            sparkle.style.left = e.clientX + (Math.random() - 0.5) * 20 + 'px';
            sparkle.style.top = e.clientY + (Math.random() - 0.5) * 20 + 'px';
            document.body.appendChild(sparkle);

            setTimeout(() => sparkle.remove(), 600);
        });
    }

    /* ============================================================
       CSS FLOATING HEARTS (Romance Theme)
       ============================================================ */
    function createCSSHearts() {
        const container = document.getElementById('floating-hearts');
        const items = ['❤️', '💖', '💕', '💞', '💓', '💗', '💘', '💌'];
        for (let i = 0; i < 18; i++) { // Increased count slightly for more romance
            const el = document.createElement('div');
            el.className = 'float-heart';
            el.textContent = items[Math.floor(Math.random() * items.length)];
            el.style.setProperty('--left', Math.random() * 100 + '%');
            el.style.setProperty('--duration', (5 + Math.random() * 8) + 's');
            el.style.setProperty('--delay', (Math.random() * 10) + 's');
            el.style.setProperty('--size', (0.8 + Math.random() * 1.5) + 'rem');
            container.appendChild(el);
        }
    }

    /* ============================================================
       WINDOW RESIZE
       ============================================================ */
    function onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        camera.aspect = aspect;
        
        // Optimasi Mobile: Lebarkan FOV (sudut pandang) jika layar vertikal (portrait)
        if (aspect < 1) {
            camera.fov = 55 + (1 - aspect) * 35; // Dinamis untuk HP
        } else {
            camera.fov = 55;
        }
        
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /* ============================================================
       ANIMATION LOOP
       ============================================================ */
    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // Smooth camera lookAt every frame (cinematic feel)
        camera.lookAt(cameraLookTarget.x, cameraLookTarget.y, cameraLookTarget.z);

        // --- Envelope floating ---
        if (envelopeRef.group && !envelopeOpened) {
            envelopeRef.group.position.y = 0.5 + Math.sin(time * 1.2) * 0.15;
            envelopeRef.group.rotation.y = Math.sin(time * 0.5) * 0.08;
            envelopeRef.group.rotation.z = Math.sin(time * 0.7) * 0.03;
        }

        // --- Background photo gentle 3D breathing ---
        if (envelopeRef.bgPhoto && envelopeRef.bgPhoto.material.opacity > 0) {
            envelopeRef.bgPhoto.position.y = 2.5 + Math.sin(time * 0.4) * 0.15;
            envelopeRef.bgPhoto.rotation.y = Math.sin(time * 0.25) * 0.02;
        }

        // --- Ocean waves ---
        if (envelopeRef.ocean) {
            const oceanPositions = envelopeRef.ocean.geometry.attributes.position;
            for (let i = 0; i < oceanPositions.count; i++) {
                const x = oceanPositions.getX(i);
                const y = oceanPositions.getY(i);
                const wave = Math.sin(x * 0.3 + time * 1.5) * 0.3 +
                    Math.cos(y * 0.4 + time * 1.2) * 0.2 +
                    Math.sin((x + y) * 0.2 + time * 0.8) * 0.15;
                oceanPositions.setZ(i, wave);
            }
            oceanPositions.needsUpdate = true;
        }

        // --- Sparkles ---
        if (envelopeRef.sparkles) {
            const pos = envelopeRef.sparkles.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i);
                y += 0.01;
                if (y > 8) y = -2;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
            envelopeRef.sparkles.rotation.y = time * 0.05;
        }

        // --- Floating hearts (3D) ---
        heartParticles.forEach(h => {
            const { mesh, baseY } = h;
            mesh.position.y = baseY + Math.sin(time * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.5;
            mesh.rotation.y = time * 0.3;
            mesh.rotation.z = Math.sin(time * 0.5 + mesh.userData.floatOffset) * 0.2;
        });

        // --- Greeting Background (Section 2) ---
        if (envelopeRef.greetingRings) {
            envelopeRef.greetingRings[0].rotation.x += 0.005;
            envelopeRef.greetingRings[0].rotation.y += 0.002;
            envelopeRef.greetingRings[1].rotation.x -= 0.003;
            envelopeRef.greetingRings[1].rotation.y += 0.004;
        }
        if (envelopeRef.greetingStardust) {
            const { points, basePositions } = envelopeRef.greetingStardust;
            const positions = points.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const bx = basePositions[i * 3];
                const by = basePositions[i * 3 + 1];
                const bz = basePositions[i * 3 + 2];
                positions.setX(i, bx + Math.sin(time * 0.5 + i) * 0.2);
                positions.setY(i, by + Math.cos(time * 0.4 + i * 0.5) * 0.2);
                positions.setZ(i, bz + Math.sin(time * 0.3 + i * 0.3) * 0.1);
            }
            positions.needsUpdate = true;
            points.rotation.y = time * 0.05;
        }

        // --- Closing sparkles ---
        sparkleParticles.forEach(sp => {
            const positions = sp.points.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const bx = sp.basePositions[i * 3];
                const by = sp.basePositions[i * 3 + 1];
                const bz = sp.basePositions[i * 3 + 2];
                positions.setX(i, bx + Math.sin(time * 0.5 + i) * 0.3);
                positions.setY(i, by + Math.cos(time * 0.4 + i * 0.5) * 0.3);
                positions.setZ(i, bz + Math.sin(time * 0.3 + i * 0.3) * 0.2);
            }
            positions.needsUpdate = true;
        });

        // Render
        renderer.render(scene, camera);
    }

    /* ============================================================
       START
       ============================================================ */
    window.addEventListener('DOMContentLoaded', init);

})();
