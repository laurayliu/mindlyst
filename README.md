# Mindlyst

**A smart assistant designed to transform your unstructured thoughts into actionable Google Tasks.**

This project was developed as part of an API challenge, serving as an exploration into integrating AI with personal productivity tools. It's built on the [T3 Stack](https://create.t3.gg/), bootstrapped with create-t3-app for a robust, type-safe, and performant developer experience.

## Deployed Application

Experience Mindlyst live:

**[Try Mindlyst Here](https://mindlyst.vercel.app/)**

## Demo

![Mindlyst Demo](https://github.com/user-attachments/assets/6a7a879d-fd38-446d-ad77-5545cffcf317)

## Features

*   **AI-Powered Task Extraction:** Transforms raw, unstructured text (like brainstorms or meeting notes) into a clear, actionable list of tasks using a powerful large language model from Hugging Face.
*   **Google Tasks Integration:** Seamlessly pushes extracted tasks directly to your Google Tasks account for the current day.
*   **Google Authentication:** Secure sign-in via NextAuth.js.
*   **Ambient UI:** Features a unique "glassmorphism" design with subtle, animated floating orbs in the background, aiming for a calm and focused user experience.
*   **Responsive Design:** Optimized for consistent usability across various devices.
*   **Serverless Performance:** Deployed on Vercel, leveraging Prisma Accelerate and Vercel Postgres for optimized database queries with reduced cold starts.

## Technologies Used

This project explores and utilizes the following technologies:

*   **[Next.js](https://nextjs.org)**: A React framework for full-stack web applications with App Router architecture.
*   **[NextAuth.js](https://next-auth.js.org)**: Flexible authentication for Next.js, integrated with Google OAuth.
*   **[Prisma](https://prisma.io)**: A next-generation ORM for Node.js and TypeScript.
*   **[Tailwind CSS](https://tailwindcss.com)**: A utility-first CSS framework, utilizing its v4 `@theme` directive for custom design tokens.
*   **[tRPC](https://trpc.io)**: End-to-end type-safe APIs.
*   **[Hugging Face Inference Endpoints (Mistral-7B-Instruct-v0.2)](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)**: For large language model capabilities (task extraction).
*   **[Google Tasks API](https://developers.google.com/tasks)**: For programmatic interaction with user tasks.
*   **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)**: A serverless PostgreSQL database integrated with Vercel.
*   **[Prisma Accelerate](https://www.prisma.io/data-platform/accelerate)**: A Prisma extension for enhanced database query performance.
*   **[Motion](https://motion.dev/)**: A powerful animation library for React.
*   **[React Icons](https://react-icons.github.io/react-icons/)**: A collection of popular icons.

## Local Setup Instructions

To run Mindlyst on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mindlyst.git
    cd mindlyst
    ```
2.  **Install dependencies:**
    ```bash
    npm install # or pnpm install / yarn install
    ```
3.  **Configure Environment Variables (`.env`):**
    *   Create a `.env` file from `.env.example`.
    *   Populate `AUTH_SECRET` (generate with `npx auth secret`).
    *   Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from [Google Cloud Console Setup](#google-cloud-console-setup)).
    *   Set `HF_ACCESS_TOKEN` (from [Hugging Face settings](https://huggingface.co/settings/tokens)).
    *   Set `HF_TASK_EXTRACTION_MODEL="mistralai/Mistral-7B-Instruct-v0.2:featherless-ai"`.
    *   Set `DATABASE_URL` by [connecting a Vercel Postgres instance](#vercel-postgres-setup). Use `vercel link` then `vercel env pull .env` to pull the URL locally.
4.  **Prepare Prisma:**
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init_database_schema
    ```
5.  **Start development server:**
    ```bash
    npm run dev # Open http://localhost:3000
    ```
    
---

## Learning Journey

### What inspired you to create this project?

I aimed to build something genuinely useful for my own productivity challenges. I often find myself overwhelmed by an unorganized stream of thoughts and tasks, hindering me from starting. The idea of quickly offloading a "brain dump" and having AI distill it into actionable Google Tasks that I regularly check (during the school year) felt like a significant step towards operationalizing thoughts into daily tasks. In addition, with the core functionality being relatively simple, I enjoyed dedicating time to UI customization. I explored Figma, experimented with hand-selected colors, and implemented an animated background with subtle interactions, trying to create a frontend that is aesthetic and enjoyable to use.

### What potential impact do you believe it could have on its intended users or the broader community?

Mindlyst could significantly benefit individuals struggling with mental overload and task initiation. By simplifying the process of transforming raw thoughts into structured, actionable items, it aims to lower the barrier to productivity. For the broader community, this project serves as a concrete example of applying large language models beyond traditional chatbot interfaces, demonstrating their utility in practical, daily problem-solving within personal productivity. It represents a small step towards integrating AI more seamlessly into everyday tools.

### What new technology did you learn?

*   **Hugging Face Inference Endpoints & API Interaction:** Gained hands-on experience interacting with specialized large language models (like Mistral-7B-Instruct-v0.2) via specific API endpoints and understanding their unique payload formats and authentication requirements.
*   **Google Tasks API:** Learned to programmatically interact with a third-party API for task management, including OAuth authentication flows.
*   **Prisma Postgres & Accelerate:** Explored migrating from a local SQLite database to a production-ready, serverless PostgreSQL database (Vercel Postgres) and implemented Prisma's Accelerate extension for optimized edge query performance.
*   **Tailwind CSS v4 `@theme` directive:** Mastered this new approach to defining and managing a custom design system directly within CSS.
*   **`motion`:** Gained practical experience implementing intricate UI animations for a polished user experience.

### Why did you choose this new technology?

I chose the T3 Stack for its robust, type-safe, and full-stack development paradigm, seeking more hands-on practice with its integrated tooling. The specific external APIs (Hugging Face for AI, Google Tasks for productivity) were selected for their direct relevance to the project's core purpose. Vercel Postgres and Prisma Accelerate were chosen to align with modern serverless deployment patterns, ensuring the application is performant and efficient in a production environment.

### Challenges you faced, and what you learned from the experience

1.  **AI API Integration & Model Selection:**
    *   **Challenge:** Persistent `404 Not Found` and "model not supported" errors from Hugging Face for various models, despite valid API tokens. The issue lay in the specific endpoint (`/models/` vs. `/v1/chat/completions`) and the exact model string (e.g., `:featherless-ai` suffix) required for private/managed deployments.
    *   **Learning:** The experience underscored the critical importance of thoroughly examining API documentation and examples, especially when dealing with nuanced LLM API infrastructures. It taught me the value of systematic debugging through API responses and understanding that "free tier" access often comes with very specific model/endpoint restrictions.

2.  **NextAuth.js v5 Google OAuth:**
    *   **Challenge:** Encountering an `id_token` error during Google sign-in.
    *   **Learning:** This illuminated the necessity of including specific OpenID Connect (OIDC) scopes (`openid`, `profile`, `email`) alongside API-specific scopes (`tasks`) for Google to return the required `id_token` that NextAuth.js expects.

3.  **Tailwind CSS v4 & UI Layering:**
    *   **Challenge:** Adapting to Tailwind v4's `@theme` directive and debugging visual artifacts (e.g., unintended persistency in canvas drawing) and background gradient issues.
    *   **Learning:** This reinforced core CSS concepts like `z-index` and rendering contexts, especially in conjunction with `<canvas>` elements. It highlighted the importance of completely clearing the canvas on each animation frame to prevent unintended visual trails and careful layering of transparent elements.

4.  **Prisma & Vercel Postgres Migration:**
    *   **Challenge:** Managing `DATABASE_URL` conflicts and `P1012` initialization errors during the transition from local SQLite to Vercel Postgres.
    *   **Learning:** A key takeaway was the nuances of environment variable management across local and production environments on platforms like Vercel. Learning to properly use `vercel env pull` and understanding that `prisma migrate dev` applies changes to the *configured* database (not just creates a schema) were invaluable lessons.

---

## Contributing

This is primarily a personal project for learning and productivity, but suggestions for improvements, feature requests, or bug reports are welcome. Feel free to open an issue or submit a pull request!

## License

This project is open source and available under the [MIT License](LICENSE).
