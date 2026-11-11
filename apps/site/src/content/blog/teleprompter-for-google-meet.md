---
title: "Teleprompter for Google Meet: a setup that stays hidden"
description: How to read a script on Google Meet in Chrome or Safari without participants seeing it, whether you share a tab, a window or your whole screen.
keywords: [teleprompter google meet, screen share, read naturally on camera]
date: 2026-11-03
image: /images/blog/teleprompter-for-google-meet.jpg
imageAlt: Google Meet call with a hidden prompter window positioned under the camera
---

> Meet runs in a browser, which changes nothing about the capture: a Mac prompter window excluded from screen recording is invisible whether you share a tab, a window or the screen. Place it under the camera, keep the font big, and test with a second account before it matters.

## Tab, window or screen?

Google Meet offers three kinds of sharing, and people often pick one specifically to hide their notes. With a capture-excluded prompter the choice is yours to make on other grounds.

Sharing a **tab** sends only that browser tab, with tab audio if you want it. It is the best choice for slides in Google Slides or a web demo. Sharing a **window** sends one application window, useful for Keynote or a native app. Sharing the **entire screen** sends everything, which is what you want when you will be switching between apps.

In every case the browser asks macOS for the pixels, and macOS leaves out windows that opted out of capture. gotoprompter's window is one of those, so it is absent from all three share types and from Meet's own recordings.

## Setup

The flow takes under a minute once the script exists.

1. Write the script in whatever you already use: Google Docs, Notes, a Slack draft. Short lines, spoken phrasing, cues in square brackets.
2. Select all, copy, then click the gotoprompter icon in the menu bar and choose Start from clipboard.
3. Move the window to the top centre of the screen, directly below your camera, and narrow it to roughly a third of the display width.
4. Open Meet in Chrome, Safari, Edge or whichever browser you use. No extension is required; the prompter is a separate Mac app and never talks to Meet.
5. Share whatever you need to share. Glance at the window as you speak; the highlight follows your words.

Meet's "present" preview in the bottom corner shows exactly what participants receive. The prompter will not be in it.

## Eye line

The hardest part of using any teleprompter on a video call is not the software; it is where your eyes point. Participants see a face whose gaze lands a little below the lens, which reads as looking at the screen rather than at them.

Three habits close the gap. Put the prompter as close to the camera as the screen allows. Use a font large enough to read without moving your eyes across the line. And let voice scrolling do its job: when the highlight follows you, your eyes stay in one place and the script comes to them. The moment you have to scroll with a key or a mouse, your gaze drops to find the controls.

If you present a lot, a small external webcam clipped at the top of the monitor, with the prompter window directly below it, beats a laptop camera at the bottom of a tall display.

## Troubleshooting

**The window is visible in the share preview.** The capture-exclusion setting is off. In gotoprompter it lives under Settings, Overlay, "Hidden from screen sharing and recordings". Turn it on, re-share, and check the preview again.

**The script is not following me.** Confirm the microphone and speech-recognition permissions in System Settings, Privacy and Security, and that the script language matches what you are saying. Click any word in the window to resync the highlight to where you are.

**Meet cannot find my camera or mic after I started the prompter.** The prompter only listens to the microphone; it does not take exclusive control of it, so both apps can use the same input. If the browser lost the device, reload the Meet tab.

**The prompter window disappeared on my external display.** Some capture-card and virtual-display setups do not draw capture-excluded windows. Move the window back to the built-in display, or turn the exclusion off while using that display and remember that the window will then be visible in shares.

## Frequently asked questions

**Do I need a Chrome extension for Google Meet?** No. gotoprompter is a native Mac app. It works with Meet in any browser because the hiding happens in macOS, not in the browser.

**Will Meet's recording include the prompter?** No. Meet records the shared content and participant tiles through the same capture path, and the window is excluded from it.

**Can I use the free web app with Meet instead?** Yes, but keep it in a browser window you are not sharing. The web app cannot hide itself from capture; that is what the Mac app adds.

**What if I share my screen and need the prompter on that same screen?** That is the normal case. The window stays on top of your screen for you and is left out of the pixels sent to Meet.

---

**Related:** [[how-to-use-a-teleprompter-on-zoom]] · [[how-to-read-a-script-without-looking-like-youre-reading]] · [[best-teleprompter-app-for-mac]]
