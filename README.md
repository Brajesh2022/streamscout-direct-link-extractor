# StreamScout - Direct Link Extractor

A minimalist web application to extract direct download and streaming links from shared cloud storage URLs.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Brajesh2022/streamscout-direct-link-extractor)

## Description

StreamScout is a sleek, minimalist web application designed to simplify access to media files hosted on various cloud platforms. Users paste a shared URL into a clean interface, and the application's powerful Cloudflare Worker backend intelligently processes the link. It navigates through intermediate pages, extracts direct download and streaming links, and presents them in a beautifully organized and easy-to-use format. The application categorizes links, highlights trusted and recommended servers, and provides a seamless user experience, eliminating the need to navigate through ad-heavy or confusing websites. For streaming, it offers a sophisticated modal that provides tailored instructions and deep links for various operating systems (iOS, Android, Windows, macOS) and popular media players like VLC and MX Player, ensuring users can play their content with a single click.

## Key Features

- **One-Click Extraction**: Paste a URL and get direct media links instantly.
- **Powerful Backend**: Utilizes Cloudflare Workers for fast and reliable server-side scraping.
- **Smart Link Sorting**: Automatically prioritizes and highlights trusted and recommended servers.
- **Stream & Download**: Provides clear options for both streaming and direct downloads.
- **Device-Aware Streaming**: Offers tailored, one-click streaming instructions for iOS, Android, Windows, and macOS.
- **Player Integration**: Generates deep links to open streams directly in popular apps like VLC and MX Player.
- **Clean & Responsive UI**: A beautiful, minimalist interface that works flawlessly on any device.

## Technology Stack

- **Frontend**:
  - React
  - Vite
  - TypeScript
  - Tailwind CSS
  - shadcn/ui
  - Zustand
  - Framer Motion
- **Backend**:
  - Cloudflare Workers
  - Hono

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)
- A Cloudflare account

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd streamscout
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

3.  **Authenticate with Cloudflare:**
    This is required for local development and deployment.
    ```sh
    bunx wrangler login
    ```

## Development

To run the application locally, which starts the Vite development server and the Cloudflare Worker simultaneously, use the following command:

```sh
bun run dev
```

The application will be available at `http://localhost:3000` (or the port specified in your environment).

## Usage

1.  Open the application in your browser.
2.  Paste a supported cloud storage URL into the input field.
3.  Click the "Process" button.
4.  The application will display the extracted download and streaming links.
5.  Click a "Download" button to save the file.
6.  Click a "Stream" button to open a modal with device-specific instructions to play the media.

## Deployment

This project is configured for easy deployment to Cloudflare Pages and Workers.

1.  **Build the application:**
    This command bundles the frontend and prepares the worker for deployment.
    ```sh
    bun run build
    ```

2.  **Deploy to Cloudflare:**
    This command deploys your application to the Cloudflare network.
    ```sh
    bun run deploy
    ```

Alternatively, you can connect your GitHub repository to Cloudflare Pages for automatic deployments on every push.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Brajesh2022/streamscout-direct-link-extractor)

## Project Structure

-   `worker/`: Contains the Cloudflare Worker backend code (built with Hono).
-   `src/`: Contains the React frontend application source code.
-   `src/pages/`: Main pages of the application.
-   `src/components/`: Reusable React components.
-   `shared/`: TypeScript types shared between the frontend and the worker.

## Known Limitations

- The scraping logic is tightly coupled to the HTML structure of the target websites and may break if they are updated.
- Target websites may implement anti-bot measures that could block the Cloudflare Worker.
- Parsing complex or malformed HTML can be fragile and may lead to errors.