import React, {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Basic phoneme → mouth shape mapping
const PHONEME_MAP = {
  A: 0.8, // "Aa", "Ah"
  E: 0.65, // "Ee"
  I: 0.6, // "Ih"
  O: 0.75, // "Oh"
  U: 0.7, // "Uh", "Oo"
  M: 0.1, // closed-ish
  F: 0.15, // teeth touch
  S: 0.2, // narrow mouth
  default: 0.25,
};

function getPhonemeShape(text) {
  if (!text) return PHONEME_MAP.default;

  const last = text.slice(-1).toLowerCase();

  if ("a" === last) return PHONEME_MAP.A;
  if ("e" === last) return PHONEME_MAP.E;
  if ("i" === last) return PHONEME_MAP.I;
  if ("o" === last) return PHONEME_MAP.O;
  if ("u" === last) return PHONEME_MAP.U;
  if ("m" === last) return PHONEME_MAP.M;
  if ("f" === last) return PHONEME_MAP.F;
  if ("s" === last) return PHONEME_MAP.S;

  return PHONEME_MAP.default;
}

const Avatar = forwardRef(({ speaking, spokenText }, ref) => {
  const group = useRef();
  const glb = useGLTF("https://models.readyplayer.me/6917ab90fb99478e41a01105.glb");
  const { scene } = glb;

  const morphs = useRef({});
  const mouthTarget = useRef(0);
  const smoothMouth = useRef(0);

  // blinking
  const blinkTimer = useRef(0);
  const blinkValue = useRef(0);

  // head motion
  const headRef = useRef();

  // eye tracking
  const eyeLeft = useRef();
  const eyeRight = useRef();

  useEffect(() => {
    // Center avatar
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center);

    scene.traverse((obj) => {
      if (obj.isMesh && obj.morphTargetDictionary) {
        Object.entries(obj.morphTargetDictionary).forEach(([name, index]) => {
          morphs.current[name] = { mesh: obj, index };
        });
      }
      // Detect head + eyes automatically
      if (obj.name.toLowerCase().includes("head")) headRef.current = obj;
      if (obj.name.toLowerCase().includes("eye") && obj.name.includes("Left"))
        eyeLeft.current = obj;
      if (obj.name.toLowerCase().includes("eye") && obj.name.includes("Right"))
        eyeRight.current = obj;
    });
  }, [scene]);

  // lip sync based on phoneme changes
  useEffect(() => {
    if (!spokenText) return;
    const words = spokenText.split("");

    let i = 0;
    const interval = setInterval(() => {
      const w = words[i];
      mouthTarget.current = getPhonemeShape(w);
      i++;
      if (i >= words.length) {
        clearInterval(interval);
        mouthTarget.current = 0;
      }
    }, 60);

    return () => clearInterval(interval);
  }, [spokenText]);

  useFrame((state, delta) => {
    // Smooth mouth interpolation
    smoothMouth.current = THREE.MathUtils.lerp(
      smoothMouth.current,
      mouthTarget.current,
      0.25
    );

    // Apply to morphs
    const mouth = morphs.current["JawOpen"] || morphs.current["mouthOpen"];
    if (mouth) {
      mouth.mesh.morphTargetInfluences[mouth.index] = smoothMouth.current;
    }

    // Idle breathing
    if (group.current) {
      group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
    }

    // Subtle head movement
    if (headRef.current) {
      const t = state.clock.elapsedTime;
      if (speaking) {
        headRef.current.rotation.x = Math.sin(t * 3) * 0.03;
        headRef.current.rotation.y = Math.sin(t * 2) * 0.02;
      } else {
        headRef.current.rotation.x = Math.sin(t * 1.5) * 0.015;
      }
    }

    // Eye contact (look towards camera)
    const target = new THREE.Vector3(0, 1.5, 3);
    [eyeLeft.current, eyeRight.current].forEach((eye) => {
      if (eye) eye.lookAt(target);
    });

    // blinking system
    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0) {
      blinkTimer.current = 2 + Math.random() * 3;
      blinkValue.current = 1;
    }

    blinkValue.current = THREE.MathUtils.lerp(blinkValue.current, 0, 0.2);

    ["EyeBlinkLeft", "EyeBlinkRight"].forEach((k) => {
      if (morphs.current[k]) {
        morphs.current[k].mesh.morphTargetInfluences[morphs.current[k].index] =
          blinkValue.current;
      }
    });
  });

  useImperativeHandle(ref, () => ({
    setMouthLevel(value) {
      mouthTarget.current = value;
    },
  }));

  return (
    <group ref={group} position={[0, -1, 0]}>
      <primitive object={scene} />
    </group>
  );
});

export default Avatar;
