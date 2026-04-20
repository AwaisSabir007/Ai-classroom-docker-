import { describe, it, expect } from 'vitest';

// We simulate the logic inside our Rust module to verify our pedagogical rules
// This is the "Software Logic" validation for the teacher.

const calculateEngagement = (shapes: { categoryName: string, score: number }[]) => {
  const getScore = (name: string) => shapes.find(s => s.categoryName === name)?.score || 0;

  const eyeBlink = (getScore("eyeBlinkLeft") + getScore("eyeBlinkRight")) / 2;
  const lookAway = (getScore("eyeLookOutLeft") + getScore("eyeLookInRight") + getScore("eyeLookUpLeft")) / 3;

  if (eyeBlink > 0.45) return { score: 15, emotion: "distracted" };
  if (lookAway > 0.4) return { score: 35, emotion: "bored" };
  
  return { score: 92, emotion: "focused" };
};

describe('EduSense Engagement Logic', () => {
  it('should detect boredom when eyes are looking away', () => {
    const mockShapes = [
      { categoryName: "eyeLookOutLeft", score: 0.6 },
      { categoryName: "eyeLookInRight", score: 0.6 },
      { categoryName: "eyeLookUpLeft", score: 0.2 }
    ];
    
    const result = calculateEngagement(mockShapes);
    expect(result.emotion).toBe('bored');
    expect(result.score).toBeLessThan(50);
  });

  it('should detect distraction when blinking/eyes closed', () => {
    const mockShapes = [
      { categoryName: "eyeBlinkLeft", score: 0.8 },
      { categoryName: "eyeBlinkRight", score: 0.8 }
    ];
    
    const result = calculateEngagement(mockShapes);
    expect(result.emotion).toBe('distracted');
    expect(result.score).toBe(15);
  });

  it('should detect focus when looking straight at the screen', () => {
    const mockShapes = [
      { categoryName: "eyeBlinkLeft", score: 0.1 },
      { categoryName: "eyeBlinkRight", score: 0.1 },
      { categoryName: "eyeLookOutLeft", score: 0.1 }
    ];
    
    const result = calculateEngagement(mockShapes);
    expect(result.emotion).toBe('focused');
    expect(result.score).toBeGreaterThan(80);
  });
});
