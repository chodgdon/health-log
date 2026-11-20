# Vet Health Log

A free, private daily symptom log for veterans. You can use it to keep records for VA claims. It works on iPhone and Android.

**Open the app:** https://chodgdon.github.io/health-log/

On iPhone, open the link in Safari, then tap **Share → Add to Home Screen**. On Android, open it in Chrome, then tap **⋮ → Install app**.

## Your privacy

- **Your entries never leave your phone** unless you send them yourself. There is no account, no server and no database. Nobody else can see your entries: not the Post, not the app's maker, not the VA.
- **No tracking.** There are no ads, no analytics and no cookies, and nothing counts or follows you.
- **Locked down.** A Content Security Policy in `index.html` (`connect-src 'self'`) blocks the app from contacting any other website.
- **You decide what leaves.** The only things that leave the phone are the reports (PDF/CSV), backup files and feedback that you choose to send, to wherever you choose.
- **Hosting:** GitHub serves the app's files. Like any website host, GitHub can see that a device downloaded those files. It never sees your entries.
- **Updates happen only when you tap "Update now".** Updates never change your entries.

All of the code is in this repository, so anyone can check it. The PDF and QR-code tools (`jspdf.umd.min.js`, `qrcode.min.js`) are included as files here. Nothing is loaded from other sites.

Not affiliated with or endorsed by the Department of Veterans Affairs. Not medical advice.

**Veterans Crisis Line:** call 988, then press 1. Or text 838255.
