// Perf-panel tests load Stage 3 lighting, which reads these at import time.
globalThis.location = globalThis.location || { search: '' };
globalThis.window = globalThis.window || { devicePixelRatio: 1 };
globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
