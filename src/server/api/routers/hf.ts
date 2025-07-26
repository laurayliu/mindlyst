// src/server/api/routers/hf.ts
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env.js";

// Get API token and models from environment variables
const HF_ACCESS_TOKEN = env.HF_ACCESS_TOKEN as string;
const HF_TASK_EXTRACTION_MODEL = env.HF_TASK_EXTRACTION_MODEL as string; // This will now include ':featherless-ai'

// Base URLs for Hugging Face Inference API
const HF_TASK_EXTRACTION_API_URL = "https://router.huggingface.co/v1/chat/completions";

// Define the expected output structure for individual tasks (for extraction)
const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  notes: z.string().optional(),
});

const hfErrorResponseSchema = z.object({
  error: z.union([ // The 'error' field can be a string OR an object
    z.string(),
    z.object({
      message: z.string(),
      type: z.string().optional(),
      param: z.string().optional(),
      code: z.string().optional(),
    }).passthrough(), // Allow other fields in the error object
  ]),
  estimated_time: z.number().optional(),
}).passthrough();

// Schema for the Chat Completions API response for Mistral
const hfChatCompletionsResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
  // Add other fields you might want to validate if needed, eg., id, model, etc.
});

export const hfRouter = createTRPCRouter({

  // --- Task Extraction Procedure (ADAPTED FOR MISTRAL CHAT COMPLETIONS ENDPOINT) ---
  extractTasks: publicProcedure
    .input(
      z.object({
        text: z.string().min(50, "Please provide more details (min 50 chars) for task extraction."),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // PROMPT FORMAT FOR MISTRAL-INSTRUCT MODELS (within 'messages' array)
        const chatPromptContent = `[INST] You are a helpful assistant. From the following text, extract a list of distinct, actionable tasks. For each task, provide a "title" and optional "notes". Respond ONLY with a JSON array of tasks. Do not include any other text or explanation.

        Example Input:
        "I need to buy groceries: milk, eggs, bread. Also, call mom by end of day. And prepare the presentation slides for tomorrow's meeting."
        Example Output:
        [
          {"title": "Buy groceries", "notes": "milk, eggs, bread"},
          {"title": "Call mom", "notes": "by end of day"},
          {"title": "Prepare presentation slides", "notes": "for tomorrow's meeting"}
        ]

        Example Input:
        "Tomorrow, I have to finish the report and send it to Sarah. Don't forget to pay the bills online by the end of the week."
        Example Output:
        [
          {"title": "Finish report", "notes": "send to Sarah"},
          {"title": "Pay bills", "notes": "online by end of week"}
        ]

        Now, extract tasks from this text:
        "${input.text}" [/INST]`;

        const response = await fetch(HF_TASK_EXTRACTION_API_URL, {
          headers: {
            "Authorization": `Bearer ${HF_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            model: HF_TASK_EXTRACTION_MODEL,
            messages: [
              {
                role: "user",
                content: chatPromptContent,
              },
            ],
            max_tokens: 500,
            temperature: 0.0,
          }),
        });

        if (!response.ok) {
          let rawErrorBody: unknown;
          const contentType = response.headers.get("content-type");
          const isJson = contentType?.includes("application/json") ?? false;

          if (isJson) {
            rawErrorBody = await response.json();
          } else {
            rawErrorBody = await response.text();
          }

          let errorMessageDetail = String(rawErrorBody);

          if (isJson) {
            try {
              const parsedErrorBody = hfErrorResponseSchema.parse(rawErrorBody);
              errorMessageDetail = typeof parsedErrorBody.error === 'string'
                ? parsedErrorBody.error
                : parsedErrorBody.error?.message || JSON.stringify(parsedErrorBody.error);
              if (parsedErrorBody.estimated_time) {
                errorMessageDetail += ` (Estimated wait: ${parsedErrorBody.estimated_time.toFixed(1)}s)`;
              }
            } catch (parseError) {
              console.warn("Failed to parse Hugging Face error response (expected JSON) for task extraction:", parseError);
            }
          }

          console.error("Hugging Face API Task Extraction Error:", response.status, rawErrorBody);
          if (response.status === 503) {
            throw new Error(`Hugging Face model is loading or busy for task extraction: ${errorMessageDetail}. Please try again in a few moments.`);
          }
          if (response.status === 400 && errorMessageDetail.includes("model_not_supported")) {
             throw new Error(`Hugging Face API error (400 Model Not Supported): Task extraction model '${HF_TASK_EXTRACTION_MODEL}' is not supported by your enabled providers/plan for this endpoint. Please verify model string and access.`);
          }
          if (response.status === 404) {
            throw new Error(`Hugging Face API error (404 Not Found): Task extraction model '${HF_TASK_EXTRACTION_MODEL}' might be incorrect, private, or not available on the public inference API, or you're using the wrong endpoint/payload format.`);
          }
          throw new Error(`Hugging Face API task extraction error (${response.status}): ${errorMessageDetail}`);
        }

        const rawHfResult: unknown = await response.json();
        const hfResult = hfChatCompletionsResponseSchema.parse(rawHfResult);

        let extractedText = "";
        if (hfResult.choices && hfResult.choices.length > 0 && hfResult.choices[0]?.message?.content) {
          extractedText = hfResult.choices[0].message.content;
        } else {
          throw new Error("No text generated from Hugging Face for task extraction.");
        }

        let tasks: z.infer<typeof taskSchema>[] = [];
        try {
          const parsed = JSON.parse(extractedText) as unknown[];
          tasks = z.array(taskSchema).parse(parsed);
        } catch (jsonError: unknown) {
          console.error("Failed to parse AI output as JSON:", jsonError);
          console.error("AI Raw Output for Tasks:", extractedText);
          const parseErrorMessage = jsonError instanceof Error ? jsonError.message : "Invalid JSON format";
          throw new Error(`AI returned unparseable or invalid JSON for tasks: ${parseErrorMessage}. Please refine your input or try again. Raw AI output logged.`);
        }

        return {
          success: true,
          extractedTasks: tasks,
        };
      } catch (error: unknown) {
        console.error("Error extracting tasks with Hugging Face:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to extract tasks: ${errorMessage}. Ensure your HF model is suitable for instruction following and try a more specific input.`);
      }
    }),
});