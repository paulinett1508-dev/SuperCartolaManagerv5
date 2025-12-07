# Super Cartola Manager - Sistema de Gerenciamento de Ligas

### Overview
Super Cartola Manager is a comprehensive system designed for managing internal leagues of Cartola FC, a Brazilian fantasy football game. It integrates data from public Cartola FC APIs, processes participant information, rounds, rankings, and disputes, storing all data in MongoDB. The system provides a robust platform for league administration and offers a mobile-first experience for participants to view their data. The project aims to provide a complete and intuitive solution for Cartola FC league management, enhancing the user experience for both administrators and participants.

### User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `backups/`.
Do not make changes to the two active leagues in production.
Ensure that the admin mode remains 100% intact.
Do not alter the existing database structure.
Do not lose any data from the two active leagues.
Test each change in isolation.
Maintain compatibility with existing APIs.
All future enhancements for the participant mode should prioritize a mobile-first approach.
Implement a robust caching mechanism for improved performance.
Ensure all numerical and monetary values are formatted according to Brazilian Portuguese (pt-BR) standards.
Utilize professional modal overlays instead of simple alert boxes for user interactions.

### System Architecture

**Core Design Principles:**
The system operates in two distinct modes: Admin and Participant, each tailored for specific user needs and device types. A clear separation of concerns is maintained between the backend (Node.js/Express) and the frontend (HTML/CSS/Vanilla JS) with a modular structure. Performance is optimized through caching and lazy loading.

**UI/UX Decisions:**
-   **Admin Mode:** Designed for desktop/large screens, focusing on comprehensive data management and administrative tasks.
-   **Participant Mode:** Developed with a mobile-first approach, featuring responsive CSS, touch-optimized cards, and dynamic grid layouts for an intuitive mobile experience. UI elements like navigation buttons, data cards, and modals are specifically designed for small screens. Visual cues like podium highlights, MITO/MICO badges, and gradient zones are used to enhance data readability and engagement.

**Technical Implementations:**
-   **Backend:** Node.js with Express (ES Modules) for API handling and business logic.
-   **Database:** MongoDB + Mongoose for data persistence, with optimized indices and connection pooling.
-   **Frontend:** HTML5, CSS3, and JavaScript Vanilla (modular approach) for a lightweight and performant client-side.
-   **Authentication:** Replit Auth (OpenID Connect) for admin login, Express Session for participant login, with middleware protecting routes and client-side session caching.
-   **Caching:** NodeCache for server-side in-memory caching and client-side caching (IndexedDB + Memory Cache with localStorage fallback) for performance and offline capabilities.
-   **Modularity:** Code is organized into functional modules, with dynamic imports for lazy loading in the participant mode to reduce initial payload.

**Feature Specifications:**

**Admin Mode (Desktop - 100% Functional):**
-   League Management (CRUD)
-   Points-based classification
-   Knockout stages (Mata-Mata)
-   Top Scorer and Champion tracking
-   Golden Glove ranking
-   Financial Flow management
-   General Ranking
-   Top 10 players per round
-   Player of the Month
-   Round management
-   Report Exportation
-   Integration with Cartola FC APIs

**Participant Mode (Mobile-First - 100% Functional):**
-   Financial Statement (mobile-optimized)
-   Ranking (responsive, compact tables)
-   Rounds (mobile-first cards)
-   Top 10 (responsive grid, click-to-view prizes)
-   Player of the Month (optimized cards, detailed league overview)
-   Points-based classification (toggleable views, decimal formatting)
-   Knockout stages (mobile-optimized bracket, edition selector)
-   Top Scorer (responsive ranking)
-   Golden Glove (mobile ranking)

**System Design Choices:**
-   **Directory Structure:** Clearly separated `config`, `controllers`, `middleware`, `models`, `routes`, and `public` folders. The `public` directory further differentiates between `admin` and `participante` assets.
-   **Performance:** NodeCache, connection pooling, optimized MongoDB indices, and dynamic module imports contribute to overall system efficiency.
-   **Scalability:** Designed for easy addition of new features and participant leagues, with a clear distinction between admin and participant functionalities.

### External Dependencies

-   **Database:** MongoDB (via Mongoose ORM)
-   **APIs:** Public Cartola FC APIs (for club data, team info, round details, rankings, and statistics)
-   **Caching Libraries:** NodeCache
-   **Session Management:** Express Session