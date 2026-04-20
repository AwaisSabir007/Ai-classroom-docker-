import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SessionState {
  classTitle: string;
  subject: string;
  avgAttention: number;
  dominantEmotion: string;
  recentTranscript: string;
  studentCount: number;
}

export interface TeacherIntervention {
  type: "TEACHER_ALERT" | "QUIZ_SUGGESTION" | "CLARIFICATION_PROMPT";
  priority: "high" | "medium" | "low";
  message: string;
  suggestedAction?: string;
}

export async function analyzeSessionState(state: SessionState): Promise<TeacherIntervention | null> {
  // Only trigger if focus is low or emotion is negative
  if (state.avgAttention > 85 && state.dominantEmotion === "focused") {
    return null; 
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the EduSense Agentic Co-Pilot, an expert pedagogical assistant. 
          Your goal is to monitor live classroom data and provide proactive suggestions to the teacher to improve engagement.
          
          Data provided:
          - Average Attention (0-100)
          - Dominant Emotion (focused, neutral, happy, confused, bored, distracted)
          - Recent Transcript (what the teacher just said)
          
          If engagement is low, suggest a specific intervention. 
          Keep messages concise, supportive, and actionable for a teacher in the middle of a lecture.
          Return a JSON object in this format:
          {
            "type": "TEACHER_ALERT" | "QUIZ_SUGGESTION" | "CLARIFICATION_PROMPT",
            "priority": "high" | "medium" | "low",
            "message": "The suggestion text",
            "suggestedAction": "A specific button action title like 'Launch Quiz'"
          }
          If no intervention is needed, return null.`
        },
        {
          role: "user",
          content: `Live Session Metrics:
          Class: ${state.classTitle} (${state.subject})
          Avg Attention: ${state.avgAttention}%
          Dominant Emotion: ${state.dominantEmotion}
          Recent Context: "${state.recentTranscript}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) return null;
    
    return JSON.parse(content) as TeacherIntervention;
  } catch (err) {
    console.error("Agentic Co-Pilot analysis failed:", err);
    return null;
  }
}
