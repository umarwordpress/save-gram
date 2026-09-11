import type { ToolConfig } from "../types";

export const instagramReelDownloader: ToolConfig = {
  id: "instagram-reel-downloader",
  name: "Instagram Reel Downloader",
  slug: "instagram-reel-downloader",
  platform: "instagram",
  platformName: "Instagram",
  shortDescription: "Download public Instagram Reels quickly.",
  description:
    "Paste the link to a public Instagram Reel and get the video file back at the quality Instagram served it. Works with reel, post and IGTV style links.",
  intro: [
    "Instagram does not offer a save button for video files, so a Reel you want to keep offline has to be fetched from its public link. Paste that link below and SaveGram resolves the video behind it.",
    "This tool reads public Reels only. Private accounts, close friends stories and anything that requires a login stay out of reach, which is how Instagram intends it.",
  ],
  icon: "instagram",
  category: "social-media-downloaders",
  status: "live",
  accentClass: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
  seoTitle: "Instagram Reel Downloader: Save Public Reels as MP4 | SaveGram",
  seoDescription:
    "Paste a public Instagram Reel link and download the video as an MP4. No account, no app install. Works with reel, post and IGTV links.",
  keywords: [
    "instagram reel downloader",
    "download instagram reels",
    "save instagram video",
    "instagram video downloader",
    "reel to mp4",
  ],
  provider: "instagram",
  validation: {
    hostnames: ["instagram.com", "instagr.am", "ddinstagram.com"],
    patterns: [
      {
        label: "Reel",
        example: "https://www.instagram.com/reel/Cx1y2Z3aBcD/",
        test: /^\/reels?\/[A-Za-z0-9_-]+\/?$/,
      },
      {
        label: "Reel on a profile",
        example: "https://www.instagram.com/username/reel/Cx1y2Z3aBcD/",
        test: /^\/[A-Za-z0-9._]+\/reels?\/[A-Za-z0-9_-]+\/?$/,
      },
      {
        label: "Video post",
        example: "https://www.instagram.com/p/Cx1y2Z3aBcD/",
        test: /^\/p\/[A-Za-z0-9_-]+\/?$/,
      },
      {
        label: "IGTV",
        example: "https://www.instagram.com/tv/Cx1y2Z3aBcD/",
        test: /^\/tv\/[A-Za-z0-9_-]+\/?$/,
      },
      {
        label: "Share link",
        example: "https://www.instagram.com/share/reel/Cx1y2Z3aBcD/",
        test: /^\/share\/(reels?\/)?[A-Za-z0-9_-]+\/?$/,
      },
    ],
    patternHint:
      "That looks like an Instagram link, but not a Reel or video post. Open the Reel itself, then use Share and Copy link.",
    placeholder: "https://www.instagram.com/reel/...",
  },
  howTo: [
    {
      name: "Copy the Reel link",
      text: "Open the Reel in the Instagram app or on the web. Tap the share icon, then choose Copy link. On desktop you can also copy the address straight from the browser bar.",
    },
    {
      name: "Paste it into SaveGram",
      text: "Drop the link into the field above. The share sheet adds tracking parameters like igsh, and those are stripped automatically, so there is no need to clean the link first.",
    },
    {
      name: "Fetch the video",
      text: "Select Get video. SaveGram checks the link, resolves the media behind it and shows the Reel with its available file.",
    },
    {
      name: "Save the file",
      text: "Select Download. The file arrives as an MP4 named after the Reel, ready to play in any standard video player.",
    },
  ],
  features: [
    {
      title: "Handles every public Reel link shape",
      body: "Instagram hands out at least four link formats for the same video depending on where you tapped share. Reel, profile reel, post and share links all resolve to the same place here.",
    },
    {
      title: "Original file, not a re-encode",
      body: "SaveGram passes through the file Instagram serves. Nothing is transcoded, so you keep the resolution and bitrate of the source rather than a second generation copy.",
    },
    {
      title: "Tracking parameters removed",
      body: "Links copied from the app carry igsh and similar identifiers. Those are dropped during normalization and never stored.",
    },
    {
      title: "Nothing to install",
      body: "The tool runs in the browser on phones and desktops. There is no extension, no APK and no account step.",
    },
  ],
  faqs: [
    {
      question: "Can I download a Reel from a private account?",
      answer:
        "No. Private Reels require a logged in session that has been granted access, and SaveGram does not log in to Instagram or ask you for credentials. Only publicly viewable Reels can be resolved.",
    },
    {
      question: "Why does my link say it is not supported?",
      answer:
        "The most common cause is a profile link rather than a Reel link. A working link contains /reel/, /p/ or /tv/ followed by the post code. Open the Reel itself and copy the link from its share sheet.",
    },
    {
      question: "What quality will the download be?",
      answer:
        "Whatever Instagram serves for that Reel, which is usually 1080p for recent uploads and lower for older or heavily compressed ones. SaveGram cannot add detail that is not in the source file.",
    },
    {
      question: "Does the creator find out?",
      answer:
        "SaveGram does not notify anyone, and Instagram does not tell creators when a Reel is viewed through a link. That said, a Reel you save is still the creator's work, so credit them and ask before reposting.",
    },
    {
      question: "Can I download the audio only?",
      answer:
        "Not yet. The current version returns the video file. An audio extractor is on the list of tools being considered.",
    },
    {
      question: "Are the files I download stored on your servers?",
      answer:
        "No. The media is streamed through the request that serves it to you and is not written to disk or kept after the response finishes. See the privacy page for detail.",
    },
  ],
  troubleshooting: [
    {
      problem: "The Reel was deleted or the account went private after you copied the link.",
      fix: "Open the link in a private browsing window. If Instagram shows a login wall or a missing page there, the Reel is no longer public and cannot be resolved.",
    },
    {
      problem: "The download starts and then stops partway.",
      fix: "Instagram media links expire after a short window. Resolve the Reel again to get a fresh link, then download without a long pause in between.",
    },
    {
      problem: "The link came from a third party app and does not work.",
      fix: "Some apps wrap Instagram links in their own redirect. Open the link in a browser first, let it land on instagram.com, then copy the address from the bar.",
    },
  ],
  order: 1,
};
