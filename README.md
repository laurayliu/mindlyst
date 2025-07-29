# Mindlyst

**Turn your unstructured thoughts into actionable Google Tasks**

This project was developed for DALI's API challenge, exploring the integration of AI with personal productivity tools. It's built with the [T3 Stack](https://create.t3.gg/), and integrates **Hugging Face with Google Tasks API**.

## Deployed Application

**[Try it here](https://mindlyst.vercel.app/)**

## Demo

https://github.com/user-attachments/assets/3086013f-0dd0-424c-85e0-71fb1638201f


## Features

*   **AI-powered task extraction:** Turns raw, unstructured text (like brain dumps or meeting notes) into a clear, actionable list of tasks using an llm from Hugging Face
*   **Google tasks integration:** Pushes extracted tasks directly to your Google Tasks account for the current day, which can also be viewed on Google Calendar
*   **Google authentication:** Secure sign-in via NextAuth.js
*   **Ambient UI:** Features a hand-picked dark-mode palette, glassmorphism styling, and animated orbs in the background for a calm and focused user experience
*   **Responsive design:** Works well across various devices

## Technologies Used

This project explores and utilizes the following technologies:

*   **[Next.js](https://nextjs.org)**: A React framework for full-stack web applications with App Router architecture
*   **[NextAuth.js](https://next-auth.js.org)**: Flexible authentication for Next.js, integrated with Google OAuth
*   **[Prisma + Vercel Postgres](https://prisma.io)**: Type-safe ORM for database access with a serverless PostgreSQL database on Vercel.
*   **[Tailwind CSS](https://tailwindcss.com)**: A utility-first CSS framework, utilizing its v4 `@theme` directive for custom design tokens
*   **[tRPC](https://trpc.io)**: End-to-end type-safe APIs
*   **[Hugging Face Inference Endpoints (Mistral-7B-Instruct-v0.2)](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)**: For large language model capabilities (task extraction)
*   **[Google Tasks API](https://developers.google.com/tasks)**: For programmatic interaction with user tasks
*   **[Motion](https://motion.dev/)**: An animation library for React
*   **[React Icons](https://react-icons.github.io/react-icons/)**: Iconic collection of icons

## Local Setup Instructions

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/mindlyst.git
    cd mindlyst
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Set up environment variables(`.env`) and [Google Cloud Console](https://console.cloud.google.com/)**

4.  **Prepare Prisma** 
 
5.  **Start development server**
    ```bash
    npm run dev
    ```
    
---

## Learning Journey

### What inspired you to create this project?

I wanted to build something that could actually help me overcome my own productivity challenges. I often find myself overwhelmed by an unorganized stream of thoughts, which can prevent me from starting tasks. The idea of offloading a brain dump and having AI distill it into actionable Google Tasks + Calendar that I regularly check (during the school year) felt like a step towards operationalizing thoughts into daily tasks. In addition, with the core functionality being relatively simple, I enjoyed dedicating time to UI customization by experimenting with Figma, hand-picking the color palette, and building an animated background with subtle interactions to create a more engaging frontend.

### What potential impact do you believe it could have on its intended users or the broader community?

Mindlyst could benefit individuals struggling with mental overload and task initiation. By simplifying the process of transforming raw thoughts into structured, actionable items, it could lower the barrier to productivity. For the broader community, this project illustrates how llms can be applied to solving practical, daily problems within personal productivity and integrated into everyday tools.

### What new technology did you learn?

*   **Hugging Face Inference Endpoints & APIs:** Gained experience interacting with specialized large language models (like Mistral-7B-Instruct-v0.2) via specific API endpoints and understanding their unique payload formats and authentication requirements
*   **Google Tasks API:** Learned to interact with a third-party API for task management, including OAuth authentication flows
*   **Prisma Postgres & Accelerate:** Explored migrating from a local SQLite database to a production-ready PostgreSQL database and implemented Prisma's Accelerate extension for optimized edge query performance
*   **Tailwind CSS v4:** Learned new approach to defining and managing a custom design system directly within CSS
*   **`motion`:** Figured out how to implement UI animations and avoid weird rendering bugs

### Why did you choose this new technology?

I picked the T3 Stack because I wanted more practice with full-stack development in a modern, type-safe environment. I was especially interested in how tools like tRPC, Prisma, and Next.js work together to streamline development. At first I tried using Gemini for the AI component but switched to Hugging Face due to accessibility and free-tier constraints, finding it to be a better fit for the task. I also chose Hugging Face and Google Tasks API for their direct relevance to the project's function. Vercel Postgres and Prisma Accelerate were selected for simplicity and to ensure the deployed application would be highly performant.

### Challenges you faced, and what you learned from the experience

1.  **AI API Integration & Model Selection:**
    *   **Challenge:** Persistent `404 Not Found` and "model not supported" errors for various models, despite valid API tokens. The issue lay in the specific endpoint and the exact model string (e.g., `:featherless-ai` suffix) required for private/managed deployments
    *   **Learning:** The experience underscored the importance of thoroughly examining API documentation and examples, the value of systematic debugging through API responses, and understanding that free tier access often comes with very specific model/endpoint restrictions

2.  **Google OAuth issues:**
    *   **Challenge:** Encountering `id_token` errors during Google sign-in
    *   **Learning:** This illuminated the necessity of including specific OpenID Connect (OIDC) scopes (`openid`, `profile`, `email`) alongside API-specific scopes (`tasks`) for Google to return the required `id_token` that NextAuth.js expects.

3.  **Tailwind CSS & UI Layering:**
    *   **Challenge:** Adapting to Tailwind v4 and debugging visual artifacts and background gradient issues
    *   **Learning:** This reinforced core CSS concepts like `z-index` and rendering contexts, especially in conjunction with `<canvas>` elements, highlighting the importance of completely clearing the canvas on each animation frame to prevent unintended visual trails and careful layering of transparent elements.

4.  **Prisma & Vercel Postgres Migration:**
    *   **Challenge:** Managing `DATABASE_URL` conflicts and `P1012` initialization errors during the transition from local SQLite to Postgres
    *   **Learning:** Learned the nuances of environment variable management across local and production environments on platforms like Vercel.

---

## Contributing

This is primarily a personal project for learning and productivity, but I'd love feedback. If you have any suggestions, feel free to open an issue or submit a pull request.

## License

This project is open source and available under the [MIT License](LICENSE).
