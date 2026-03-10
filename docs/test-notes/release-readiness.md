# Release Readiness

Purpose:
- validate the repository is still in a portable state for future Linux and Android packaging work
- protect local asset assumptions that would otherwise break binary builds late in the pipeline

Run:

```bash
node scripts/release-readiness.mjs
```

What it checks:
- local bundled fonts exist and remain preferred over remote CDNs
- Linux and Android packaging reports are still present
- release-oriented package scripts remain exposed
