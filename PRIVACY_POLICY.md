# Privacy Policy — Tab Mute Controller

**Last updated:** May 14, 2025

---

## Overview

Tab Mute Controller is a Chrome extension that helps you find and control tabs playing audio. This privacy policy explains what data the extension does and does not collect.

**Short version: we collect nothing. Zero.**

---

## Data Collection

Tab Mute Controller does **not** collect, store, transmit, or share any personal data, including:

- Browsing history
- Tab URLs or titles
- Website content
- Audio or media information
- User identifiers or cookies
- Crash reports or analytics

---

## How the Extension Works

All processing happens **locally in your browser**:

| Feature | How it works |
|---|---|
| Audio detection | Uses Chrome's built-in `tabs` API to read the audio state of open tabs |
| Mute / unmute | Uses Chrome's `tabs.update()` API — no data leaves your browser |
| Play / pause | Injects a script locally into the tab to control HTML5 `<video>` and `<audio>` elements |
| Auto-mute rules | Domain rules are saved to `chrome.storage.sync` — synced across your own Chrome profile only, never sent to any external server |

---

## Permissions Explained

| Permission | Purpose |
|---|---|
| `tabs` | Read tab audio state, titles, and URLs to display the tab list; mute and unmute tabs |
| `storage` | Save your auto-mute domain rules locally (and across your Chrome profile via sync) |
| `scripting` + `host_permissions` | Inject a play/pause script into tab pages — runs locally, reads no page content |

---

## Third-Party Services

Tab Mute Controller does **not** use any third-party services, analytics platforms, advertising networks, or external APIs.

---

## Data Storage

The only data stored by this extension is your **auto-mute domain rules** (a list of domain strings you enter yourself), stored via `chrome.storage.sync`. This data:

- Never leaves Chrome's own sync infrastructure (your Google account)
- Is never accessible to the extension developer
- Can be cleared at any time by removing all rules in the settings panel

---

## Children's Privacy

This extension does not collect data from anyone, including children under the age of 13.

---

## Changes to This Policy

If this policy changes in a future version, the updated date at the top of this document will reflect that. Changes will also be noted in the release changelog.

---

## Contact

If you have any questions about this privacy policy, please open an issue on GitHub:

**https://github.com/nyinyiz/Tab-Mute-Controller/issues**
