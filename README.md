# mindlyst

**A smart assistant to transform your brain-dumps into actionable Google Tasks.**

This project is built as part of the API challenge, showcasing an integration of AI and productivity tools. It's a [T3 Stack](https://create.t3.gg/) application, bootstrapped with `create-t3-app` for a robust, type-safe, and performant developer experience.

## Deployed Application

Experience Mindlyst live:

**[Try Mindlyst Here]([https://mindlyst.vercel.app/](https://mindlyst.vercel.app/))**

## Demo



https://github.com/user-attachments/assets/6a7a879d-fd38-446d-ad77-5545cffcf317



## Features

*   **AI-Powered Task Extraction:** Transform raw, unstructured text (like a messy brain-dump or meeting notes) into a clean, actionable list of tasks using a powerful Hugging Face large language model.
*   **Google Tasks Integration:** Seamlessly push extracted tasks directly to your Google Tasks account for the current day, making them instantly actionable in your personal workflow.
*   **Google Authentication:** Secure and easy sign-in using your Google account via NextAuth.js.
*   **Ambient UI:** A unique, aesthetically pleasing "glassmorphism" design with subtle, animated floating orbs in the background, crafted for a calm and focused user experience.
*   **Responsive Design:** Optimized for a consistent experience across various devices and screen sizes.
*   **Serverless Performance:** Deployed on Vercel with Prisma Accelerate and Vercel Postgres for lightning-fast, cold-start-free database queries.

## Technologies Used

This project leverages the following cutting-edge technologies:

*   **[Next.js](https://nextjs.org)**: A React framework for building full-stack web applications with App Router for modern architecture.
*   **[NextAuth.js](https://next-auth.js.org)**: Flexible authentication for Next.js, integrating with Google OAuth.
*   **[Prisma](https://prisma.io)**: A next-generation ORM for Node.js and TypeScript, simplifying database interactions.
*   **[Tailwind CSS](https://tailwindcss.com)**: A utility-first CSS framework for rapidly building custom designs, utilizing its new v4 `@theme` directive for design tokens.
*   **[tRPC](https://trpc.io)**: End-to-end type-safe APIs, enabling seamless communication between frontend and backend.
*   **[Hugging Face Inference Endpoints (Mistral-7B-Instruct-v0.2)](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)**: For large language model capabilities (task extraction).
*   **[Google Tasks API](https://developers.google.com/tasks)**: To interact with users' Google Tasks.
*   **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)**: A serverless PostgreSQL database integrated directly with Vercel deployments.
*   **[Prisma Accelerate](https://www.prisma.io/data-platform/accelerate)**: A Prisma extension for faster, cold-start-free database queries at the edge.
*   **[Motion (formerly Framer Motion)](https://motion.dev/)**: A powerful, production-ready animation library for React.
*   **[React Icons](https://react-icons.github.io/react-icons/)**: A collection of popular icons for React projects.

## Local Setup Instructions

To get Mindlyst running on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/mindlyst.git
    cd mindlyst
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or pnpm install
    # or yarn install
    ```
3.  **Set up Environment Variables:**
    *   Create a `.env` file in the root of your project: `touch .env`
    *   Copy the contents from `.env.example` into your new `.env` file.
    *   **Generate an `AUTH_SECRET`:**
        ```bash
        npx auth secret
        ```
        Copy the output and paste it as the value for `AUTH_SECRET` in your `.env`.
    *   **Google OAuth Credentials:**
        *   Follow the detailed steps in the [Google Cloud Console Setup](#google-cloud-console-setup) section below.
        *   Obtain your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and add them to your `.env`.
    *   **Hugging Face Access Token:**
        *   Go to [Hugging Face settings](https://huggingface.co/settings/tokens).
        *   Generate a new User Access Token with `read` role. Add it as `HF_ACCESS_TOKEN` in your `.env`.
        *   Set `HF_TASK_EXTRACTION_MODEL="mistralai/Mistral-7B-Instruct-v0.2:featherless-ai"` in your `.env`.
    *   **Database URL (Vercel Postgres for local testing):**
        *   **Important:** Even for local testing, we'll use a Vercel Postgres instance to simulate the production environment and test cold start elimination.
        *   Go to your Vercel project dashboard, navigate to "Storage", and connect/create a "Vercel Postgres" database.
        *   Once created, use `vercel link` in your terminal, then `vercel env pull .env` to automatically populate your `DATABASE_URL` with the Postgres connection string.
        *   *(Alternatively, if `vercel env pull` doesn't work or you prefer not to use Vercel Postgres locally, you can temporarily set `DATABASE_URL="file:./db.sqlite"` and remove Prisma Accelerate setup from `src/server/db.ts` for strictly local SQLite testing, but this won't fully mimic the production environment).*
4.  **Update Prisma Schema & Generate Client:**
    *   Ensure `prisma/schema.prisma` `datasource db` provider is `postgresql`.
    *   Run: `npx prisma generate`
5.  **Run Database Migrations:**
    This will apply the necessary tables for NextAuth.js to your connected Postgres database.
    ```bash
    npx prisma migrate dev --name init_database_schema
    ```
6.  **Start the development server:**
    ```bash
    npm run dev
    # or pnpm dev
    # or yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### **Google Cloud Console Setup (for OAuth)**

For Google sign-in and Google Tasks API integration to work:

1.  **Go to [Google Cloud Console](https://console.cloud.google.com/).**
2.  **Create or Select a Project.**
3.  **Enable Google Tasks API:** In "APIs & Services" > "Library", search for "Google Tasks API" and enable it.
4.  **Configure OAuth Consent Screen:**
    *   Go to "APIs & Services" > "OAuth consent screen."
    *   **User Type:** "External".
    *   **App Information:** Set "App name" (e.g., Mindlyst), your "User support email", and "Developer contact information".
    *   **Scopes:** Click "Add or Remove Scopes."
        *   Add the following necessary scopes:
            *   `.../auth/tasks` (for Google Tasks API access)
            *   `openid`
            *   `profile`
            *   `email`
        *   Click "Add to table" then "Update."
    *   **Test Users:** Add your Google account(s) as "Test users" (vital for development, as your app won't be verified yet).
5.  **Create Credentials (OAuth Client ID):**
    *   Go to "APIs & Services" > "Credentials."
    *   Click "Create Credentials" > "OAuth client ID."
    *   **Application type:** "Web application."
    *   **Name:** (e.g., Mindlyst Web Client).
    *   **Authorized JavaScript origins:**
        *   `http://localhost:3000` (for local development)
        *   `https://YOUR_VERCEL_APP_URL.vercel.app` (replace with your Vercel domain after deployment)
    *   **Authorized redirect URIs:**
        *   `http://localhost:3000/api/auth/callback/google`
        *   `https://YOUR_VERCEL_APP_URL.vercel.app/api/auth/callback/google`
    *   Click "Create."
    *   **Copy your `Client ID` and `Client Secret`.** These are your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for your `.env` file.

---

## **Learning Journey**

### What inspired you to create this project?

Something I struggle with is productivity. I always think about all the things I need to do in my head, and end up never starting from the sheer load of it. Being able to extract tasks from a brain dump and add them to Google Tasks (which I frequently check) would absolutely help me operationalize them into daily tasks. Additionally, since the core function of the website is simple, I wanted to spend more time customizing the UI to how I wanted it. I experimented with hand-selecting each color, playing around in Figma, and adding an animated background and subtle interactions to make the frontend enjoyable to use.

### What potential impact do you believe it could have on its intended users or the broader community?

Mindlyst could significantly help individuals who experience "mental overload" from an unorganized stream of thoughts. By providing an intuitive way to offload and structure these thoughts into actionable tasks, it lowers the barrier to starting and completing work. For the broader community, it demonstrates the practical application of AI in personal productivity, showcasing how large language models can go beyond simple chatbots to perform structured data extraction for real-world utility. It's a small step towards making AI a more integrated and helpful tool in daily life.

### What new technology did you learn?

This project provided a deep dive into several cutting-edge technologies:

*   **Hugging Face Inference Endpoints and API Integration:** Understanding how to select, prompt, and interact with specific large language models (like Mistral-7B-Instruct-v0.2) hosted on Hugging Face's platform, including navigating different API endpoints (`/models/` vs. `/v1/chat/completions`) and handling their specific input/output formats.
*   **Google Tasks API:** Learning to authenticate users via OAuth and then programmatically create and manage tasks on their behalf.
*   **Vercel Postgres & Prisma Accelerate:** Migrating from a local SQLite database to a serverless, cold-start-free PostgreSQL database on Vercel, and integrating Prisma's Accelerate extension for optimized edge database queries.
*   **Tailwind CSS v4 `@theme` directive:** Mastering the new way to define and manage a custom design system entirely within CSS, moving beyond the traditional `tailwind.config.js`.
*   **`motion` (formerly Framer Motion):** Implementing intricate UI animations for a polished and engaging user experience.

### Why did you choose this new technology?

I chose the T3 Stack ([Next.js](https://nextjs.org), [NextAuth.js](https://next-auth.js.org), [Prisma](https://prisma.io), [Tailwind CSS](https://tailwindcss.com), [tRPC](https://trpc.io)) because I wanted more hands-on practice with its type-safe, full-stack development paradigm. It provides a robust foundation for building modern web applications. The specific APIs (Hugging Face for AI, Google Tasks for productivity) were chosen for their direct relevance to the project's core function: transforming unstructured thoughts into actionable items. Vercel Postgres and Prisma Accelerate were chosen to ensure the deployed application would be highly performant and truly leverage the benefits of serverless architecture.

### Challenges you faced, and what you learned from the experience

1.  **AI API Integration (Hugging Face & Model Selection):**
    *   **Challenge:** This was by far the biggest hurdle. Initially struggling with various generic LLM APIs (like a previous attempt with Gemini) and then facing persistent `404 Not Found` errors with different Hugging Face models (`flan-t5`, `gpt2`, `t5-small`) even when my API token was valid. Eventually discovered that `mistralai/Mistral-7B-Instruct-v0.2` on the `router.huggingface.co/v1/chat/completions` endpoint was the correct path, but it required specific authentication (email consent).
    *   **Learning:** The crucial lesson here was the **nuance of LLM API endpoints and payload formats**. Not all models on Hugging Face are available via the same API, and some require specific instruction formats (`[INST]` tags for Mistral) or entirely different API endpoints (like chat completions). Persistence in debugging HTTP responses and carefully reading API documentation (or finding working examples) was key. It also highlighted that "free tier" doesn't always mean universally accessible for all models.

2.  **NextAuth.js v5 Google OAuth:**
    *   **Challenge:** Encountering the `id_token` error during Google sign-in.
    *   **Learning:** This taught me the importance of **OpenID Connect (OIDC) scopes** (`openid`, `profile`, `email`) in addition to specific API scopes (`tasks`). NextAuth.js v5, when using Google, relies on OIDC for basic user identity, and these scopes are essential for Google to return the `id_token` needed for the authentication flow.

3.  **Tailwind CSS v4 `@theme` & UI Layering:**
    *   **Challenge:** Adapting to Tailwind v4's new `@theme` directive (moving from `tailwind.config.js`) and debugging visual issues like the "slime trail" on the canvas animation and the background gradient appearing only briefly.
    *   **Learning:** This emphasized the importance of **CSS rendering contexts, `z-index` layering, and proper canvas clearing**. The "slime trail" was a classic canvas animation oversight (not fully clearing the frame). The background issue was due to z-indexing and opaque layers obscuring the base gradient. It reinforced the need for precise control over CSS properties when dealing with complex visual effects.

4.  **Prisma & Vercel Postgres Migration:**
    *   **Challenge:** Transitioning from SQLite to Vercel Postgres and handling `DATABASE_URL` conflicts and `P1012` initialization errors during Vercel deployments.
    *   **Learning:** The biggest takeaway was how **environment variables are managed across local development and deployment environments (especially on Vercel)**. The `vercel env pull` command and correctly deleting conflicting variables on the Vercel dashboard were critical. It also solidified the understanding that `prisma init` is for *new* projects, while `prisma migrate dev` is for schema changes/migrations on *existing* databases.

---

## Contributing

This is primarily a personal project for learning and productivity. However, suggestions for improvements, feature requests, or bug reports are welcome. Feel free to open an issue or submit a pull request!

## License

This project is open source and available under the [MIT License](LICENSE).
