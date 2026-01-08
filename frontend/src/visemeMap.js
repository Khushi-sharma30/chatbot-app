// frontend/src/visemeMap.js
// Typical Azure viseme ids (0..15) => mouth openness value
const visemeMap = {
  0: 0.0,  // silence
  1: 0.05, // PP (closed)
  2: 0.05, // FF (lips)
  3: 0.15, // TH
  4: 0.15, // DD
  5: 0.2,  // kk
  6: 0.25, // CH
  7: 0.35, // SS
  8: 0.3,  // nn
  9: 0.4,  // RR
  10: 0.5, // aa
  11: 0.55, // E
  12: 0.45, // I
  13: 0.6,  // O
  14: 0.7,  // U
  15: 0.0   // silence/other
};

export default visemeMap;
