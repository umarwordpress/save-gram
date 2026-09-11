import type { ToolConfig } from "../types";

export const facebookReelDownloader: ToolConfig = {
  id: "facebook-reel-downloader",
  name: "Facebook Reel Downloader",
  slug: "facebook-reel-downloader",
  platform: "facebook",
  platformName: "Facebook",
  shortDescription: "Download public Facebook Reels.",
  description:
    "Paste a public Facebook Reel or video link and get the file back. fb.watch short links, watch pages and page video posts are all recognized.",
  intro: [
    "Facebook spreads video across several link shapes: Reels, the Watch tab, page video posts and fb.watch short links. All of them point at the same kind of media, and this tool accepts any of them.",
    "Only content that is set to Public can be resolved. If a Reel sits behind a friends only or group audience setting, it needs an authorized session, and SaveGram does not have one.",
  ],
  icon: "facebook",
  category: "social-media-downloaders",
  status: "live",
  accentClass: "bg-[#1877f2] text-white",
  seoTitle: "Facebook Reel Downloader: Save Public Reels and Videos | SaveGram",
  seoDescription:
    "Paste a public Facebook Reel or video link and download it as an MP4. Supports fb.watch links, Watch pages and page video posts.",
  keywords: [
    "facebook reel downloader",
    "download facebook reels",
    "facebook video downloader",
    "fb watch downloader",
    "save facebook video",
  ],
  provider: "facebook",
  validation: {
    hostnames: ["facebook.com", "fb.watch", "fb.com"],
    patterns: [
      {
        label: "Reel",
        example: "https://www.facebook.com/reel/1234567890123456",
        test: /^\/reels?\/\d{6,}\/?$/,
      },
      {
        label: "Page video post",
        example: "https://www.facebook.com/PageName/videos/1234567890123456",
        test: /^\/[A-Za-z0-9.]+\/videos\/(?:[^/]+\/)?\d{6,}\/?$/,
      },
      {
        label: "Watch page",
        example: "https://www.facebook.com/watch/?v=1234567890123456",
        test: /^\/watch\/?$/,
      },
      {
        label: "Share link",
        example: "https://www.facebook.com/share/r/18bpWhHLja/",
        test: /^\/share\/(?:r|v|p|reel|video)\/[A-Za-z0-9_-]+\/?$/,
      },
      {
        label: "Short link",
        example: "https://fb.watch/aBcDeFgHiJ/",
        test: /^\/[A-Za-z0-9_-]{5,}\/?$/,
        // Without this the pattern would also match facebook.com/username.
        hosts: ["fb.watch", "fb.com"],
      },
      {
        label: "Permalink video",
        example: "https://www.facebook.com/video.php?v=1234567890123456",
        test: /^\/video\.php\/?$/,
      },
    ],
    patternHint:
      "That is a Facebook link, but not a Reel or video. Open the video, use the three dot menu and choose Copy link.",
    placeholder: "https://www.facebook.com/reel/...",
    preserveQueryKeys: ["v"],
  },
  howTo: [
    {
      name: "Open the Reel and copy its link",
      text: "In the app, tap the three dot menu on the Reel and choose Copy link. On desktop, right click the video and choose Show video URL, or copy the address from the browser bar.",
    },
    {
      name: "Paste the link into the field",
      text: "fb.watch short links work directly. Watch page links keep their v parameter, which is the part that identifies the video, so paste the whole address.",
    },
    {
      name: "Resolve it",
      text: "Select Get video. SaveGram checks that the link points at a public video and reads the media behind it.",
    },
    {
      name: "Download the quality you want",
      text: "Facebook often serves more than one rendition. HD is the larger file and SD is the lighter one, useful when you are on mobile data.",
    },
  ],
  features: [
    {
      title: "Every Facebook video link shape",
      body: "Reels, Watch pages, page video posts, video.php permalinks and fb.watch short links are handled by the same flow.",
    },
    {
      title: "HD and SD when both exist",
      body: "Facebook commonly publishes two renditions of a video. Both are listed with their file size so you can pick deliberately.",
    },
    {
      title: "Short links expanded server side",
      body: "fb.watch addresses redirect to the real video page. That hop happens on the server, so a short link is all you need to paste.",
    },
    {
      title: "Clear about what it cannot do",
      body: "Private, friends only and group videos are refused with a plain explanation rather than a generic failure.",
    },
  ],
  faqs: [
    {
      question: "Which Facebook videos can be downloaded?",
      answer:
        "Videos whose audience is set to Public. That covers most Reels from pages and creators. A post limited to friends, a private group or a specific list cannot be read without being logged in as someone with access.",
    },
    {
      question: "Do fb.watch links work?",
      answer:
        "Yes. The short link is expanded on the server to the underlying video page before anything else happens, so you can paste it as copied.",
    },
    {
      question: "What is the difference between the HD and SD file?",
      answer:
        "They are the same video at two encodes. HD is higher resolution and a larger download. SD is smaller and quicker, which helps on a slow connection or a limited data plan.",
    },
    {
      question: "Why does my link show as unsupported?",
      answer:
        "Profile links, photo posts and group links share the facebook.com host but are not videos. Make sure the link contains /reel/, /videos/ or a v parameter.",
    },
    {
      question: "Can I download a Facebook Story?",
      answer:
        "No. Stories expire and are tied to the viewer's session rather than a public page, so they are outside what this tool reads.",
    },
    {
      question: "Does SaveGram keep a record of the links I paste?",
      answer:
        "Links are used to serve your request and are not tied to an account or profile. The privacy page describes exactly what is and is not retained.",
    },
  ],
  troubleshooting: [
    {
      problem: "The link works in your browser but not here.",
      fix: "You are probably logged in, which makes non public videos look public to you. Open the link in a private window while signed out. What you see there is what SaveGram can see.",
    },
    {
      problem: "A Watch link fails to resolve.",
      fix: "Watch links only identify a video through their v parameter. If you copied a trimmed address without it, go back and copy the full URL.",
    },
    {
      problem: "The video is from a group or event.",
      fix: "Group and event videos are usually restricted to members even when the group itself is listed publicly. Those cannot be resolved.",
    },
  ],
  order: 3,
};
