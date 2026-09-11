import type { ToolConfig } from "../types";

export const tiktokVideoDownloader: ToolConfig = {
  id: "tiktok-video-downloader",
  name: "TikTok Video Downloader",
  slug: "tiktok-video-downloader",
  platform: "tiktok",
  platformName: "TikTok",
  shortDescription: "Download publicly accessible TikTok videos.",
  description:
    "Paste a TikTok link, including the short vm.tiktok.com and vt.tiktok.com forms, and get the video file. Where the source allows it, a version without the on screen watermark is offered.",
  intro: [
    "TikTok has its own save option, but it is not always available. Creators can switch downloads off per video, and the saved file carries a watermark with the username stamped across it. Pasting the link here resolves the video from its public page instead.",
    "Short links from the share sheet work as they are. SaveGram follows the redirect, reads the video id it lands on and resolves from there.",
  ],
  icon: "tiktok",
  category: "social-media-downloaders",
  status: "live",
  accentClass: "bg-[#010101] text-white",
  seoTitle: "TikTok Video Downloader: Save TikToks as MP4 | SaveGram",
  seoDescription:
    "Paste a TikTok link and download the video as an MP4. Supports vm.tiktok.com short links, and offers a version without the watermark where available.",
  keywords: [
    "tiktok video downloader",
    "download tiktok video",
    "tiktok downloader no watermark",
    "save tiktok video",
    "tiktok to mp4",
  ],
  provider: "tiktok",
  validation: {
    hostnames: ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
    patterns: [
      {
        label: "Standard video",
        example: "https://www.tiktok.com/@username/video/7301234567890123456",
        test: /^\/@[A-Za-z0-9._]+\/video\/\d{6,}\/?$/,
      },
      {
        label: "Photo post",
        example: "https://www.tiktok.com/@username/photo/7301234567890123456",
        test: /^\/@[A-Za-z0-9._]+\/photo\/\d{6,}\/?$/,
      },
      {
        label: "Short link",
        example: "https://vm.tiktok.com/ZMabcdefg/",
        test: /^\/[A-Za-z0-9]{5,}\/?$/,
      },
      {
        label: "Share redirect",
        example: "https://www.tiktok.com/t/ZMabcdefg/",
        test: /^\/t\/[A-Za-z0-9]{5,}\/?$/,
      },
      {
        label: "Embed or web player link",
        example: "https://www.tiktok.com/embed/v2/7301234567890123456",
        test: /^\/embed(\/v2)?\/\d{6,}\/?$/,
      },
    ],
    patternHint:
      "That host is TikTok, but the path is not a video. Open the video, tap Share, then Copy link.",
    placeholder: "https://www.tiktok.com/@user/video/...",
  },
  howTo: [
    {
      name: "Copy the link from TikTok",
      text: "Tap Share on the video, then Copy link. The app usually gives you a short vm.tiktok.com address, which works here without any extra steps.",
    },
    {
      name: "Paste the link above",
      text: "Short links are followed to the real video URL automatically. On desktop you can paste the full @username/video address instead.",
    },
    {
      name: "Resolve the video",
      text: "Select Get video. SaveGram reads the public video page and lists the files it can return, including a version without the watermark when the source provides one.",
    },
    {
      name: "Pick a file and save it",
      text: "Choose the version you want and select Download. Watermark free files are smaller and cleaner; the watermarked file is the one TikTok itself would hand you.",
    },
  ],
  features: [
    {
      title: "Short links resolve on their own",
      body: "vm.tiktok.com, vt.tiktok.com and /t/ links are followed server side, so you can paste whatever the share sheet gave you.",
    },
    {
      title: "Watermark free version when available",
      body: "TikTok serves some videos with a clean master file alongside the stamped one. Where that exists, both are listed so you can choose.",
    },
    {
      title: "Photo posts included",
      body: "Slideshow style photo posts are recognized as well, and the individual images are returned rather than a video wrapper.",
    },
    {
      title: "Works when the creator disabled saving",
      body: "The in app save button can be switched off per video. Public videos remain publicly viewable, and that is what this tool reads.",
    },
  ],
  faqs: [
    {
      question: "Do short vm.tiktok.com links work?",
      answer:
        "Yes. Paste the short link as it is. SaveGram follows the redirect to the full video URL before resolving, so you do not need to open it first.",
    },
    {
      question: "Why is there no watermark free option for my video?",
      answer:
        "That version is not published for every upload. When TikTok only exposes the stamped file, that is the only one available, and no tool can recover a clean master that was never served.",
    },
    {
      question: "Can I download a video from a private account?",
      answer:
        "No. Private accounts and friends only videos need an approved logged in session. SaveGram reads public pages only.",
    },
    {
      question: "Does this work with photo slideshows?",
      answer:
        "Yes. Photo posts resolve to their images, which you can save individually. The background audio is not bundled with them.",
    },
    {
      question: "Will the file have the original quality?",
      answer:
        "It matches what TikTok serves for that post. TikTok compresses uploads on its own side, so the file you get here is the platform copy rather than the creator's master.",
    },
    {
      question: "Is it legal to download a TikTok video?",
      answer:
        "Saving a public video for personal viewing is generally accepted. Reposting it, monetizing it or editing it into your own content without permission is not. The rights stay with the creator either way.",
    },
  ],
  troubleshooting: [
    {
      problem: "The short link opens the TikTok app instead of resolving.",
      fix: "That happens when you tap the link rather than paste it. Copy the text of the link and paste it into the field instead of opening it.",
    },
    {
      problem: "Region locked video returns nothing.",
      fix: "Some videos are restricted to certain countries and are not publicly readable elsewhere. If the link shows an unavailable message in a browser, it cannot be resolved here.",
    },
    {
      problem: "The video resolves but the file plays without sound.",
      fix: "A few TikTok uploads separate the audio track. Try the other listed file if one is offered, since the alternate version usually carries the muxed audio.",
    },
  ],
  order: 2,
};
