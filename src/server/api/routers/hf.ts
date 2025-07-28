import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { env } from "~/env.js";

const HF_ACCESS_TOKEN = env.HF_ACCESS_TOKEN;
const HF_TASK_EXTRACTION_MODEL = env.HF_TASK_EXTRACTION_MODEL;

// gotta use the specific chat completions endpoint for mistral
const HF_TASK_EXTRACTION_API_URL = "https://router.huggingface.co/v1/chat/completions";

// expected output structure for tasks
const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  notes: z.string().optional(),
});

// update; error can be string or object
const hfErrorResponseSchema = z.object({
  error: z.union([
    z.string(),
    z.object({
      message: z.string(),
      type: z.string().optional(),
      param: z.string().optional(),
      code: z.string().optional(),
    }).passthrough(),
  ]),
  estimated_time: z.number().optional(),
}).passthrough();

// schema for chat completions api response for mistral
const hfChatCompletionsResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    }),
  ),
});

export const hfRouter = createTRPCRouter({
  extractTasks: publicProcedure
    .input(
      z.object({
        text: z.string().min(50, "Please provide more details (min 50 chars) for task extraction"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // prompt format for mistral-instruct model
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
            temperature: 0.0, // deterministic for getting json
          }),
        });

        if (!response.ok) {
          // handle non-200 http responses
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
            throw new Error(`Hugging Face model is loading or busy for task extraction: ${errorMessageDetail}. Please try again in a few moments`);
          }
          if (response.status === 400 && errorMessageDetail.includes("model_not_supported")) {
             throw new Error(`Hugging Face API error (400 Model Not Supported): Task extraction model '${HF_TASK_EXTRACTION_MODEL}' is not supported by your enabled providers/plan for this endpoint. Please verify model string and access`);
          }
          if (response.status === 404) {
            throw new Error(`Hugging Face API error (404 Not Found): Task extraction model '${HF_TASK_EXTRACTION_MODEL}' might be incorrect, private, or not available on the public inference API, or you're using the wrong endpoint/payload format`);
          }
          throw new Error(`Hugging Face API task extraction error (${response.status}): ${errorMessageDetail}`);
        }

        // handles 200 OK responses
        const rawHfResult: unknown = await response.json();
        console.log("Raw HF Chat Completions Response:", JSON.stringify(rawHfResult, null, 2)); // diagnostic logging for now

        let hfResult;
        try {
            hfResult = hfChatCompletionsResponseSchema.parse(rawHfResult);
        } catch (zodError: unknown) {
            console.error("Zod Validation Failed for HF Chat Completions Response:", zodError);
            console.error("Raw response that failed validation:", JSON.stringify(rawHfResult, null, 2));
            const errorMessage = zodError instanceof Error ? zodError.message : "Invalid response structure from AI";
            throw new Error(`Failed to parse AI response: ${errorMessage}. The AI might be returning an unexpected format or an internal error`);
        }

        let extractedText = "";
        if (hfResult.choices && hfResult.choices.length > 0 && hfResult.choices[0]?.message?.content) {
          extractedText = hfResult.choices[0].message.content;
        } else {
          throw new Error("No text generated from Hugging Face for task extraction");
        }

        let tasks: z.infer<typeof taskSchema>[] = [];
        try {
          const parsed = JSON.parse(extractedText) as unknown[];
          tasks = z.array(taskSchema).parse(parsed);
        } catch (jsonError: unknown) {
          console.error("Failed to parse AI output as JSON:", jsonError);
          console.error("AI Raw Output for Tasks:", extractedText);
          const parseErrorMessage = jsonError instanceof Error ? jsonError.message : "Invalid JSON format";
          throw new Error(`AI returned unparseable or invalid JSON for tasks: ${parseErrorMessage}. Please refine your input or try again. Raw AI output logged`);
        }

        return {
          success: true,
          extractedTasks: tasks,
        };
      } catch (error: unknown) {
        console.error("Error extracting tasks with Hugging Face:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        throw new Error(`Failed to extract tasks: ${errorMessage}. Ensure your HF model is suitable for instruction following and try a more specific input`);
      }
    }),
});