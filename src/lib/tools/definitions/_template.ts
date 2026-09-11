/**
 * Template for a new SaveGram tool.
 *
 * This file is not registered and nothing imports it. Copy it, rename it after
 * the slug, fill it in, then follow the four steps in README.md.
 *
 * Two rules worth repeating here, because they are easy to miss:
 *
 * 1. Write the content for this platform specifically. Do not copy another
 *    tool's FAQ and swap the platform name. Pages that differ only by a noun
 *    are thin pages, and search engines treat them that way.
 * 2. Do not use the em dash character anywhere in user facing text. Use commas,
 *    periods, colons, semicolons, parentheses or plain hyphens instead.
 */
import type { ToolConfig } from "../types";

export const templateTool: ToolConfig = {
  // Stable forever once shipped. Both are used in URLs and internal lookups.
  id: "example-video-downloader",
  slug: "example-video-downloader",

  name: "Example Video Downloader",
  platform: "example",
  platformName: "Example",

  // One sentence for cards, two or three for the directory listing.
  shortDescription: "Download public Example videos.",
  description: "Paste a public Example video link and get the file back.",

  // Opening paragraphs on the tool page. Say what is specific about this
  // platform: its link shapes, its quirks, what it will not do.
  intro: [
    "Explain what this platform does with video links and why someone lands here.",
    "State the limits plainly, for example that only public posts can be read.",
  ],

  icon: "generic", // Add a matching icon to src/components/icons.tsx first.
  category: "social-media-downloaders",

  // Start at "hidden" while building. Move to "live" when it actually works.
  // "coming-soon" lists the tool with a badge but refuses input.
  status: "hidden",

  accentClass: "bg-slate-900 text-white",

  seoTitle: "Example Video Downloader: Save Public Videos | SaveGram",
  seoDescription: "Paste a public Example link and download the video as an MP4. No account needed.",
  keywords: ["example video downloader", "download example videos"],

  // Must match the id of a provider registered in downloader/service.ts.
  provider: "example",

  validation: {
    // Lowercase, no leading "www.". Subdomains match automatically.
    hostnames: ["example.com"],
    patterns: [
      {
        label: "Video",
        example: "https://www.example.com/video/123456",
        test: /^\/video\/\d+$/,
      },
    ],
    patternHint: "That is an Example link, but not a video. Open the video and copy its link.",
    placeholder: "https://www.example.com/video/...",
    // Only set this when the video id lives in the query string.
    // preserveQueryKeys: ["v"],
  },

  howTo: [
    { name: "Copy the link", text: "Where the share option is on this platform, and what it gives you." },
    { name: "Paste it in", text: "Anything the user does not need to clean up first." },
    { name: "Resolve the video", text: "What happens when they submit." },
    { name: "Save the file", text: "What they get, and what the choices mean." },
  ],

  features: [
    { title: "Something true about this tool", body: "Keep it concrete. No superlatives and no claims the tool cannot back up." },
  ],

  faqs: [
    { question: "A question people actually ask about this platform?", answer: "A direct answer, including when the answer is no." },
  ],

  troubleshooting: [
    { problem: "A failure that really happens on this platform.", fix: "What the user should do about it." },
  ],

  // Position in listings. Existing tools use 1, 2, 3.
  order: 99,
};
