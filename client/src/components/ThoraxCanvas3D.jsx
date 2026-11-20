import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function ThoraxCanvas3D({ onSelectPin }) {
  const mountRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState({
    ribs: true,
    lungs: true,
    heart: true,
    scanBeam: true,
    autoRotate: true,
  });
  const [activePin, setActivePin] = useState(null);
  const [hudStats, setHudStats] = useState({
    fps: 60,
    lungVolumePct: 100,
    heartRateBpm: 72,
    scanSliceZ: '+1.4 cm',
  });

  const stateRef = useRef(activeLayer);
  stateRef.current = activeLayer;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b14, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambLight = new THREE.AmbientLight(0x0b1f3a, 2.0);
    scene.add(ambLight);

    const cyanPoint = new THREE.PointLight(0x00f2fe, 3.5, 45);
    cyanPoint.position.set(8, 12, 14);
    scene.add(cyanPoint);

    const violetPoint = new THREE.PointLight(0x818cf8, 2.8, 45);
    violetPoint.position.set(-10, -6, 12);
    scene.add(violetPoint);

    const backRim = new THREE.PointLight(0x0284c7, 2.2, 40);
    backRim.position.set(0, 4, -14);
    scene.add(backRim);

    // Master Group for 3D Thorax
    const thoraxGroup = new THREE.Group();
    scene.add(thoraxGroup);

    // 3. Spinal Column (Vertebrae & Discs)
    const spineGroup = new THREE.Group();
    const vertMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.2,
      roughness: 0.3,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const discMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75 });

    const vertebraCount = 14;
    for (let i = 0; i < vertebraCount; i++) {
      const y = 6.5 - i * 0.95;
      const kyphosisZ = -Math.sin((i / vertebraCount) * Math.PI) * 1.2 - 1.2;
      const vGeom = new THREE.CylinderGeometry(0.55, 0.65, 0.5, 8);
      const vertebra = new THREE.Mesh(vGeom, vertMat);
      vertebra.position.set(0, y, kyphosisZ);
      vertebra.rotation.x = 0.05 * (i - 7);
      spineGroup.add(vertebra);

      if (i < vertebraCount - 1) {
        const dGeom = new THREE.CylinderGeometry(0.58, 0.58, 0.15, 8);
        const disc = new THREE.Mesh(dGeom, discMat);
        disc.position.set(0, y - 0.4, kyphosisZ);
        spineGroup.add(disc);
      }
    }
    thoraxGroup.add(spineGroup);

    // 4. Bilateral Anatomical Ribs (10 Pairs)
    const ribsGroup = new THREE.Group();
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });

    const ribPairs = 10;
    for (let i = 0; i < ribPairs; i++) {
      const t = i / (ribPairs - 1);
      const yStart = 5.8 - i * 0.95;
      const ribRadius = 2.4 + Math.sin(t * Math.PI * 0.85) * 3.2;
      const ribDepth = 2.0 + Math.sin(t * Math.PI * 0.85) * 2.1;
      const yDrop = 0.4 + t * 0.7;

      // Left rib curve
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.5, yStart, -1.2),
        new THREE.Vector3(ribRadius * 0.75, yStart - yDrop * 0.3, -0.6),
        new THREE.Vector3(ribRadius, yStart - yDrop * 0.65, ribDepth * 0.4),
        new THREE.Vector3(ribRadius * 0.7, yStart - yDrop, ribDepth * 0.9),
        new THREE.Vector3(0.6, yStart - yDrop * 1.15, ribDepth * 1.05),
      ]);
      const leftGeom = new THREE.TubeGeometry(leftCurve, 20, 0.11 - i * 0.003, 6, false);
      const leftRib = new THREE.Mesh(leftGeom, ribMat);
      ribsGroup.add(leftRib);

      // Right rib curve (symmetric inverted X)
      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.5, yStart, -1.2),
        new THREE.Vector3(-ribRadius * 0.75, yStart - yDrop * 0.3, -0.6),
        new THREE.Vector3(-ribRadius, yStart - yDrop * 0.65, ribDepth * 0.4),
        new THREE.Vector3(-ribRadius * 0.7, yStart - yDrop, ribDepth * 0.9),
        new THREE.Vector3(-0.6, yStart - yDrop * 1.15, ribDepth * 1.05),
      ]);
      const rightGeom = new THREE.TubeGeometry(rightCurve, 20, 0.11 - i * 0.003, 6, false);
      const rightRib = new THREE.Mesh(rightGeom, ribMat);
      ribsGroup.add(rightRib);
    }

    // Sternum (Anterior midline breastbone)
    const sternumCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.8, 2.5),
      new THREE.Vector3(0, 4.2, 3.2),
      new THREE.Vector3(0, 1.8, 3.4),
      new THREE.Vector3(0, -1.2, 3.1),
      new THREE.Vector3(0, -3.2, 2.6),
    ]);
    const sternumGeom = new THREE.TubeGeometry(sternumCurve, 16, 0.22, 8, false);
    const sternumMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    const sternum = new THREE.Mesh(sternumGeom, sternumMat);
    ribsGroup.add(sternum);

    // Clavicles (Collarbones spanning out to shoulders)
    const leftClavCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 5.8, 2.5),
      new THREE.Vector3(2.5, 6.2, 1.6),
      new THREE.Vector3(5.2, 5.9, 0.2),
    ]);
    const leftClavGeom = new THREE.TubeGeometry(leftClavCurve, 14, 0.16, 6, false);
    ribsGroup.add(new THREE.Mesh(leftClavGeom, sternumMat));

    const rightClavCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 5.8, 2.5),
      new THREE.Vector3(-2.5, 6.2, 1.6),
      new THREE.Vector3(-5.2, 5.9, 0.2),
    ]);
    const rightClavGeom = new THREE.TubeGeometry(rightClavCurve, 14, 0.16, 6, false);
    ribsGroup.add(new THREE.Mesh(rightClavGeom, sternumMat));

    thoraxGroup.add(ribsGroup);

    // 5. Volumetric Point Cloud Lungs (with Respiratory Pulse)
    const lungPointsCount = 3800;
    const lungPositions = new Float32Array(lungPointsCount * 3);
    const lungBasePositions = new Float32Array(lungPointsCount * 3);
    const lungColors = new Float32Array(lungPointsCount * 3);

    const tealColor = new THREE.Color(0x00f2fe);
    const deepBlue = new THREE.Color(0x0284c7);
    const violetColor = new THREE.Color(0x818cf8);

    for (let i = 0; i < lungPointsCount; i++) {
      const isRight = i % 2 === 0;
      const xSide = isRight ? 1 : -1;

      // Parameterize lung envelope
      const u = Math.random();
      const v = Math.random();
      const w = Math.random();

      // Vertical height from apex (y=5.2) down to base (y=-4.2)
      const y = 5.2 - u * 9.4;
      const tNorm = (5.2 - y) / 9.4; // 0 at apex, 1 at base

      // Radius profile: slender at apex, wider at middle-base
      const radMax = (0.7 + Math.sin(tNorm * Math.PI * 0.85) * 2.3) * Math.sqrt(v);
      const angle = w * Math.PI * 2;

      let x = (xSide * (1.6 + radMax * Math.cos(angle))) * 0.95;
      let z = (Math.sin(angle) * (radMax * 0.75) + 0.5) * 0.95;

      // Cardiac notch indentation on left lung
      if (!isRight && y < 1.0 && y > -2.8 && x > -2.6 && z > -0.5) {
        x -= 0.6;
        z -= 0.4;
      }

      const idx = i * 3;
      lungPositions[idx] = x;
      lungPositions[idx + 1] = y;
      lungPositions[idx + 2] = z;

      lungBasePositions[idx] = x;
      lungBasePositions[idx + 1] = y;
      lungBasePositions[idx + 2] = z;

      // Color gradient
      const c = tNorm < 0.4 ? tealColor.clone().lerp(deepBlue, tNorm / 0.4) : deepBlue.clone().lerp(violetColor, (tNorm - 0.4) / 0.6);
      lungColors[idx] = c.r;
      lungColors[idx + 1] = c.g;
      lungColors[idx + 2] = c.b;
    }

    const lungGeometry = new THREE.BufferGeometry();
    lungGeometry.setAttribute('position', new THREE.BufferAttribute(lungPositions, 3));
    lungGeometry.setAttribute('color', new THREE.BufferAttribute(lungColors, 3));

    // Particle sprite material
    const lungMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lungsPoints = new THREE.Points(lungGeometry, lungMat);
    thoraxGroup.add(lungsPoints);

    // 6. Cardiac Silhouette Node (Pulsing 72 bpm Lub-Dub Heart)
    const heartGroup = new THREE.Group();
    heartGroup.position.set(-1.15, -0.6, 1.3);

    const heartInnerGeom = new THREE.IcosahedronGeometry(1.4, 2);
    const heartInnerMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xbe123c,
      emissiveIntensity: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const heartInner = new THREE.Mesh(heartInnerGeom, heartInnerMat);
    heartGroup.add(heartInner);

    // Glowing cardiac aura sphere
    const heartAuraGeom = new THREE.SphereGeometry(1.65, 16, 16);
    const heartAuraMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.12,
      wireframe: false,
      blending: THREE.AdditiveBlending,
    });
    const heartAura = new THREE.Mesh(heartAuraGeom, heartAuraMat);
    heartGroup.add(heartAura);

    thoraxGroup.add(heartGroup);

    // 7. Medical Laser Scan Beam (Sweeping Plane + Laser Line)
    const scanBeamGroup = new THREE.Group();
    const planeGeom = new THREE.PlaneGeometry(16, 12, 16, 12);
    planeGeom.rotateX(-Math.PI / 2);

    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const scanPlane = new THREE.Mesh(planeGeom, planeMat);
    scanBeamGroup.add(scanPlane);

    // Bright neon perimeter laser ring
    const laserRingGeom = new THREE.RingGeometry(5.8, 6.0, 32);
    laserRingGeom.rotateX(-Math.PI / 2);
    const laserRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const laserRing = new THREE.Mesh(laserRingGeom, laserRingMat);
    scanBeamGroup.add(laserRing);

    thoraxGroup.add(scanBeamGroup);

    // 8. Holographic HUD Diagnostic Callout Pins (3D markers)
    const pins = [
      { id: 'pin-apex', label: 'R. Apical Zone', status: 'Clear · No Pneumothorax', pos: [3.2, 4.4, 1.2], color: '#00f2fe' },
      { id: 'pin-carina', label: 'Tracheal Carina', status: 'Bifurcation Normal', pos: [0, 2.2, 0.4], color: '#38bdf8' },
      { id: 'pin-heart', label: 'Cardiothoracic Ratio', status: '0.44 (Normal < 0.50)', pos: [-2.4, -0.6, 2.2], color: '#f43f5e' },
      { id: 'pin-costo', label: 'L. Costophrenic Sulcus', status: 'Acute & Sharp · No Effusion', pos: [-4.6, -4.2, 1.8], color: '#10b981' },
    ];

    const pinMeshes = [];
    pins.forEach((p) => {
      const pinGeom = new THREE.SphereGeometry(0.24, 12, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color), transparent: true, opacity: 0.95 });
      const pinMesh = new THREE.Mesh(pinGeom, pinMat);
      pinMesh.position.set(...p.pos);

      // Pulse ring around pin
      const ringGeom = new THREE.RingGeometry(0.35, 0.45, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color), transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      pinMesh.add(ring);

      pinMesh.userData = p;
      thoraxGroup.add(pinMesh);
      pinMeshes.push({ mesh: pinMesh, ring, data: p });
    });

    // 9. Interactive Drag & Mouse Orbit
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotY += deltaX * 0.008;
        targetRotX += deltaY * 0.006;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        // Subtle Parallax
        const rect = container.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        targetRotY = nx * 0.45;
        targetRotX = ny * 0.35;
      }
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.02, 14, 38);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Touch support for mobile / touchpads
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.006;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const onTouchEnd = () => { isDragging = false; };
    dom.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    // 10. Animation Loop
    let animationId;
    let clock = new THREE.Clock();
    let frameCount = 0;
    let lastFpsUpdate = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // FPS Calculation
      frameCount++;
      if (elapsed - lastFpsUpdate > 1.0) {
        setHudStats((prev) => ({
          ...prev,
          fps: Math.round(frameCount / (elapsed - lastFpsUpdate)),
        }));
        frameCount = 0;
        lastFpsUpdate = elapsed;
      }

      // Smooth Rotation Interpolation
      rotX += (targetRotX - rotX) * 0.07;
      rotY += (targetRotY - rotY) * 0.07;

      if (stateRef.current.autoRotate && !isDragging) {
        targetRotY += 0.0035;
      }

      thoraxGroup.rotation.x = rotX;
      thoraxGroup.rotation.y = rotY;

      // Visibility layers
      ribsGroup.visible = stateRef.current.ribs;
      spineGroup.visible = stateRef.current.ribs;
      lungsPoints.visible = stateRef.current.lungs;
      heartGroup.visible = stateRef.current.heart;
      scanBeamGroup.visible = stateRef.current.scanBeam;

      // A. Respiratory Breathing Simulation (Sinusoidal Expansion)
      const breathPhase = elapsed * 1.8;
      const breathExpandY = Math.sin(breathPhase) * 0.18;
      const breathExpandX = Math.sin(breathPhase) * 0.12;

      const posAttr = lungGeometry.attributes.position;
      const posArray = posAttr.array;

      for (let i = 0; i < lungPointsCount; i++) {
        const idx = i * 3;
        const bx = lungBasePositions[idx];
        const by = lungBasePositions[idx + 1];
        const bz = lungBasePositions[idx + 2];

        // Animate particles outward during inhalation
        posArray[idx] = bx * (1.0 + breathExpandX);
        posArray[idx + 1] = by * (1.0 + breathExpandY);
        posArray[idx + 2] = bz;
      }
      posAttr.needsUpdate = true;

      // B. Cardiac Pulse (Dual 72 bpm Lub-Dub beat)
      const heartCycle = (elapsed * 1.2) % 1.0;
      let heartScale = 1.0;
      if (heartCycle < 0.12) {
        heartScale = 1.0 + Math.sin((heartCycle / 0.12) * Math.PI) * 0.22; // Atrial Lub
      } else if (heartCycle > 0.16 && heartCycle < 0.34) {
        heartScale = 1.0 + Math.sin(((heartCycle - 0.16) / 0.18) * Math.PI) * 0.32; // Ventricular Dub
      }
      heartGroup.scale.set(heartScale, heartScale, heartScale);

      // C. Sweeping Laser Beam (Vertical Transverse Scan)
      const scanY = Math.sin(elapsed * 1.4) * 6.5;
      scanBeamGroup.position.y = scanY;
      laserRing.rotation.z = elapsed * 1.5;

      // Update telemetry
      if (Math.random() < 0.05) {
        setHudStats((prev) => ({
          ...prev,
          lungVolumePct: Math.round(92 + (breathExpandY + 0.18) * 45),
          scanSliceZ: `${scanY >= 0 ? '+' : ''}${scanY.toFixed(1)} cm`,
        }));
      }

      // D. Animate diagnostic pins
      pinMeshes.forEach(({ ring }) => {
        ring.rotation.z = elapsed * 2.0;
        const ringScale = 1.0 + Math.sin(elapsed * 4.0) * 0.2;
        ring.scale.set(ringScale, ringScale, ringScale);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const toggleLayer = (key) => {
    setActiveLayer((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', borderRadius: 'inherit', background: 'radial-gradient(ellipse at center, #0d1a2d 0%, #060b14 85%)' }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Sub-header Telemetry Strip (Safely below .pv-viewport-topbar at top: 10px) */}
      <div style={{ position: 'absolute', top: 38, left: 10, right: 10, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: 10, color: 'rgba(0, 242, 254, 0.85)', zIndex: 3 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>FOV: 45°</span>
          <span>·</span>
          <span>Slice: <b style={{ color: '#38bdf8' }}>{hudStats.scanSliceZ}</b></span>
          <span>·</span>
          <span>Heart: <b style={{ color: '#f43f5e' }}>{hudStats.heartRateBpm} BPM</b></span>
        </div>
        <div style={{ color: 'rgba(129, 140, 248, 0.85)' }}>
          FPS: {hudStats.fps}
        </div>
      </div>

      {/* Floating Anatomical Hotspot Tags (Above layer toggles) */}
      <div style={{ position: 'absolute', bottom: 62, left: 6, right: 6, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto', zIndex: 4 }}>
        <button
          onClick={() => {
            const p = { title: 'R. Apical Zone', desc: 'Upper lung field clear without pneumothorax or apical cavitation.' };
            setActivePin(p);
            onSelectPin?.(p);
          }}
          style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: 12, padding: '2px 8px', fontSize: 10, color: '#00f2fe', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
        >
          📍 Apex
        </button>
        <button
          onClick={() => {
            const p = { title: 'Cardiothoracic Ratio', desc: 'Max transverse cardiac diameter / thoracic width = 0.44 (Normal < 0.50).' };
            setActivePin(p);
            onSelectPin?.(p);
          }}
          style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 12, padding: '2px 8px', fontSize: 10, color: '#fb7185', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
        >
          ❤️ Heart (CTR 0.44)
        </button>
        <button
          onClick={() => {
            const p = { title: 'Costophrenic Angles', desc: 'Bilateral costophrenic recesses acute and sharp; no pleural effusion.' };
            setActivePin(p);
            onSelectPin?.(p);
          }}
          style={{ background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 12, padding: '2px 8px', fontSize: 10, color: '#34d399', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
        >
          🫁 Costophrenic
        </button>
      </div>

      {/* Active Pin Info Popover */}
      {activePin && (
        <div style={{ position: 'absolute', bottom: 92, left: 10, right: 10, maxWidth: 320, margin: '0 auto', background: 'rgba(10, 18, 30, 0.94)', border: '1px solid #00f2fe', borderRadius: 8, padding: '10px 12px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ color: '#00f2fe', fontSize: 12 }}>{activePin.title}</b>
            <button onClick={() => setActivePin(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}>✕</button>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#e2e8f0', lineHeight: 1.35 }}>{activePin.desc}</p>
        </div>
      )}

      {/* Bottom Control Bar: Layer Toggles (Safely above .pv-telemetry-bar at bottom: 0) */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: 6,
        right: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flexWrap: 'wrap',
        background: 'rgba(11, 20, 34, 0.88)',
        padding: '3px 6px',
        borderRadius: 8,
        border: '1px solid rgba(0, 242, 254, 0.25)',
        backdropFilter: 'blur(8px)',
        zIndex: 4
      }}>
        {[
          ['ribs', 'Ribs', '#00f2fe'],
          ['lungs', 'Lungs', '#38bdf8'],
          ['heart', 'Heart', '#f43f5e'],
          ['scanBeam', 'Laser', '#10b981'],
        ].map(([key, label, col]) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            title={`Toggle ${label} layer`}
            style={{
              background: activeLayer[key] ? `rgba(${key === 'heart' ? '244,63,94' : '0,242,254'}, 0.2)` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${activeLayer[key] ? col : 'rgba(255,255,255,0.15)'}`,
              color: activeLayer[key] ? '#fff' : '#94a3b8',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              lineHeight: '16px',
              transition: 'all 0.15s ease'
            }}
          >
            {activeLayer[key] ? '● ' : '○ '}
            {label}
          </button>
        ))}

        <button
          onClick={() => toggleLayer('autoRotate')}
          title="Toggle rotation"
          style={{
            background: activeLayer.autoRotate ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${activeLayer.autoRotate ? '#818cf8' : 'rgba(255,255,255,0.15)'}`,
            color: activeLayer.autoRotate ? '#c7d2fe' : '#94a3b8',
            borderRadius: 4,
            padding: '2px 7px',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            lineHeight: '16px',
            transition: 'all 0.15s ease'
          }}
        >
          {activeLayer.autoRotate ? '⟳ Orbit' : '⏸ Pause'}
        </button>
      </div>
    </div>
  );
}
