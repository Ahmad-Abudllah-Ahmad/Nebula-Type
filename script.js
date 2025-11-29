const config = {
    text: "Inside Compilers",
    color: 0xE066FF, 
    colorText: 0xFFFFFF, 
    radius: 40, 
    fontSize: 100,
    fontFamily: 'Verdana, sans-serif',
    bgParticleCount: 10000 
};

let scene, camera, renderer;
let material, geometry, particles;
let bgParticles, bgMaterial;
let clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 140;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    generateParticleSystem(config.text);
    generateBackgroundParticles();

    document.getElementById('loading').style.opacity = 0;
    document.getElementById('updateBtn').addEventListener('click', () => {
        const newText = document.getElementById('textInput').value;
        if(newText && newText.trim() !== "") {
            generateParticleSystem(newText);
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function generateBackgroundParticles() {
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(config.bgParticleCount * 3);
    const bgRandom = new Float32Array(config.bgParticleCount);
    const bgSizes = new Float32Array(config.bgParticleCount);

    for (let i = 0; i < config.bgParticleCount; i++) {
        bgPositions[i * 3] = (Math.random() - 0.5) * 800; 
        bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 500; 
        bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 500; 
        
        bgRandom[i] = Math.random();
        bgSizes[i] = 2.0 + Math.random() * 4.0; 
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('aRandom', new THREE.BufferAttribute(bgRandom, 1));
    bgGeometry.setAttribute('aSize', new THREE.BufferAttribute(bgSizes, 1));

    bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0xFFFFFF) } 
        },
        vertexShader: document.getElementById('bgVertexShader').textContent,
        fragmentShader: document.getElementById('bgFragmentShader').textContent,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.6 
    });

    bgParticles = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgParticles);
}

function generateParticleSystem(text) {
    if (particles) {
        scene.remove(particles);
        geometry.dispose();
    }

    let textCoords = generateTextCoordinates(text);
    
    // --- DYNAMIC SCALING LOGIC ---
    // 1. Calculate bounding box of the text
    let minX = Infinity;
    let maxX = -Infinity;
    for(let coord of textCoords) {
        if(coord.x < minX) minX = coord.x;
        if(coord.x > maxX) maxX = coord.x;
    }
    
    const currentWidth = maxX - minX;

    // 2. Calculate Visible Width at Z=0 based on Camera FOV and Aspect Ratio
    // Formula: visibleHeight = 2 * tan(fov / 2) * distance
    // visibleWidth = visibleHeight * aspect
    const vFOV = (camera.fov * Math.PI) / 180; // convert to radians
    const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
    const visibleWidth = visibleHeight * camera.aspect;

    // 3. Define Safe Area (e.g., 85% of screen width)
    const safeWidth = visibleWidth * 0.85;

    // 4. Scale if needed (or always scale to fit exactly if desired)
    if (currentWidth > safeWidth) {
        const scaleFactor = safeWidth / currentWidth;
        for(let coord of textCoords) {
            coord.x *= scaleFactor;
            coord.y *= scaleFactor; // Uniform scaling
        }
    }
    // -----------------------------

    const particleCount = textCoords.length;
    const sphereCoords = generateSphereCoordinates(particleCount, config.radius);

    geometry = new THREE.BufferGeometry();
    
    const positionSphereArray = new Float32Array(particleCount * 3);
    const positionTextArray = new Float32Array(particleCount * 3);
    const randomArray = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positionSphereArray[i * 3] = sphereCoords[i].x;
        positionSphereArray[i * 3 + 1] = sphereCoords[i].y;
        positionSphereArray[i * 3 + 2] = sphereCoords[i].z;

        positionTextArray[i * 3] = textCoords[i].x;
        positionTextArray[i * 3 + 1] = textCoords[i].y;
        positionTextArray[i * 3 + 2] = textCoords[i].z;

        randomArray[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positionSphereArray, 3));
    geometry.setAttribute('positionSphere', new THREE.BufferAttribute(positionSphereArray, 3));
    geometry.setAttribute('positionText', new THREE.BufferAttribute(positionTextArray, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomArray, 1));

    if (!material) {
        material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMix: { value: 0.0 },
                uExplosion: { value: 0.0 },
                uColor: { value: new THREE.Color(config.color) },
                uColorText: { value: new THREE.Color(config.colorText) }
            },
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function generateTextCoordinates(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 4000; 
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.font = `900 ${config.fontSize}px ${config.fontFamily}`; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const coords = [];
    
    const step = 3; 

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (data[index] > 128) { 
                coords.push({
                    x: (x - width / 2) * 0.15,
                    y: -(y - height / 2) * 0.15,
                    z: 0
                });
            }
        }
    }
    return coords;
}

function generateSphereCoordinates(count, radius) {
    const coords = [];
    for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;

        coords.push({
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi)
        });
    }
    return coords;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Optional: Regenerate particles on resize if strict sizing is needed dynamically
    // generateParticleSystem(document.getElementById('textInput').value); 
}

function easeInOutQuint(x) {
    return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    material.uniforms.uTime.value = time;
    if(bgMaterial) bgMaterial.uniforms.uTime.value = time;

    const cycle = 24; 
    const t = time % cycle;

    let uMix = 0;
    let uExplosion = 0;
    let rotationSpeed = 0.0005; 

    // 0-4s: Sphere Hold
    if (t < 4) {
        uMix = 0;
        particles.rotation.y += rotationSpeed;
        particles.rotation.x = Math.sin(time * 0.3) * 0.02; 
    } 
    // 4-9s: Transition
    else if (t < 9) { 
        const p = (t - 4) / 5.0;
        
        if(p < 0.3) {
             uMix = 0;
        } else {
             uMix = easeInOutQuint((p - 0.3) / 0.7);
        }

        if (p < 0.2) {
            uExplosion = (p / 0.2) * 40.0;
        } else if (p < 0.6) {
            uExplosion = 40.0; 
        } else {
            uExplosion = 40.0 * (1.0 - (p - 0.6) / 0.4); 
        }
        
        particles.rotation.y = THREE.MathUtils.lerp(particles.rotation.y, 0, 0.02); 
        particles.rotation.x = THREE.MathUtils.lerp(particles.rotation.x, 0, 0.02);
    }
    // 9-15s: Text Hold
    else if (t < 15) {
        uMix = 1;
        uExplosion = 0;
        particles.rotation.set(0, 0, 0); 
    }
    // 15-20s: Return
    else if (t < 20) {
        const p = (t - 15) / 5.0;
        uMix = 1.0 - easeInOutQuint(p);
        uExplosion = Math.sin(p * Math.PI) * 30.0;
        particles.rotation.y += rotationSpeed * p; 
    }
    // 20-24s: Sphere Hold
    else {
        uMix = 0;
        particles.rotation.y += rotationSpeed;
    }

    material.uniforms.uMix.value = uMix;
    material.uniforms.uExplosion.value = uExplosion;

    renderer.render(scene, camera);
}

init();