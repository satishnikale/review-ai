import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { CommentCategory, Severity } from "../lib/prisma";
import type { GeminiComment, ReviewJobData } from "../types/review";

const geminiCommentSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  category: z.nativeEnum(CommentCategory),
  severity: z.nativeEnum(Severity),
  comment: z.string().min(1),
  suggestion: z.string().optional(),
});

const geminiResponseSchema = z.array(geminiCommentSchema);
const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

function stripJsonFences(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function categoryFilter(prefs: ReviewJobData["prefs"]): string {
  return [
    prefs.checkBugs ? "BUG" : null,
    prefs.checkSec ? "SECURITY" : null,
    prefs.checkPerf ? "PERFORMANCE" : null,
    prefs.checkStyle ? "STYLE" : null,
    "SUGGESTION",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function reviewDiffWithGemini(
  diffText: string,
  prefs: ReviewJobData["prefs"],
): Promise<GeminiComment[]> {
  if (!diffText.trim()) {
    return [];
  }

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: "Return ONLY a JSON array. Each item must include file, line, category, severity, comment, and optional suggestion. No markdown. No preamble.",
          },
        ],
      },
    });

    const prompt = `Review this pull request diff. Focus only on these categories: ${categoryFilter(
      prefs,
    )}. Valid categories: BUG, SECURITY, PERFORMANCE, STYLE, SUGGESTION. Valid severities: LOW, MEDIUM, HIGH, CRITICAL.\n\n${diffText}`;
    const result = await model.generateContent([{ text: prompt }]);
    const rawText = result.response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(rawText)) as unknown;
    } catch (err) {
      logger.warn({ err, rawText }, "Gemini returned non-JSON output");
      return [];
    }

    const validated = geminiResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn({ issues: validated.error.issues }, "Gemini returned invalid review schema");
      return [];
    }

    return validated.data;
  } catch (err) {
    logger.warn({ err }, "Gemini review failed");
    return [];
  }
}
