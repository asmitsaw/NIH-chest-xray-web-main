import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './CinematicScrollExperience.css';

// Register GSAP ScrollTrigger plugin safely
gsap.registerPlugin(ScrollTrigger);

const VIDEO_SRC = '/videos/chestx-scroll-master.mp4';
const POSTER_SRC = '/videos/chestx-poster.jpg';

// Exact 5-scene narrative storyboard requested in spec
const SCENES = [
  {
    id: 1,
    phase: 'PHASE 01 // THE REVEAL',
    headline: ['BEYOND WHAT', 'THE EYE CAN SEE.'],
    copy: 'Every radiograph holds a deeper story.',
    voi: 'ANATOMICAL THORAX',
    start: 0.0,
    end: 0.20,
  },
  {
    id: 2,
    phase: 'PHASE 02 // THE ANATOMY',
    headline: ['INSIDE EVERY', 'BREATH.'],
    copy: 'Explore the complexity of thoracic anatomy.',
    voi: 'PULMONARY PARENCHYMA',
    start: 0.20,
    end: 0.40,
  },
  {
    id: 3,
    phase: 'PHASE 03 // THE RADIOGRAPH',
    headline: ['EVERY IMAGE', 'TELLS A STORY.'],
    copy: 'Transform radiographic images into meaningful insights.',
    voi: 'CORONAL FRONTAL VIEW',
    start: 0.40,
    end: 0.60,
  },
  {
    id: 4,
    phase: 'PHASE 04 // THE INTELLIGENCE',
    headline: ['SEE WHAT', 'AI CAN REVEAL.'],
    copy: 'Explainable AI. Visual insights. Clinical review.',
    voi: 'GRAD-CAM FEATURE ATTRIBUTION',
    start: 0.60,
    end: 0.80,
  },
  {
    id: 5,
    phase: 'PHASE 05 // THE PLATFORM',
    headline: ['THE FUTURE OF', 'RADIOGRAPH INTELLIGENCE.'],
    copy: 'Discover Chest-X AI.',
    cta: 'Explore the Platform',
    voi: 'CLINICAL DECISION SUPPORT',
    start: 0.80,
    end: 1.00,
  },
];

export default function CinematicScrollExperience({ onExplore, onLoginClick, onNavClick }) {
  const wrapperRef = useRef(null);
  const pinRef = useRef(null);
  const videoRef = useRef(null);
  const sceneElsRef = useRef([]);

  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // High performance video seek state tracking refs
  const videoDurationRef = useRef(0);
  const targetTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const lastAssignedTimeRef = useRef(-1);
  const rafIdRef = useRef(null);
  const isMetadataLoadedRef = useRef(false);

  // Coalesced RAF seek execution loop
  const executeSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isMetadataLoadedRef.current || !videoDurationRef.current) return;

    const targetTime = targetTimeRef.current;
    const timeDelta = Math.abs(video.currentTime - targetTime);

    // Only seek if difference exceeds threshold (30ms = ~1 video frame) and not already in seek
    if (timeDelta > 0.03 && !isSeekingRef.current) {
      // Avoid assigning identical timestamp
      if (Math.abs(lastAssignedTimeRef.current - targetTime) > 0.01) {
        lastAssignedTimeRef.current = targetTime;
        isSeekingRef.current = true;

        if (typeof video.fastSeek === 'function') {
          try {
            video.fastSeek(targetTime);
          } catch {
            video.currentTime = targetTime;
          }
        } else {
          video.currentTime = targetTime;
        }
      }
    }
  }, []);

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const dur = video.duration;
    if (Number.isFinite(dur) && dur > 0) {
      videoDurationRef.current = dur;
      isMetadataLoadedRef.current = true;
      video.currentTime = 0;
      video.pause();
      setIsVideoLoaded(true);
    }
  };

  const handleSeeked = () => {
    isSeekingRef.current = false;
    // Catch-up if user kept scrolling while previous seek was resolving
    executeSeek();
  };

  // Setup GSAP Context & ScrollTrigger
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const pin = pinRef.current;
    const video = videoRef.current;
    if (!wrapper || !pin || !video) return;

    // Continuous RAF loop for silky-smooth coalesced seeks
    const tick = () => {
      executeSeek();
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    // Create GSAP Context for atomic lifecycle cleanup
    const ctx = gsap.context(() => {
      // 1. Primary Pinning & Video Scrub Trigger
      ScrollTrigger.create({
        trigger: wrapper,
        start: 'top top',
        end: '+=500%', // 500vh scroll distance for rich cinematic pacing
        pin: pin,
        pinSpacing: true,
        scrub: 0.4, // Smooth scrub avoids sudden jitter
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress; // 0.0 to 1.0
          setScrollPct(Math.round(p * 100));

          // Map normalized scroll progress directly to video duration
          if (videoDurationRef.current > 0) {
            const targetSec = Math.min(
              Math.max(p * videoDurationRef.current, 0.001),
              videoDurationRef.current - 0.001
            );
            targetTimeRef.current = targetSec;
          }

          // Determine active storyboard scene
          const sceneIndex = Math.min(Math.floor(p * 5), 4);
          setActiveSceneIdx(sceneIndex);
        },
      });

      // No competing timelines: the active scene is cleanly displayed by activeSceneIdx state
    }, wrapper);

    return () => {
      ctx.revert();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [executeSeek]);

  const activeScene = SCENES[activeSceneIdx] || SCENES[0];

  return (
    <div className="cx-cinematic-wrapper" ref={wrapperRef}>
      {/* Pinned 100vh Viewport Section */}
      <section className="cx-cinematic-pin" ref={pinRef}>
        
        {/* Background Fullscreen Video Engine */}
        <div className="cx-video-canvas-layer">
          <video
            ref={videoRef}
            className="cx-scrub-video"
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onSeeked={handleSeeked}
          />
          <div className="cx-video-gradient-overlay" />
          <div className="cx-grid-overlay" />
        </div>

        {/* Pinned Storyboard Center Stage Typography (Strictly single active scene to avoid any collision) */}
        <div className="cx-storyboard-layer">
          {SCENES.map((scene, idx) => {
            const isActive = idx === activeSceneIdx;
            return (
              <div
                key={scene.id}
                className={`cx-scene-container ${isActive ? 'cx-scene-active' : 'cx-scene-inactive'}`}
              >
                <div className="cx-phase-tag">{scene.phase}</div>
                <h1 className="cx-scene-headline">
                  <span>{scene.headline[0]}</span>
                  <span className="cx-accent-line">{scene.headline[1]}</span>
                </h1>
                <p className="cx-scene-copy">{scene.copy}</p>

                {scene.cta && (
                  <button type="button" className="cx-scene-cta-btn" onClick={onExplore}>
                    <span>{scene.cta}</span>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll Prompt (Fades as scroll progresses) */}
        <div
          className="cx-scroll-prompt"
          style={{ opacity: scrollPct > 8 ? 0 : 1, transition: 'opacity 0.4s ease' }}
        >
          <div className="cx-prompt-mouse">
            <div className="cx-prompt-wheel" />
          </div>
          <span className="cx-prompt-text">Scroll to control video</span>
        </div>

        {/* Bottom HUD Telemetry & Live Scrub Progress Bar */}
        <footer className="cx-hud-footer">
          <div className="cx-telemetry-left">
            <span className="cx-telemetry-item">
              VOI: <b>{activeScene.voi}</b>
            </span>
            <span className="cx-telemetry-item">
              MODEL: <b>DENSENET-121</b>
            </span>
            <span className="cx-telemetry-item">
              FOV: <b>224×224</b>
            </span>
            <span className="cx-telemetry-item">
              SIGMOID HEADS: <b>14 NIH PATHOLOGIES</b>
            </span>
          </div>

          <div className="cx-progress-right">
            <div className="cx-scene-counter">
              <span>0{activeScene.id}</span> / 05
            </div>
            <div className="cx-scrub-bar-track">
              <div
                className="cx-scrub-bar-fill"
                style={{ width: `${scrollPct}%` }}
              />
            </div>
            <div className="cx-scrub-pct">{scrollPct}%</div>
          </div>
        </footer>

      </section>
    </div>
  );
}
